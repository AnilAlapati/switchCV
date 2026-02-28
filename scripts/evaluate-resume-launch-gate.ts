#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import {
  evaluateLaunchGate,
  type LaunchEvaluationCase,
} from "../src/lib/services/resumeEvaluationHarness";

interface CliOptions {
  dataset: string;
  out?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--dataset" && next) {
      options.dataset = next;
      i += 1;
      continue;
    }

    if (arg === "--out" && next) {
      options.out = next;
      i += 1;
      continue;
    }
  }

  if (!options.dataset) {
    throw new Error(
      "Missing --dataset <path>. Example: tsx scripts/evaluate-resume-launch-gate.ts --dataset tests/fixtures/resume-launch-cases.json",
    );
  }

  return options as CliOptions;
}

function loadDataset(datasetPath: string): LaunchEvaluationCase[] {
  const absolutePath = path.resolve(datasetPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Dataset not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Dataset must be a JSON array");
  }

  return parsed as LaunchEvaluationCase[];
}

function writeOutput(outputPath: string, summary: unknown): void {
  const absolutePath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(summary, null, 2)}\n`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const dataset = loadDataset(options.dataset);
  const summary = evaluateLaunchGate(dataset);

  console.log(JSON.stringify(summary, null, 2));

  if (options.out) {
    writeOutput(options.out, summary);
    console.log(`Saved summary to ${path.resolve(options.out)}`);
  }

  if (!summary.passed) {
    process.exit(1);
  }
}

main();
