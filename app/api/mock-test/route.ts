import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/config/database";
import { coursesTable } from "@/config/schema";
import { and, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { generateOpenAIText } from "@/config/openai";

type MockQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

const requestSchema = z.object({
  courseId: z.string().min(1),
  totalQuestions: z.number().int().min(5).max(30).default(10),
});

function stripUnsafeChars(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function extractJson(text: string) {
  const cleaned = text.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const unfenced = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    try {
      return JSON.parse(unfenced);
    } catch {
      const objectStart = unfenced.indexOf("{");
      const objectEnd = unfenced.lastIndexOf("}");
      if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
        return JSON.parse(unfenced.slice(objectStart, objectEnd + 1));
      }
      throw new Error("Model returned non-JSON response");
    }
  }
}

function buildFallbackQuestions(courseName: string, totalQuestions: number): MockQuestion[] {
  return Array.from({ length: totalQuestions }).map((_, index) => {
    const questionNumber = index + 1;
    const base = `Which statement best reflects the core concept of ${courseName}?`;
    const options = [
      "It focuses on practical understanding and application",
      "It should only be learned theoretically",
      "It is unrelated to problem-solving",
      "It cannot be improved with practice",
    ];

    return {
      id: `q-${questionNumber}`,
      question: `${base} (Q${questionNumber})`,
      options,
      correctAnswer: options[0],
      explanation: "The course emphasizes understanding concepts and applying them through practice.",
    };
  });
}

function normalizeQuestions(value: unknown, fallbackCourseName: string, totalQuestions: number): MockQuestion[] {
  if (!Array.isArray(value)) {
    return buildFallbackQuestions(fallbackCourseName, totalQuestions);
  }

  const normalized = value
    .map((item, index) => {
      const source = (item ?? {}) as Record<string, unknown>;
      const rawOptions = Array.isArray(source.options) ? source.options : [];
      const options = rawOptions
        .map((option) => stripUnsafeChars(String(option ?? "")))
        .filter(Boolean)
        .slice(0, 4);

      if (options.length < 4) return null;

      const cleanCorrect = stripUnsafeChars(String(source.correctAnswer ?? ""));
      const correctAnswer = options.includes(cleanCorrect) ? cleanCorrect : options[0];

      return {
        id: `q-${index + 1}`,
        question: stripUnsafeChars(String(source.question ?? `Question ${index + 1}`)),
        options,
        correctAnswer,
        explanation: stripUnsafeChars(String(source.explanation ?? "")),
      };
    })
    .filter((item): item is MockQuestion => Boolean(item));

  if (normalized.length < 3) {
    return buildFallbackQuestions(fallbackCourseName, totalQuestions);
  }

  return normalized.slice(0, totalQuestions);
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedBody = requestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { courseId, totalQuestions } = parsedBody.data;

    const rows = await db
      .select()
      .from(coursesTable)
      .where(and(eq(coursesTable.courseId, courseId), eq(coursesTable.userId, userEmail)));

    if (!rows?.length) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const course = rows[0];
    const layout = (course.courseLayout ?? {}) as {
      courseName?: string;
      level?: string;
      chapters?: Array<{ chapterTitle?: string; subContent?: string[] }>;
    };

    const courseName = stripUnsafeChars(layout.courseName ?? course.courseName ?? "Course");
    const level = stripUnsafeChars(layout.level ?? "Mixed");
    const chapters = Array.isArray(layout.chapters) ? layout.chapters : [];

    const chapterSummary = chapters
      .slice(0, 12)
      .map((chapter, index) => {
        const title = stripUnsafeChars(chapter?.chapterTitle ?? `Chapter ${index + 1}`);
        const topics = Array.isArray(chapter?.subContent)
          ? chapter.subContent.map((topic) => stripUnsafeChars(String(topic))).filter(Boolean).slice(0, 4)
          : [];
        return `${index + 1}. ${title}${topics.length ? ` -> ${topics.join(", ")}` : ""}`;
      })
      .join("\n");

    const prompt = `You are an expert exam creator. Create an online mock test as pure JSON array only.

Rules:
- Create exactly ${totalQuestions} multiple-choice questions.
- Difficulty: mixed (easy/medium/hard) suitable for ${level} learners.
- Context course: ${courseName}
- Focus on these chapters/topics:
${chapterSummary || "General concepts from the course"}
- Each question object MUST contain:
  - question (string)
  - options (array of exactly 4 strings)
  - correctAnswer (must match one option exactly)
  - explanation (1-2 lines)
- No markdown, no code fences, no extra keys.

Output format example:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "..."
  }
]`;

    const responseText = await generateOpenAIText(prompt, { temperature: 0.3, maxTokens: 2600 });
    const parsed = extractJson(responseText);
    const questions = normalizeQuestions(parsed, courseName, totalQuestions);

    return NextResponse.json({
      courseId,
      courseName,
      totalQuestions: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Error generating mock test", error);
    return NextResponse.json({ error: "Failed to generate mock test" }, { status: 500 });
  }
}
