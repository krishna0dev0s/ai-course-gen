import { usersTable } from "@/config/schema";
import { db } from "@/config/database";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

function isRecoverableDbError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const code = (error as { code?: string } | null)?.code;
    return (
        code === "42P01" ||
        code === "3F000" ||
        message.includes("relation") && message.includes("does not exist") ||
        message.includes("schema") && message.includes("does not exist")
    );
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

function getDisplayNameFromEmail(email: string) {
    return email.split("@")[0] || "Guest";
}

export async function POST(req:NextRequest) {
    try {
        let currentUserData: Awaited<ReturnType<typeof currentUser>> | null = null;
        try {
            currentUserData = await currentUser();
        } catch {
            return NextResponse.json(
                {
                    id: 0,
                    email: null,
                    name: "Guest",
                    credits: 0,
                    fallback: true,
                    authUnavailable: true,
                },
                { status: 200 }
            );
        }

        const email = currentUserData?.primaryEmailAddress?.emailAddress;
        if (!email) {
            return NextResponse.json(
                {
                    id: 0,
                    email: null,
                    name: "Guest",
                    credits: 0,
                    fallback: true,
                },
                { status: 200 }
            );
        }

        const name =
            currentUserData?.fullName?.trim() ||
            [currentUserData?.firstName, currentUserData?.lastName].filter(Boolean).join(" ") ||
            currentUserData?.username ||
            email.split("@")[0];

        const user = await db.select().from(usersTable).where(eq(usersTable.email, email));

        if (user.length === 0) {
            const newUser = await db
                .insert(usersTable)
                .values({
                    email,
                    name,
                })
                .returning();

            return NextResponse.json(newUser[0]);
        }

        return NextResponse.json(user[0]);
    } catch (error) {
        console.error("Error creating/loading user");

        if (isRecoverableDbError(error)) {
            const currentUserData = await currentUser();
            const email = currentUserData?.primaryEmailAddress?.emailAddress;
            if (!email) {
                return NextResponse.json(
                    {
                        id: 0,
                        email: null,
                        name: "Guest",
                        credits: 0,
                        fallback: true,
                    },
                    { status: 200 }
                );
            }

            const fallbackName =
                currentUserData?.fullName?.trim() ||
                [currentUserData?.firstName, currentUserData?.lastName].filter(Boolean).join(" ") ||
                currentUserData?.username ||
                email.split("@")[0];

            return NextResponse.json({
                id: 0,
                email,
                name: fallbackName,
                credits: 0,
                fallback: true,
            });
        }

        if (isNetworkOrDnsError(error)) {
            return NextResponse.json(
                {
                    id: 0,
                    email: null,
                    name: "Guest",
                    credits: 0,
                    fallback: true,
                    dbUnavailable: true,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                id: 0,
                email: null,
                name: "Guest",
                credits: 0,
                fallback: true,
            },
            { status: 200 }
        );
    }
}