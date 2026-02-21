import { GoogleGenerativeAI } from "@google/generative-ai";

export const geminiModelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }

    return new GoogleGenerativeAI(apiKey);
}