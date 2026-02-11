import { NextResponse } from "next/server";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import nodemailer from "nodemailer";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";
import { logger } from "@/lib/logger";

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
    await collectionRef(COLLECTIONS.MONITORING).limit(1).get();
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "Firestore health check failed");
    return {
      status: "error",
    };
  }
}

async function checkGemini(): Promise<ServiceStatus> {
  if (shouldBypassChecks()) {
    return { status: "ok" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { status: "error" };
  }

  const start = Date.now();
  try {
    const response = await fetch(AI_ENDPOINTS.GEMINI.MODELS(apiKey), {
      method: "GET",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      logger.warn(
        { statusCode: response.status },
        "Gemini API health check failed",
      );
      return {
        status: "error",
      };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "Gemini health check failed");
    return {
      status: "error",
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
    logger.error({ err: error }, "Email health check failed");
    return {
      status: "error",
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
    (service) => service.status === "ok",
  );

  // Only return status per service — no error details, no uptime, no infra info
  const sanitizedServices = Object.fromEntries(
    Object.entries(services).map(([key, svc]) => [
      key,
      { status: svc.status, latencyMs: svc.latencyMs },
    ]),
  );

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: sanitizedServices,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
