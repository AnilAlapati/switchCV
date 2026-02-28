#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";

interface CliOptions {
  input?: string;
  out?: string;
  projectId?: string;
}

interface MetricSnapshot {
  parse_success_rate: number;
  schema_valid_rate: number;
  factual_alignment_score: number;
  avg_regeneration_attempts: number;
  user_manual_edit_rate: number;
}

interface GateResult {
  timestamp: string;
  source: "file" | "firestore";
  metrics: MetricSnapshot;
  launchGatePassed: boolean;
  rollbackTriggered: boolean;
  failures: string[];
}

const REQUIRED_METRICS = [
  "parse_success_rate",
  "schema_valid_rate",
  "factual_alignment_score",
  "avg_regeneration_attempts",
  "user_manual_edit_rate",
] as const;

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--input" && next) {
      options.input = next;
      i += 1;
      continue;
    }

    if (arg === "--out" && next) {
      options.out = next;
      i += 1;
      continue;
    }

    if (arg === "--project" && next) {
      options.projectId = next;
      i += 1;
      continue;
    }
  }

  return options;
}

function writeOutput(outputPath: string, payload: unknown): void {
  const absolutePath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function loadMetricsFromFile(inputPath: string): MetricSnapshot {
  const absolutePath = path.resolve(inputPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const metrics: Partial<MetricSnapshot> = {};
  for (const key of REQUIRED_METRICS) {
    const value = parsed[key];
    if (typeof value !== "number") {
      throw new Error(`Missing numeric metric '${key}' in input file`);
    }
    metrics[key] = value;
  }

  return metrics as MetricSnapshot;
}

function extractNumericMetric(record: Record<string, unknown>): number | null {
  const candidates = [
    record.latestValue,
    record.avgValue,
    record.value,
    record.count,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function loadMetricsFromFirestore(projectId?: string): Promise<MetricSnapshot> {
  if (!admin.apps.length) {
    admin.initializeApp(
      projectId
        ? {
            projectId,
          }
        : undefined,
    );
  }

  const db = admin.firestore();
  const snapshot = await db
    .collection("monitoring")
    .doc("metrics")
    .collection("timeseries")
    .orderBy("date", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("No monitoring metrics found in Firestore");
  }

  const latest = snapshot.docs[0].data() as {
    metrics?: Array<Record<string, unknown>>;
  };

  const rows = Array.isArray(latest.metrics) ? latest.metrics : [];
  const mapped = new Map<string, number>();

  for (const row of rows) {
    const name = typeof row.name === "string" ? row.name : "";
    const value = extractNumericMetric(row);
    if (!name || value === null) {
      continue;
    }
    mapped.set(name, value);
  }

  const metrics: Partial<MetricSnapshot> = {};
  for (const key of REQUIRED_METRICS) {
    const value = mapped.get(key);
    if (typeof value !== "number") {
      throw new Error(`Missing metric '${key}' in latest Firestore timeseries`);
    }
    metrics[key] = value;
  }

  return metrics as MetricSnapshot;
}

function evaluateGate(metrics: MetricSnapshot): GateResult {
  const failures: string[] = [];

  if (metrics.parse_success_rate < 95) {
    failures.push(`parse_success_rate ${metrics.parse_success_rate}% < 95%`);
  }
  if (metrics.schema_valid_rate < 95) {
    failures.push(`schema_valid_rate ${metrics.schema_valid_rate}% < 95%`);
  }
  if (metrics.factual_alignment_score < 90) {
    failures.push(`factual_alignment_score ${metrics.factual_alignment_score}% < 90%`);
  }
  if (metrics.avg_regeneration_attempts > 1.3) {
    failures.push(
      `avg_regeneration_attempts ${metrics.avg_regeneration_attempts} > 1.3`,
    );
  }
  if (metrics.user_manual_edit_rate > 40) {
    failures.push(`user_manual_edit_rate ${metrics.user_manual_edit_rate}% > 40%`);
  }

  const launchGatePassed =
    metrics.parse_success_rate >= 95 &&
    metrics.schema_valid_rate >= 95 &&
    metrics.factual_alignment_score >= 90;

  const rollbackTriggered =
    metrics.schema_valid_rate < 95 ||
    metrics.factual_alignment_score < 90 ||
    metrics.user_manual_edit_rate > 40 ||
    metrics.parse_success_rate < 95;

  return {
    timestamp: new Date().toISOString(),
    source: "file",
    metrics,
    launchGatePassed,
    rollbackTriggered,
    failures,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  let metrics: MetricSnapshot;
  let source: "file" | "firestore" = "file";

  if (options.input) {
    metrics = loadMetricsFromFile(options.input);
  } else {
    source = "firestore";
    metrics = await loadMetricsFromFirestore(options.projectId);
  }

  const result = evaluateGate(metrics);
  result.source = source;

  console.log(JSON.stringify(result, null, 2));

  if (options.out) {
    writeOutput(options.out, result);
    console.log(`Saved KPI gate result to ${path.resolve(options.out)}`);
  }

  if (result.failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
