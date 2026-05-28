#!/usr/bin/env node
/**
 * Performance Benchmark: Regex vs AI Extraction
 *
 * Runs regex extraction on the gold dataset and measures:
 * - Latency per case
 * - Field extraction rates
 * - Average fields extracted
 *
 * AI extraction can only be benchmarked with a running server (requires API keys).
 * This script benchmarks the regex path offline.
 *
 * Usage:
 *   node scripts/benchmark-extraction.js
 *   node scripts/benchmark-extraction.js --verbose
 */

const path = require("path");

// Register path aliases for @/ imports
try {
  require("tsconfig-paths").register({
    baseUrl: path.resolve(__dirname, ".."),
    paths: { "@/*": ["src/*"] },
  });
} catch {
  console.warn(
    "tsconfig-paths not available. Run: npm install -D tsconfig-paths",
  );
  process.exit(1);
}

// Register ts-node for TypeScript imports
try {
  require("ts-node").register({
    transpileOnly: true,
    compilerOptions: {
      module: "commonjs",
      target: "es2020",
      esModuleInterop: true,
    },
  });
} catch {
  console.warn("ts-node not available. Run: npm install -D ts-node");
  process.exit(1);
}

const verbose = process.argv.includes("--verbose");

async function main() {
  console.log("=== Extraction Performance Benchmark ===\n");

  const { GOLD_DATASET } = require("../src/__tests__/lib/data/evaluationGoldDataset");
  const { ResumeDataExtractor } = require("../src/lib/services/resumeDataExtractor");
  const { ResumeIntakeNormalizer } = require("../src/lib/services/resumeIntakeNormalizer");

  const cases = GOLD_DATASET;
  console.log(`Gold dataset: ${cases.length} cases\n`);

  const results = [];

  for (const goldCase of cases) {
    const start = performance.now();
    let data, extractedFields;

    if (goldCase.category === "paste" || goldCase.category === "pdf") {
      const text = goldCase.pasteText ?? "";
      const { draft } = ResumeIntakeNormalizer.normalize({
        sources: [{ channel: goldCase.category, text }],
      });
      data = draft.extractedData;
      extractedFields = draft.extractedFields;
    } else {
      const messages = goldCase.messages ?? [];
      const result = ResumeDataExtractor.extractFromConversation(messages);
      data = result.data;
      extractedFields = result.extractedFields;
    }

    const elapsed = performance.now() - start;

    results.push({
      id: goldCase.id,
      category: goldCase.category,
      latencyMs: elapsed,
      fields: extractedFields.length,
      hasName: !!data.name,
      hasEmail: !!data.email,
      hasSkills: Array.isArray(data.skills) && data.skills.length > 0,
      hasExpOrEdu:
        (Array.isArray(data.experience) && data.experience.length > 0) ||
        (Array.isArray(data.education) && data.education.length > 0),
    });

    if (verbose) {
      console.log(
        `  ${goldCase.id}: ${elapsed.toFixed(1)}ms, ${extractedFields.length} fields`,
      );
    }
  }

  // Aggregate metrics
  const total = results.length;
  const avgLatency =
    results.reduce((sum, r) => sum + r.latencyMs, 0) / total;
  const p50Latency = results
    .map((r) => r.latencyMs)
    .sort((a, b) => a - b)[Math.floor(total * 0.5)];
  const p95Latency = results
    .map((r) => r.latencyMs)
    .sort((a, b) => a - b)[Math.floor(total * 0.95)];
  const nameRate = (results.filter((r) => r.hasName).length / total) * 100;
  const emailRate = (results.filter((r) => r.hasEmail).length / total) * 100;
  const skillsRate = (results.filter((r) => r.hasSkills).length / total) * 100;
  const expEduRate =
    (results.filter((r) => r.hasExpOrEdu).length / total) * 100;
  const avgFields = results.reduce((sum, r) => sum + r.fields, 0) / total;

  console.log("\n=== REGEX EXTRACTION BENCHMARK ===");
  console.table({
    totalCases: total,
    avgLatencyMs: `${avgLatency.toFixed(2)}ms`,
    p50LatencyMs: `${p50Latency.toFixed(2)}ms`,
    p95LatencyMs: `${p95Latency.toFixed(2)}ms`,
    nameExtractionRate: `${nameRate.toFixed(1)}%`,
    emailExtractionRate: `${emailRate.toFixed(1)}%`,
    skillsExtractionRate: `${skillsRate.toFixed(1)}%`,
    expOrEduRate: `${expEduRate.toFixed(1)}%`,
    avgFieldsExtracted: avgFields.toFixed(1),
  });

  // Category breakdown
  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catAvg =
      catResults.reduce((sum, r) => sum + r.latencyMs, 0) / catResults.length;
    console.log(`  ${cat}: ${catResults.length} cases, avg ${catAvg.toFixed(2)}ms`);
  }

  console.log("\n✅ Benchmark complete.");
}

main().catch(console.error);
