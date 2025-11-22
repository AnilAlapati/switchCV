import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateText } from "@/lib/services/aiGenerationService";
import admin, { adminAuth, adminDb } from "@/lib/firebase-admin";

interface GenerateRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface Entitlement {
  plan: "basic" | "premium" | "enterprise" | string;
}

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}

export class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000
);
const BASE_LIMIT = Math.max(
  1,
  Number(
    process.env.RATE_LIMIT_AI_GENERATION ||
      process.env.NEXT_PUBLIC_RATE_LIMIT_AI_GENERATION ||
      10
  )
);
const PLAN_MULTIPLIER: Record<string, number> = {
  basic: 0.3,
  premium: 1,
  enterprise: 2,
};

const log = (
  level: "info" | "warn" | "error",
  message: string,
  meta: Record<string, unknown> = {}
) => {
  const payload = { level, message, ...meta };
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
};

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorized("Missing or invalid token");
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyToken(token);
    const userId = decodedToken.uid;

    const body: GenerateRequest = await request.json();
    const { prompt, maxTokens = 150, temperature = 0.9 } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt exceeds maximum length of 2000 characters" },
        { status: 400 }
      );
    }

    const entitlement = await getEntitlement(userId);
    enforceEntitlement(entitlement);

    const rateLimit = await enforceRateLimit(userId, entitlement.plan);

    const result = await generateText(prompt, maxTokens, temperature);

    await Promise.all([
      logUsage({
        userId,
        prompt,
        model: result.model,
        plan: entitlement.plan,
        maxTokens,
        temperature,
      }),
      logAuditEvent({
        userId,
        prompt,
        model: result.model,
        status: "success",
        requestId,
      }),
    ]);

    const response = NextResponse.json(result, { status: 200 });
    attachRateLimitHeaders(response, rateLimit);
    log("info", "AI text generation succeeded", {
      userId,
      model: result.model,
      plan: entitlement.plan,
      requestId,
    });
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

async function verifyToken(token: string) {
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    log("warn", "Token verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AuthenticationError("Invalid token");
  }
}

async function getEntitlement(userId: string): Promise<Entitlement> {
  const snapshot = await adminDb.collection("users").doc(userId).get();
  const data = snapshot.data();
  return {
    plan: (data?.subscriptionTier as string) || "basic",
  };
}

function enforceEntitlement(entitlement: Entitlement): void {
  if (entitlement.plan === "basic") {
    throw new EntitlementError(
      "AI text generation requires a premium or enterprise plan."
    );
  }
}

async function enforceRateLimit(userId: string, plan: string) {
  const planLimit = Math.max(
    1,
    Math.round(BASE_LIMIT * (PLAN_MULTIPLIER[plan] ?? PLAN_MULTIPLIER.basic))
  );
  const windowStartThreshold = Date.now() - RATE_LIMIT_WINDOW_MS;
  const docRef = adminDb
    .collection("rateLimits")
    .doc(`ai_generation_${userId}`);

  const { remaining, resetTime } = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    let count = 0;
    let windowStart = Date.now();

    if (doc.exists) {
      const data = doc.data();
      const storedWindowStart =
        data?.windowStart instanceof admin.firestore.Timestamp
          ? data.windowStart.toMillis()
          : typeof data?.windowStart === "number"
          ? data.windowStart
          : windowStart;

      if (storedWindowStart > windowStartThreshold) {
        windowStart = storedWindowStart;
        count = data?.count || 0;
      } else {
        windowStart = Date.now();
        count = 0;
      }
    }

    if (count >= planLimit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000)
      );
      throw new RateLimitError(retryAfterSeconds);
    }

    tx.set(
      docRef,
      {
        userId,
        scope: "ai_generation",
        plan,
        count: count + 1,
        windowStart: admin.firestore.Timestamp.fromMillis(windowStart),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          windowStart + RATE_LIMIT_WINDOW_MS * 2
        ),
      },
      { merge: true }
    );

    return {
      remaining: Math.max(0, planLimit - (count + 1)),
      resetTime: windowStart + RATE_LIMIT_WINDOW_MS,
    };
  });

  return { remaining, resetTime, limit: planLimit };
}

function attachRateLimitHeaders(
  response: NextResponse,
  data: { remaining: number; resetTime: number; limit: number }
) {
  response.headers.set("X-RateLimit-Limit", data.limit.toString());
  response.headers.set("X-RateLimit-Remaining", data.remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.floor(data.resetTime / 1000).toString()
  );
}

async function logUsage(params: {
  userId: string;
  prompt: string;
  model: string;
  plan: string;
  maxTokens: number;
  temperature: number;
}) {
  await adminDb.collection("aiUsageLogs").add({
    userId: params.userId,
    plan: params.plan,
    scope: "ai_generation",
    promptChars: params.prompt.length,
    requestedTokens: params.maxTokens,
    temperature: params.temperature,
    model: params.model,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function logAuditEvent(params: {
  userId: string;
  prompt: string;
  model: string;
  status: string;
  requestId: string;
}) {
  await adminDb.collection("aiAuditLogs").add({
    userId: params.userId,
    prompt: params.prompt.substring(0, 500),
    model: params.model,
    status: params.status,
    requestId: params.requestId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function unauthorized(message: string) {
  return NextResponse.json(
    { error: `Unauthorized: ${message}` },
    { status: 401 }
  );
}

function handleRouteError(error: unknown, requestId: string) {
  if (error instanceof RateLimitError) {
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    response.headers.set("Retry-After", error.retryAfterSeconds.toString());
    return response;
  }

  if (error instanceof EntitlementError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof AuthenticationError) {
    return unauthorized(error.message);
  }

  log("error", "AI text generation failed", {
    requestId,
    error: error instanceof Error ? error.message : String(error),
  });

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
