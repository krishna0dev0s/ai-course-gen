import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient, geminiModelName } from "@/config/gemini";

type ChapterInput = {
  chapterId?: string;
  chapterTitle?: string;
  subContent?: string[];
};

type VideoInput = {
  title?: string | null;
  description?: string | null;
  watchUrl?: string | null;
  channelTitle?: string | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const { courseName, chapter, video } = (await req.json()) as {
      courseName?: string;
      chapter?: ChapterInput;
      video?: VideoInput;
    };

    if (!chapter?.chapterTitle) {
      return NextResponse.json({ error: "chapterTitle is required" }, { status: 400 });
    }

    const chapterTitle = chapter.chapterTitle;
    const prompt = `
You are an expert teacher creating high-quality revision notes.

Generate clean, student-friendly notes in MARKDOWN for this topic:

Course: ${courseName ?? "Untitled Course"}
Chapter: ${chapterTitle}
Subtopics: ${(chapter.subContent ?? []).join(", ")}
Selected YouTube Video Title: ${video?.title ?? "N/A"}
Selected YouTube Video Description: ${video?.description ?? "N/A"}
Selected YouTube Video URL: ${video?.watchUrl ?? "N/A"}
Selected YouTube Channel: ${video?.channelTitle ?? "N/A"}

Requirements:
1) Return markdown only.
2) Keep notes specific to the chapter topic only (no broad full-course coverage).
3) Structure strictly with these sections:
   - # Topic Notes: <chapter title>
   - ## Quick Summary
   - ## Key Concepts
   - ## Detailed Explanation
   - ## Practical Examples
   - ## Common Mistakes to Avoid
   - ## Revision Checklist
   - ## Quick Self-Test (5 questions)
   - ## 1-Minute Recap
4) Make it easy for revision: concise bullets, short paragraphs, clear terms.
5) Mention the selected video as a reference at the end under: ## Video Reference
6) Do not include HTML or code fences unless absolutely needed.
`;

    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(prompt);
    const notes = (result.response.text() ?? "").trim();

    if (!notes) {
      return NextResponse.json({ error: "Could not generate notes" }, { status: 500 });
    }

    const fileName = `${slugify(courseName ?? "course")}-${slugify(chapterTitle)}-notes.md`;
    return NextResponse.json({ notes, fileName });
  } catch (error) {
    console.error("Error generating chapter notes:", error);
    return NextResponse.json({ error: "Failed to generate chapter notes" }, { status: 500 });
  }
}
