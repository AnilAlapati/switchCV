#!/usr/bin/env node
/**
 * Live AI Generation Quality Evaluation Script
 *
 * Runs 10 representative gold dataset cases through real Gemini AI and reports:
 *   - Schema valid %      (AI response matches ResumeExtractionSchema)
 *   - Factual accuracy %  (key fields correctly extracted)
 *   - Avg latency (ms)
 *   - Estimated cost per resume
 *
 * Purpose: Pre-deploy manual quality gate — run before every production release
 * to confirm AI extraction quality has not regressed.
 *
 * Requirements:
 *   GEMINI_API_KEY env var must be set.
 *   No Firebase / server dependencies — calls Gemini REST API directly.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node scripts/eval-generation-quality.js
 *   GEMINI_API_KEY=<key> node scripts/eval-generation-quality.js --verbose
 *   GEMINI_API_KEY=<key> node scripts/eval-generation-quality.js --model gemini-1.5-flash
 *
 * Success criteria (same as KPI gate):
 *   Schema valid  ≥ 95%
 *   Field accuracy ≥ 90%
 *   Avg latency   ≤ 5000 ms
 *   Total cost    ≤ $0.50
 *
 * Exits 0 on pass, 1 on failure.
 *
 * Estimated run: < 60 s  |  cost: ~$0.01–$0.05 for 10 cases
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const https = require("https");
const path = require("path");

// ──────────────────────────────────────────────────────────────────────────────
// CLI flags
// ──────────────────────────────────────────────────────────────────────────────
const verbose = process.argv.includes("--verbose");
const modelIndex = process.argv.indexOf("--model");
const MODEL =
  modelIndex !== -1 && process.argv[modelIndex + 1]
    ? process.argv[modelIndex + 1]
    : "gemini-1.5-flash";

// Gemini Flash 1.5 pricing (per 1M tokens, as of March 2026)
const COST_PER_1M_INPUT_TOKENS = 0.075;  // $0.075 / 1M input tokens
const COST_PER_1M_OUTPUT_TOKENS = 0.30;  // $0.30  / 1M output tokens

// ──────────────────────────────────────────────────────────────────────────────
// Register TypeScript support for gold dataset import
// ──────────────────────────────────────────────────────────────────────────────
const tsConfigPath = path.resolve(__dirname, "../tsconfig.json");
try {
  require("tsconfig-paths").register({
    baseUrl: path.resolve(__dirname, ".."),
    paths: { "@/*": ["src/*"] },
  });
} catch {
  console.warn("tsconfig-paths not available. Run: npm install -D tsconfig-paths");
  process.exit(1);
}
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: { module: "commonjs", target: "es2020", esModuleInterop: true },
  });
} catch {
  console.warn("ts-node not available. Run: npm install -D ts-node");
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────────
// Extraction system prompt (mirrors aiExtractionService.ts)
// ──────────────────────────────────────────────────────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `You are a resume data extraction assistant. Your ONLY task is to extract structured fields from unstructured resume text.

Rules:
- Extract ONLY information that is explicitly stated in the text. Do NOT infer or fabricate any data.
- If a field is not present in the text, omit it entirely.
- For experience entries, keep the original wording of descriptions and achievements.
- For skills, list each distinct skill as a separate string.
- If the input text is not a resume or contains no extractable resume data, return an empty object {}.

Return a JSON object with these optional fields:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1-xxx-xxx-xxxx",
  "location": "City, State",
  "linkedin": "url",
  "skills": ["skill1", "skill2"],
  "experience": [{ "title": "...", "company": "...", "startDate": "...", "endDate": "...", "description": "..." }],
  "education": [{ "degree": "...", "institution": "...", "graduationDate": "..." }],
  "summary": "..."
}`;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convert a gold dataset case's messages to flat text suitable for extraction.
 */
function buildResumeText(goldCase) {
  if (goldCase.pasteText) {
    return goldCase.pasteText;
  }
  if (goldCase.messages) {
    // Concatenate user messages only (bot questions don't carry resume data)
    return goldCase.messages
      .filter((m) => m.isUser)
      .map((m) => m.content)
      .join("\n");
  }
  return "";
}

