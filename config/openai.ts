export const openAIModelName = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return apiKey;
}

type GenerateTextOptions = {
  temperature?: number;
  maxTokens?: number;
};

export async function generateOpenAIText(
  prompt: string,
  options: GenerateTextOptions = {}
) {
  const apiKey = getOpenAIApiKey();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAIModelName,
      messages: [
        {
          role: "system",
          content: "You are a precise assistant that follows formatting instructions exactly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1800,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body?.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(`OPENAI_${response.status}: ${message}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenAI returned empty content");
  }

  return text.trim();
}
