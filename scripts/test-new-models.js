#!/usr/bin/env node
/**
 * Quick test: verify active Gemini models respond correctly
 * Usage: node scripts/test-new-models.js
 */

const https = require("https");

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is not set.");
  console.error("Usage: GEMINI_API_KEY=your-key node scripts/test-new-models.js");
  process.exit(1);
}

const MODELS = [
  { id: "gemini-3.1-flash-lite-preview", label: "Basic tier — PRIMARY (new)" },
  { id: "gemini-2.5-flash-lite", label: "Basic tier — fallback" },
  { id: "gemini-2.5-flash", label: "Premium / default" },
  { id: "gemini-2.5-pro", label: "Enterprise" },
  { id: "gemini-2.0-flash", label: "DISCONTINUED June 1 2026" },
  { id: "gemini-1.5-flash", label: "DISCONTINUED — removed from routing" },
];

function callModel(modelId) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: "Reply with exactly the word: OK" }] }],
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${KEY}`;
    const req = https.request(
      url,
      { method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const j = JSON.parse(data);
            const text =
              j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
              j.error?.message ||
              "(no text)";
            resolve({ ok: !!j.candidates, status: res.statusCode, text });
          } catch {
            resolve({ ok: false, status: res.statusCode, text: data.slice(0, 100) });
          }
        });
      }
    );
    req.on("error", (e) => resolve({ ok: false, status: 0, text: e.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log("\nGemini Model Availability Check\n" + "=".repeat(50));
  for (const { id, label } of MODELS) {
    const result = await callModel(id);
    const icon = result.ok ? "✅" : "❌";
    console.log(`\n${icon} ${id} (${label})`);
    console.log(`   HTTP ${result.status} → "${result.text.slice(0, 80)}"`);
  }
  console.log("\n" + "=".repeat(50));
})();
