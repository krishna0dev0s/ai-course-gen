type EnvCheckResult = {
  ok: boolean;
  missing: string[];
  optionalMissing: string[];
};

const requiredVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "YOUTUBE_API_KEY",
];

const optionalVars = ["GEMINI_MODEL"];

function isMissing(value: string | undefined) {
  return !value || value.trim().length === 0;
}

export function checkRequiredEnv(): EnvCheckResult {
  const missing = requiredVars.filter((key) => isMissing(process.env[key]));
  const optionalMissing = optionalVars.filter((key) => isMissing(process.env[key]));

  return {
    ok: missing.length === 0,
    missing,
    optionalMissing,
  };
}
