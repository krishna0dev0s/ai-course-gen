import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/database";
import { chapterContentSlides, coursesTable } from "@/config/schema";
import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";

function isRecoverableDbReadError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const code = (error as { code?: string } | null)?.code;
    return (
        code === "42P01" ||
        code === "3F000" ||
        message.includes("relation") && message.includes("does not exist") ||
        message.includes("schema") && message.includes("does not exist")
    );
}

const courseQuerySchema = z.object({
    courseId: z.string().min(1).optional(),
});

const updateCourseSchema = z
    .object({
        courseId: z.string().min(1),
        courseName: z.string().min(1).max(255).optional(),
        userInput: z.string().min(1).max(1024).optional(),
        type: z.string().min(1).max(255).optional(),
        courseLayout: z.unknown().optional(),
    })
    .refine(
        (payload) =>
            payload.courseName !== undefined ||
            payload.userInput !== undefined ||
            payload.type !== undefined ||
            payload.courseLayout !== undefined,
        { message: "At least one field must be provided for update" }
    );

async function getCurrentUserEmail() {
    try {
        const user = await currentUser();
        return user?.primaryEmailAddress?.emailAddress ?? null;
    } catch {
        return null;
    }
}

function isNetworkOrDnsError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    return (
        message.includes("fetch failed") ||
        message.includes("enotfound") ||
        message.includes("getaddrinfo") ||
        message.includes("connection") && message.includes("failed")
    );
}

export async function GET(req: NextRequest) {
    try {
        const userEmail = await getCurrentUserEmail();
        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedQuery = courseQuerySchema.safeParse({
            courseId: req.nextUrl.searchParams.get("courseId") ?? undefined,
        });

        if (!parsedQuery.success) {
            return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
        }

        const courseId = parsedQuery.data.courseId;

        if (courseId) {
            const course = await db
                .select()
                .from(coursesTable)
                .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)));

            if (!course || course.length === 0) {
                return NextResponse.json({ error: "Course not found" }, { status: 404 });
            }

            const chapterContentSlidesRows = await db
                .select()
                .from(chapterContentSlides)
                .where(eq(chapterContentSlides.courseId, courseId));

            return NextResponse.json({
                ...course[0],
                chapterContentSlides: chapterContentSlidesRows,
            });
        }

        const courses = await db
            .select()
            .from(coursesTable)
            .where(eq(coursesTable.userId, userEmail))
            .orderBy(desc(coursesTable.createdAT));

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error fetching course(s)");

        const requestedCourseId = req.nextUrl.searchParams.get("courseId");
        if (isRecoverableDbReadError(error) || isNetworkOrDnsError(error)) {
            if (!requestedCourseId) {
                return NextResponse.json({ error: "Course data is temporarily unavailable" }, { status: 503 });
            }
            return NextResponse.json({ error: "Course data is temporarily unavailable" }, { status: 503 });
        }

        if (!requestedCourseId) {
            return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
        }

        return NextResponse.json({ error: "Failed to fetch course(s)" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}

export async function PATCH(req: NextRequest) {
    try {
        const userEmail = await getCurrentUserEmail();
        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedBody = updateCourseSchema.safeParse(await req.json());
        if (!parsedBody.success) {
            return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
        }

        const { courseId, ...updates } = parsedBody.data;

        const existing = await db
            .select()
            .from(coursesTable)
            .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)));

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const updated = await db
            .update(coursesTable)
            .set(updates)
            .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating course");
        if (isNetworkOrDnsError(error) || isRecoverableDbReadError(error)) {
            return NextResponse.json({ error: "Course storage is temporarily unavailable" }, { status: 503 });
        }
        return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userEmail = await getCurrentUserEmail();
        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsedQuery = courseQuerySchema.safeParse({
            courseId: req.nextUrl.searchParams.get("courseId") ?? undefined,
        });

        if (!parsedQuery.success || !parsedQuery.data.courseId) {
            return NextResponse.json({ error: "courseId is required" }, { status: 400 });
        }

        const courseId = parsedQuery.data.courseId;

        const existing = await db
            .select()
            .from(coursesTable)
            .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)));

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        await db.delete(chapterContentSlides).where(eq(chapterContentSlides.courseId, courseId));
        await db
            .delete(coursesTable)
            .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting course");
        if (isNetworkOrDnsError(error) || isRecoverableDbReadError(error)) {
            return NextResponse.json({ error: "Course storage is temporarily unavailable" }, { status: 503 });
        }
        return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
    }
}