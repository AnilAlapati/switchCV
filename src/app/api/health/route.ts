import { NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";

type ServiceStatus = {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
};

const shouldBypassChecks = () =>
  process.env.NODE_ENV === "test" &&
  process.env.HEALTHCHECK_RUN_FULL !== "true";

async function checkFirestore(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  const start = Date.now();
  try {
    await adminDb.collection("monitoring").limit(1).get();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown Firestore error",
    };
  }
}

async function checkGemini(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: "error", error: "Missing GEMINI_API_KEY" };
  }

  const start = Date.now();
  try {
    const response = await fetch(
      AI_ENDPOINTS.GEMINI.MODELS(apiKey),
      {
        method: "GET",
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) {
      return {
        status: "error",
        error: `Gemini API error: ${response.status}`,
      };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown Gemini error",
    };
  }
}

async function checkEmail(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      status: "error",
      error: "Missing SMTP configuration",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const start = Date.now();
  try {
    await transporter.verify();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error ? error.message : "SMTP verification failed",
    };
  }
}

export async function GET() {
  const [firestore, ai, email] = await Promise.all([
    checkFirestore(),
    checkGemini(),
    checkEmail(),
  ]);

  const services = { firestore, ai, email };
  const allHealthy = Object.values(services).every(
    (service) => service.status === "ok"
  );

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
