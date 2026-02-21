import { db } from "@/config/database";
import { getGeminiClient, geminiModelName } from "@/config/gemini";
import { coursesTable } from "@/config/schema";
import { course_config_prompt } from "@/data/prompt";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";

type CourseLayoutPayload = {
  courseId?: string;
  courseName?: string;
  courseDescription?: string;
  level?: string;
  totalChapters?: number;
  chapters?: Array<{
    chapterId?: string;
    chapterTitle?: string;
    subContent?: string[];
  }>;
};

const DB_LIMITS = {
  userId: 255,
  courseId: 255,
  courseName: 255,
  userInput: 1024,
  type: 255,
};

const createCourseSchema = z.object({
  userInput: z.string().min(3).max(1024),
  courseId: z.string().min(1).max(255),
  type: z.string().min(1).max(255).default("full-course"),
});

function normalizeCourseLayout(layout: CourseLayoutPayload): CourseLayoutPayload {
  const normalizedChapters = Array.isArray(layout.chapters)
    ? layout.chapters
        .filter((chapter) => chapter?.chapterTitle)
        .map((chapter, index) => ({
          chapterId: String(chapter.chapterId ?? `chapter-${index + 1}`).trim(),
          chapterTitle: String(chapter.chapterTitle ?? `Chapter ${index + 1}`).trim(),
          subContent: Array.isArray(chapter.subContent)
            ? chapter.subContent.filter(Boolean).map((item) => String(item).trim()).slice(0, 3)
            : [],
        }))
    : [];

  return {
    ...layout,
    chapters: normalizedChapters,
    totalChapters: normalizedChapters.length,
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(fenced);
    } catch {
      const arrayStart = fenced.indexOf("[");
      const arrayEnd = fenced.lastIndexOf("]");
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        return JSON.parse(fenced.slice(arrayStart, arrayEnd + 1));
      }

      const start = fenced.indexOf("{");
      const end = fenced.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(fenced.slice(start, end + 1));
      }
      throw new Error("Model returned non-JSON response");
    }
  }
}

