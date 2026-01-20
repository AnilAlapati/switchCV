#!/usr/bin/env tsx
/**
 * Daily monitoring digest
 *
 * Summarizes the last 24 hours of monitoring alerts + metrics and emails support@switchcv.com.
 */

import admin from "firebase-admin";
import nodemailer from "nodemailer";

const DEFAULT_PROJECT_ID = "switchcv-e5136";
const DEFAULT_DIGEST_RECIPIENT = "support@switchcv.com";
const DEFAULT_SUBJECT_PREFIX = "[SWITCHCV DIGEST]";

interface AlertRecord {
  severity: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: admin.firestore.Timestamp;
}

interface MetricRecord {
  name: string;
  type: string;
  count: number;
  avgValue: number;
  errorCount?: number;
}

function initializeFirebase(): admin.firestore.Firestore {
  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;

  if (!admin.apps.length) {
    admin.initializeApp({ projectId });
  }

  return admin.firestore();
}


function createTransport() {
  const host = process.env.SMTP_HOST || "smtp.titan.email";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER || DEFAULT_DIGEST_RECIPIENT;
  const pass = process.env.SMTP_PASS || "";

  if (!pass) {
    throw new Error("Missing SMTP_PASS for daily digest");
  }

  console.log(`📧 Configuring SMTP transport: ${host}:${port} (${user})`);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    // Add timeouts to fail faster if connection is stuck
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000, // 5 seconds
    socketTimeout: 10000, // 10 seconds
  });
}

async function fetchRecentAlerts(
  db: admin.firestore.Firestore
): Promise<AlertRecord[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const snapshot = await db
      .collection("monitoring")
      .doc("alerts")
      .collection("active")
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(since))
      .orderBy("timestamp", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as AlertRecord);
  } catch (error) {
    console.error("Failed to pull alerts:", error);
    return [];
  }
}

async function fetchLatestMetrics(
  db: admin.firestore.Firestore
): Promise<{ metrics: MetricRecord[]; generatedAt?: Date }> {
  try {
    const snapshot = await db
      .collection("monitoring")
      .doc("metrics")
      .collection("timeseries")
      .orderBy("date", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { metrics: [] };
    }

    const record = snapshot.docs[0].data();
    const metrics = (record.metrics as MetricRecord[]) || [];
    const generatedAt = record.date?.toDate?.() ?? new Date();
    return { metrics, generatedAt };
  } catch (error) {
    console.error("Failed to pull metrics:", error);
    return { metrics: [] };
  }
}

function buildDigestHtml(
  alerts: AlertRecord[],
  metrics: MetricRecord[],
  dateLabel: string
) {
  const alertSection = alerts.length
    ? `<ul>${alerts
      .slice(0, 10)
      .map((alert) => {
        const ts = alert.timestamp?.toDate?.()?.toISOString?.() ?? "unknown";
        const meta = alert.metadata
          ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>`
          : "<em>No metadata</em>";
        return `<li><strong>${alert.severity?.toUpperCase?.() || "UNKNOWN"
          }</strong> — ${alert.title}<br/><small>${ts}</small><p>${alert.message
          }</p>${meta}</li>`;
      })
      .join("")}</ul>`
    : "<p>No alerts in the last 24 hours 🎉</p>";

  const metricRows = metrics
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10)
    .map(
      (metric) => `
        <tr>
          <td>${metric.type}</td>
          <td>${metric.name}</td>
          <td style="text-align:right;">${metric.count || 0}</td>
          <td style="text-align:right;">${metric.avgValue?.toFixed?.(2) ?? "0"
        }</td>
          <td style="text-align:right;">${metric.errorCount || 0}</td>
        </tr>`
    )
    .join("");

  const metricSection = metrics.length
    ? `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th align="left">Type</th>
            <th align="left">Name</th>
            <th align="right">Count</th>
            <th align="right">Avg (ms)</th>
            <th align="right">Errors</th>
          </tr>
        </thead>
        <tbody>${metricRows}</tbody>
      </table>
    `
    : "<p>No metrics recorded.</p>";

  return `
    <div style="font-family:Arial,sans-serif;max-width:700px;">
      <h1>SwitchCV Monitoring Digest · ${dateLabel}</h1>
      <h2>Alerts (${alerts.length})</h2>
      ${alertSection}
      <h2>Latest Metrics</h2>
      ${metricSection}
    </div>
  `;
}

function buildDigestText(
  alerts: AlertRecord[],
  metrics: MetricRecord[],
  dateLabel: string
) {
  const alertsText = alerts
    .slice(0, 10)
    .map((alert) => {
      const ts = alert.timestamp?.toDate?.()?.toISOString?.() ?? "unknown";
      return `- [${alert.severity?.toUpperCase?.() || "UNKNOWN"}] ${alert.title
        } (${ts})\n  ${alert.message}`;
    })
    .join("\n");

  const metricsText = metrics
    .slice(0, 10)
    .map(
      (metric) =>
        `- ${metric.type} :: ${metric.name} :: count=${metric.count || 0
        }, avg=${metric.avgValue?.toFixed?.(2) ?? "0"}ms, errors=${metric.errorCount || 0
        }`
    )
    .join("\n");

  return `SwitchCV Monitoring Digest (${dateLabel})\n\nAlerts (${alerts.length
    })\n${alertsText || "  None"}\n\nMetrics\n${metricsText || "  None"}`;
}

async function main() {
  console.log("🚀 Starting daily digest script...");

  try {
    console.log("🔥 Initializing Firebase...");
    const db = initializeFirebase();

    console.log("📊 Fetching alerts and metrics...");
    const [alerts, metricResult] = await Promise.all([
      fetchRecentAlerts(db),
      fetchLatestMetrics(db),
    ]);
    console.log(`✅ Fetched ${alerts.length} alerts and ${metricResult.metrics.length} metrics (generated at ${metricResult.generatedAt?.toISOString()})`);

    const digestDate = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date());

    const html = buildDigestHtml(alerts, metricResult.metrics, digestDate);
    const text = buildDigestText(alerts, metricResult.metrics, digestDate);

    const transporter = createTransport();
    const recipient = process.env.DIGEST_EMAIL_TO || DEFAULT_DIGEST_RECIPIENT;
    const prefix = process.env.DIGEST_SUBJECT_PREFIX || DEFAULT_SUBJECT_PREFIX;

    console.log("🔌 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    console.log(`📨 Sending digest to ${recipient}...`);
    await transporter.sendMail({
      from: `${process.env.SMTP_USER || "SwitchCV"} <${process.env.SMTP_USER || DEFAULT_DIGEST_RECIPIENT
        }>`,
      to: recipient,
      subject: `${prefix} ${digestDate}`,
      html,
      text,
    });

    console.log(`✅ Digest sent successfully to ${recipient}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to send daily digest:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
