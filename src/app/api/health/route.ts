import { NextResponse } from "next/server";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

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
    const response = await withTimeout(
      fetch(AI_ENDPOINTS.GEMINI.MODELS(apiKey), {
        method: "GET",
        next: { revalidate: 0 },
      }),
      5000,
      "Gemini health check",
    );

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

  const start = Date.now();
  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await withTimeout(transporter.verify(), 5000, "SMTP health check");
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    logger.error({ err: error }, "Email health check failed");
    return {
      status: "error",
    };
  }
}

export async function GET() {
  // Run checks sequentially to reduce peak memory pressure in SSR containers.
  const firestore = await checkFirestore();
  const ai = await checkGemini();
  const email = await checkEmail();

  const services = { firestore, ai, email };
  const allHealthy = Object.values(services).every(
    (service) => service.status === "ok",
  );
  const criticalHealthy = firestore.status === "ok";

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
    { status: criticalHealthy ? 200 : 503 },
  );
}