function slugifyTopic(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function stripUnsafeChars(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function fitToLength(value: string, maxLength: number) {
  return stripUnsafeChars(value).slice(0, maxLength);
}

function toSafeJsonValue(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map((item) => toSafeJsonValue(item));

  if (typeof value === "string") return stripUnsafeChars(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return String(value ?? "");

  const obj = value as Record<string, unknown>;
  const safeObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    safeObj[key] = toSafeJsonValue(val);
  }
  return safeObj;
}

function buildFallbackCourseLayout(userInput: string, forcedCourseId: string): CourseLayoutPayload {
  const topic = userInput.trim();
  const fallbackCourseId = forcedCourseId || slugifyTopic(topic) || "generated-course";

  return {
    courseId: fallbackCourseId,
    courseName: `Complete Guide: ${topic}`,
    courseDescription: `A practical, step-by-step course on ${topic} for learners who want strong fundamentals and clear progression.`,
    level: "Beginner",
    totalChapters: 5,
    chapters: [
      {
        chapterId: `${fallbackCourseId}-foundations`,
        chapterTitle: "Foundations and Core Concepts",
        subContent: ["What this topic is", "Why it matters", "Essential terminology"],
      },
      {
        chapterId: `${fallbackCourseId}-setup`,
        chapterTitle: "Environment Setup and Basics",
        subContent: ["Initial setup", "Basic workflow", "First practical steps"],
      },
      {
        chapterId: `${fallbackCourseId}-key-techniques`,
        chapterTitle: "Key Techniques",
        subContent: ["Core method 1", "Core method 2", "When to use each"],
      },
      {
        chapterId: `${fallbackCourseId}-real-world`,
        chapterTitle: "Real-World Usage",
        subContent: ["Applied examples", "Common patterns", "Troubleshooting basics"],
      },
      {
        chapterId: `${fallbackCourseId}-revision`,
        chapterTitle: "Revision and Next Steps",
        subContent: ["Recap", "Common mistakes", "Practice roadmap"],
      },
    ],
  };
}

async function insertCourseWithConflictHandling(args: {
  courseId: string;
  courseName: string;
  userInput: string;
  type: string;
  courseLayout: CourseLayoutPayload;
  userId: string;
}) {
  const safeCourseId = fitToLength(args.courseId, DB_LIMITS.courseId);
  const safeCourseName = fitToLength(args.courseName, DB_LIMITS.courseName);
  const safeUserInput = fitToLength(args.userInput, DB_LIMITS.userInput);
  const safeType = fitToLength(args.type, DB_LIMITS.type);
  const safeUserId = fitToLength(args.userId, DB_LIMITS.userId);
  const safeLayout = toSafeJsonValue({
    ...args.courseLayout,
    courseId: safeCourseId,
  });

  const baseValues = {
    courseName: safeCourseName,
    userInput: safeUserInput,
    type: safeType,
    userId: safeUserId,
  };

  try {
    return await db
      .insert(coursesTable)
      .values({
        ...baseValues,
        courseId: safeCourseId,
        courseLayout: safeLayout,
      })
      .returning();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const dbCode = (error as { code?: string } | null)?.code;

    const isInvalidJson = message.toLowerCase().includes("invalid input syntax for type json");
    if (isInvalidJson) {
      return await db
        .insert(coursesTable)
        .values({
          ...baseValues,
          courseId: safeCourseId,
          courseLayout: null,
        })
        .returning();
    }

    const isUniqueViolation =
      dbCode === "23505" || message.includes("duplicate key") || message.includes("courses_courseId_unique");
    if (!isUniqueViolation) throw error;

    const newCourseId = fitToLength(
      `${safeCourseId}-${Date.now().toString().slice(-4)}`,
      DB_LIMITS.courseId
    );
    return await db
      .insert(coursesTable)
      .values({
        ...baseValues,
        courseId: newCourseId,
        courseLayout: toSafeJsonValue({
          ...args.courseLayout,
          courseId: newCourseId,
        }),
      })
      .returning();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isInfraDbError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = (error as { code?: string } | null)?.code;
  return (
    code === "42p01" ||
    code === "3f000" ||
    code === "57p01" ||
    code === "57p03" ||
    code === "53300" ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("schema") && message.includes("does not exist") ||
    message.includes("connection") && message.includes("terminated") ||
    message.includes("timeout") ||
    message.includes("connect") && message.includes("failed")
  );
}

async function canReachDatabase() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = createCourseSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? "Invalid request payload" },
        { status: 400 }
      );
    }

    const { userInput, courseId, type } = parsedBody.data;
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbReady = await canReachDatabase();
    if (!dbReady) {
      return NextResponse.json(
        { error: "Course storage is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: geminiModelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const promptParts = [
      course_config_prompt,
      `Generate a course configuration for: ${userInput} with courseId: ${courseId ?? ""} and type: ${type}`,
      "Choose chapter count dynamically based on topic depth. Do not force 3 chapters.",
    ];

    let response;
    try {
      response = await model.generateContent(promptParts);
    } catch {
      await sleep(1200);
      response = await model.generateContent(promptParts);
    }

    const rawResult = response.response.text() || "";
    let jsonResult: CourseLayoutPayload;
    try {
      const parsedResult = extractJson(rawResult) as CourseLayoutPayload | CourseLayoutPayload[];
      const rawLayout: CourseLayoutPayload = Array.isArray(parsedResult)
        ? parsedResult[0] ?? {}
        : parsedResult ?? {};
      jsonResult = normalizeCourseLayout(rawLayout);
    } catch {
      jsonResult = normalizeCourseLayout(buildFallbackCourseLayout(userInput, courseId));
    }

    const resolvedCourseId = String(courseId ?? jsonResult.courseId ?? "").trim();
    const resolvedCourseName = String(jsonResult.courseName ?? "").trim();
    const resolvedType = String(type ?? "full-course").trim();

    if (!resolvedCourseId) {
      return NextResponse.json(
        { error: "courseId is missing in request and model response" },
        { status: 400 }
      );
    }

    if (!resolvedCourseName) {
      return NextResponse.json(
        { error: "Model response is missing courseName. Please try again." },
        { status: 500 }
      );
    }

    if (!jsonResult.chapters || jsonResult.chapters.length === 0) {
      jsonResult = normalizeCourseLayout(buildFallbackCourseLayout(userInput, resolvedCourseId));
    }

    const courseResult = await insertCourseWithConflictHandling({
      courseId: resolvedCourseId,
      courseName: resolvedCourseName,
      userInput,
      type: resolvedType,
      courseLayout: jsonResult,
      userId: userEmail,
    });

    const createdCourse = courseResult?.[0];
    if (!createdCourse?.courseId) {
      return NextResponse.json(
        { error: "Course was generated but could not be saved. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(createdCourse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate course layout";
    const lowerMessage = message.toLowerCase();
    const dbCode = (error as { code?: string } | null)?.code;

    if (message.includes("429") || lowerMessage.includes("resource exhausted")) {
      return Response.json(
        { error: "Gemini quota exceeded. Try again later or switch to another Gemini model." },
        { status: 429 }
      );
    }

    if (lowerMessage.includes("fetch failed")) {
      return Response.json(
        { error: "Unable to reach Gemini API from this network. Check firewall/proxy/VPN and try again." },
        { status: 503 }
      );
    }

    if (
      dbCode === "22001" ||
      lowerMessage.includes("value too long") ||
      lowerMessage.includes("duplicate key") ||
      lowerMessage.includes("courses_courseid_unique") ||
      lowerMessage.includes("invalid input syntax")
    ) {
      return Response.json(
        { error: "Unable to save this generated course. Please try again." },
        { status: 503 }
      );
    }

    if (isInfraDbError(error)) {
      return Response.json(
        { error: "Course storage is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    return Response.json(
      { error: "Failed to generate course layout. Please try again." },
      { status: 503 }
    );
  }
}