/**
 * Call the Gemini REST API with structured JSON output mode.
 * Returns { text, inputTokens, outputTokens, latencyMs }.
 */
function callGeminiAPI(apiKey, prompt, model) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };

    const start = Date.now();
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const latencyMs = Date.now() - start;
        if (res.statusCode !== 200) {
          reject(new Error(`Gemini API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const usage = parsed.usageMetadata ?? {};
          resolve({
            text,
            inputTokens: usage.promptTokenCount ?? Math.ceil(prompt.length / 4),
            outputTokens: usage.candidatesTokenCount ?? Math.ceil(text.length / 4),
            latencyMs,
          });
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Gemini API request timed out after 30s"));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Parse and validate the AI extraction response.
 * Returns { valid, data, issues }.
 */
function validateExtractionResponse(text, goldCase) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, data: null, issues: ["Response is not valid JSON"] };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, data: parsed, issues: ["Response is not an object"] };
  }

  const issues = [];

  // Check schema: known fields only
  const ALLOWED_FIELDS = new Set([
    "name", "email", "phone", "location", "linkedin", "website",
    "summary", "skills", "experience", "education",
  ]);
  const unknownFields = Object.keys(parsed).filter((k) => !ALLOWED_FIELDS.has(k));
  if (unknownFields.length > 0) {
    issues.push(`Unknown fields in response: ${unknownFields.join(", ")}`);
  }

  // skills must be array of strings
  if (parsed.skills !== undefined && !Array.isArray(parsed.skills)) {
    issues.push("skills must be an array");
  }
  // experience must be array
  if (parsed.experience !== undefined && !Array.isArray(parsed.experience)) {
    issues.push("experience must be an array");
  }
  // education must be array
  if (parsed.education !== undefined && !Array.isArray(parsed.education)) {
    issues.push("education must be an array");
  }

  return { valid: issues.length === 0, data: parsed, issues };
}

/**
 * Evaluate how accurately the AI extracted expected fields.
 * Returns: { totalChecks, passedChecks, details }
 */
function evaluateFieldAccuracy(extractedData, goldCase, resumeText) {
  const results = [];

  // Check name extraction (look for expected name in messages)
  const nameMatch = resumeText.match(/(?:my name is|I'm|I am)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
  const expectedName = nameMatch ? nameMatch[1] : null;
  if (expectedName) {
    const nameFound =
      extractedData?.name &&
      expectedName.toLowerCase().split(" ").every((part) =>
        extractedData.name.toLowerCase().includes(part),
      );
    results.push({
      field: "name",
      expected: expectedName,
      got: extractedData?.name ?? "(missing)",
      passed: !!nameFound,
    });
  }

  // Check email extraction
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const expectedEmail = emailMatch ? emailMatch[0].toLowerCase() : null;
  if (expectedEmail) {
    const emailFound =
      extractedData?.email &&
      extractedData.email.toLowerCase() === expectedEmail;
    results.push({
      field: "email",
      expected: expectedEmail,
      got: extractedData?.email ?? "(missing)",
      passed: !!emailFound,
    });
  }

  // Check skills extraction (at least 1 skill if skills exist in text)
  const hasSkillsInText = /skills?:|proficient|experience with/i.test(resumeText);
  if (hasSkillsInText) {
    const skillsFound =
      Array.isArray(extractedData?.skills) && extractedData.skills.length > 0;
    results.push({
      field: "skills",
      expected: "non-empty array",
      got: skillsFound ? `[${extractedData.skills.length} items]` : "(missing/empty)",
      passed: skillsFound,
    });
  }

  // Check experience extraction (at least 1 entry if experience mentioned)
  const hasExpInText = /intern|engineer|developer|work|worked|position|role/i.test(resumeText);
  if (hasExpInText) {
    const expFound =
      Array.isArray(extractedData?.experience) && extractedData.experience.length > 0;
    results.push({
      field: "experience",
      expected: "non-empty array",
      got: expFound ? `[${extractedData.experience.length} entries]` : "(missing/empty)",
      passed: expFound,
    });
  }

  const passedChecks = results.filter((r) => r.passed).length;
  return { totalChecks: results.length, passedChecks, details: results };
}

/**
 * Select 10 representative cases from the gold dataset.
 * Distribution: 4 chat, 3 paste, 3 pdf.
 */
function selectEvalCases(allCases) {
  const chat = allCases.filter((c) => c.category === "chat");
  const paste = allCases.filter((c) => c.category === "paste");
  const pdf = allCases.filter((c) => c.category === "pdf");

  // Deterministic selection: spread evenly over each source array
  function pickN(arr, n) {
    if (arr.length === 0) return [];
    const selected = [];
    const step = Math.max(1, Math.floor(arr.length / n));
    for (let i = 0; i < n && i * step < arr.length; i++) {
      selected.push(arr[i * step]);
    }
    return selected.slice(0, n);
  }

  return [...pickN(chat, 4), ...pickN(paste, 3), ...pickN(pdf, 3)];
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌  GEMINI_API_KEY is not set. Export it before running:");
    console.error("    export GEMINI_API_KEY=<your-key>");
    process.exit(1);
  }

  console.log("=== Resume Generation Quality Evaluation ===");
  console.log(`Model  : ${MODEL}`);
  console.log(`Date   : ${new Date().toISOString()}`);
  console.log("─".repeat(50));

  // Load gold dataset
  const { GOLD_DATASET } = require("../src/__tests__/lib/data/evaluationGoldDataset");
  const evalCases = selectEvalCases(GOLD_DATASET);

  if (evalCases.length === 0) {
    console.error("❌  No evaluation cases selected from gold dataset.");
    process.exit(1);
  }

  console.log(`Cases  : ${evalCases.length} (${evalCases.filter((c) => c.category === "chat").length} chat, ${evalCases.filter((c) => c.category === "paste").length} paste, ${evalCases.filter((c) => c.category === "pdf").length} pdf)`);
  console.log("");

  // Run evaluation
  const results = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalLatencyMs = 0;
  let schemaValidCount = 0;
  let totalFieldChecks = 0;
  let totalFieldPassed = 0;

  for (let i = 0; i < evalCases.length; i++) {
    const goldCase = evalCases[i];
    const resumeText = buildResumeText(goldCase);

    if (resumeText.length < 20) {
      if (verbose) console.log(`  ⚠️  Case ${goldCase.id}: insufficient text, skipping`);
      continue;
    }

    const prompt = `${EXTRACTION_SYSTEM_PROMPT}\n\nExtract all resume fields from the following text. Return ONLY valid JSON — no explanations.\n\n---\nRESUME TEXT:\n${resumeText}\n---`;

    process.stdout.write(`[${i + 1}/${evalCases.length}] ${goldCase.id} (${goldCase.category}) ... `);

    try {
      const { text, inputTokens, outputTokens, latencyMs } = await callGeminiAPI(apiKey, prompt, MODEL);

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalLatencyMs += latencyMs;

      const { valid, data, issues } = validateExtractionResponse(text, goldCase);
      const fieldAccuracy = evaluateFieldAccuracy(data, goldCase, resumeText);

      if (valid) schemaValidCount++;
      totalFieldChecks += fieldAccuracy.totalChecks;
      totalFieldPassed += fieldAccuracy.passedChecks;

      const fieldPct =
        fieldAccuracy.totalChecks > 0
          ? Math.round((fieldAccuracy.passedChecks / fieldAccuracy.totalChecks) * 100)
          : 100;

      results.push({
        id: goldCase.id,
        category: goldCase.category,
        valid,
        fieldAccuracyPct: fieldPct,
        latencyMs,
        inputTokens,
        outputTokens,
        issues,
        fieldDetails: fieldAccuracy.details,
      });

      const status = valid ? "✅" : "❌";
      console.log(`${status}  ${latencyMs}ms  fields:${fieldPct}%${issues.length > 0 ? "  issues: " + issues.join("; ") : ""}`);

      if (verbose && fieldAccuracy.details.length > 0) {
        for (const d of fieldAccuracy.details) {
          const icon = d.passed ? "  ✓" : "  ✗";
          console.log(`${icon}  ${d.field}: expected "${d.expected}", got "${d.got}"`);
        }
      }
    } catch (err) {
      console.log(`❌  ERROR: ${err.message}`);
      results.push({
        id: goldCase.id,
        category: goldCase.category,
        valid: false,
        fieldAccuracyPct: 0,
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        issues: [err.message],
        fieldDetails: [],
      });
    }

    // Small delay to avoid rate limits
    if (i < evalCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Report
  // ──────────────────────────────────────────────────────────────
  const evaluated = results.length;
  if (evaluated === 0) {
    console.error("❌  No cases were evaluated.");
    process.exit(1);
  }

  const schemaValidPct = Math.round((schemaValidCount / evaluated) * 100);
  const fieldAccuracyPct =
    totalFieldChecks > 0
      ? Math.round((totalFieldPassed / totalFieldChecks) * 100)
      : 100;
  const avgLatencyMs = Math.round(totalLatencyMs / evaluated);
  const totalCost =
    (totalInputTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS +
    (totalOutputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
  const costPerResume = totalCost / evaluated;

  console.log("");
  console.log("─".repeat(50));
  console.log("RESULTS");
  console.log("─".repeat(50));
  console.log(`Cases evaluated   : ${evaluated}`);
  console.log(`Schema valid      : ${schemaValidCount}/${evaluated}  (${schemaValidPct}%)   [threshold ≥95%]`);
  console.log(`Field accuracy    : ${totalFieldPassed}/${totalFieldChecks} checks  (${fieldAccuracyPct}%)   [threshold ≥90%]`);
  console.log(`Avg latency       : ${avgLatencyMs} ms   [threshold ≤5000ms]`);
  console.log(`Total tokens      : ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`Total cost        : $${totalCost.toFixed(4)}   [threshold ≤$0.50]`);
  console.log(`Cost per resume   : $${costPerResume.toFixed(4)}`);
  console.log("");

  // Per-category breakdown
  const categories = ["chat", "paste", "pdf"];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    const catValid = catResults.filter((r) => r.valid).length;
    const catAvgLatency = Math.round(
      catResults.reduce((s, r) => s + r.latencyMs, 0) / catResults.length,
    );
    console.log(`  ${cat.padEnd(6)} : ${catValid}/${catResults.length} valid, avg ${catAvgLatency}ms`);
  }

  console.log("");

  // Pass / fail judgment
  const SCHEMA_VALID_THRESHOLD = 95;
  const FIELD_ACCURACY_THRESHOLD = 90;
  const LATENCY_THRESHOLD_MS = 5000;
  const COST_THRESHOLD = 0.50;

  const passed =
    schemaValidPct >= SCHEMA_VALID_THRESHOLD &&
    fieldAccuracyPct >= FIELD_ACCURACY_THRESHOLD &&
    avgLatencyMs <= LATENCY_THRESHOLD_MS &&
    totalCost <= COST_THRESHOLD;

  if (passed) {
    console.log("✅  QUALITY GATE: PASS — all thresholds met");
    console.log("    Safe to deploy.");
  } else {
    console.log("❌  QUALITY GATE: FAIL");
    if (schemaValidPct < SCHEMA_VALID_THRESHOLD) {
      console.log(`    Schema valid ${schemaValidPct}% < ${SCHEMA_VALID_THRESHOLD}% threshold`);
    }
    if (fieldAccuracyPct < FIELD_ACCURACY_THRESHOLD) {
      console.log(`    Field accuracy ${fieldAccuracyPct}% < ${FIELD_ACCURACY_THRESHOLD}% threshold`);
    }
    if (avgLatencyMs > LATENCY_THRESHOLD_MS) {
      console.log(`    Avg latency ${avgLatencyMs}ms > ${LATENCY_THRESHOLD_MS}ms threshold`);
    }
    if (totalCost > COST_THRESHOLD) {
      console.log(`    Cost $${totalCost.toFixed(4)} > $${COST_THRESHOLD} threshold`);
    }
    console.log("    Investigate failures before deploying.");
  }

  console.log("");

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("💥 Evaluation script crashed:", err.message);
  process.exit(1);
});
