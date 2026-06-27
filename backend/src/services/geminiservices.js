const { z } = require("zod");

const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const responseSchema = {
  type: "object",
  required: [
    "atsScore",
    "scoreBreakdown",
    "issues",
    "strengths",
    "bulletRewrites",
    "keywordsPresent",
    "keywordsMissing",
    "summary",
  ],
  properties: {
    atsScore: { type: "number", description: "ATS-readiness score from 0 to 100" },
    scoreBreakdown: {
      type: "object",
      required: ["keywords", "formatting", "impact", "clarity"],
      properties: {
        keywords: { type: "number", description: "0-25" },
        formatting: { type: "number", description: "0-25" },
        impact: { type: "number", description: "0-25" },
        clarity: { type: "number", description: "0-25" },
      },
    },
    issues: {
      type: "array",
      description: "Exactly 5 prioritized issues",
      items: {
        type: "object",
        required: ["title", "explanation", "fix"],
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          explanation: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
    strengths: {
      type: "array",
      description: "Exactly 5 strengths",
      items: {
        type: "object",
        required: ["title", "evidence"],
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
        },
      },
    },
    bulletRewrites: {
      type: "array",
      description: "5-10 weak bullets rewritten to be stronger and ATS-friendly",
      items: {
        type: "object",
        required: ["section", "original", "rewritten", "rationale"],
        properties: {
          section: { type: "string" },
          original: { type: "string" },
          rewritten: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
    keywordsPresent: { type: "array", items: { type: "string" } },
    keywordsMissing: { type: "array", items: { type: "string" } },
    summary: {
      type: "string",
      description: "One short paragraph overall verdict",
    },
  },
};

const analysisValidator = z.object({
  atsScore: z.number().min(0).max(100),
  scoreBreakdown: z.object({
    keywords: z.number().min(0).max(25),
    formatting: z.number().min(0).max(25),
    impact: z.number().min(0).max(25),
    clarity: z.number().min(0).max(25),
  }),
  issues: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        explanation: z.string(),
        fix: z.string(),
      })
    )
    .min(1),
  strengths: z
    .array(z.object({ title: z.string(), evidence: z.string() }))
    .min(1),
bulletRewrites: z
  .array(
    z.object({
      section: z.string(),
      original: z.string(),
      rewritten: z.string(),
      rationale: z.string(),
    })
  )
  .default([]),
  keywordsPresent: z.array(z.string()).default([]),
  keywordsMissing: z.array(z.string()).default([]),
  summary: z.string(),
});

function buildPrompt({ rawText, targetRole }) {
  return [
    "You are a senior technical recruiter and ATS expert reviewing a resume.",
    targetRole
      ? `Target role: ${targetRole}.`
      : "No specific target role was provided – assess for the role the candidate appears to be aiming for.",
    "",
    "Score the resume from 0–100 based on ATS readiness (keyword match, parseable formatting, quantified impact, clarity).",
    "Return exactly 5 prioritized issues, 5 standout strengths, and 5–10 weak bullets rewritten to be stronger, quantified, and ATS-friendly.",
    "Rewrites must preserve the original meaning. Each rewrite needs a one-line rationale.",
    "Identify keywords clearly present and notable keywords missing for the apparent target role.",
    "Be specific and evidence-based— cite phrasing from the resume in explanations.",
    "",
    "RESUME TEXT:",
    "------------",
    rawText,
    "------------",
  ].join("\n");
}
async function callGemini(prompt) {
  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed with ${response.status}`;
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
  if (!text) throw new Error("Empty response from Gemini");

  return {
    text,
    usage: data?.usageMetadata || {},
  };
}

async function analyzeResume({ rawText, targetRole }) {
 if (!env.geminiApiKey) {
  throw ApiError.internal(
    "GEMINI_API_KEY is not configured on the server."
  );
}

  const prompt = buildPrompt({ rawText, targetRole });

  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { text, usage } = await callGemini(prompt);
      const parsed = JSON.parse(text);
            const validated = analysisValidator.parse(parsed);
      return {
        analysis: validated,
        model: env.geminiModel,
        promptTokens: usage.promptTokenCount,
        responseTokens: usage.candidatesTokenCount,
      };
    } catch (err) {
      lastErr = err;
      if (attempt === 2) break;
    }
  }

  const detail = lastErr?.message || "unknown error";
  const reason = detail.includes("PERMISSION_DENIED") || detail.includes("403")
    ? "The configured Gemini API key or project does not have access to the selected model. Ensure the key is valid, the Gemini API is enabled for your project, and the model name is supported."
    : detail;

  throw ApiError.internal(`Gemini analysis failed: ${reason}`);
}

module.exports = { analyzeResume };

