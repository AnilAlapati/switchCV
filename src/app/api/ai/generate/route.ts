// API Route for AI text generation
// This runs server-side, avoiding CORS and keeping API keys secure

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import admin, { adminAuth, adminDb } from "@/lib/firebase-admin";

interface GenerateRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication Check
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      console.error("Token verification failed:", error);
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    const body: GenerateRequest = await request.json();
    const { prompt, maxTokens = 150, temperature = 0.9 } = body;

    // 2. Input Validation
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

    // 3. Rate Limiting (Firestore)
    const rateLimitRef = adminDb.collection("rateLimits").doc(userId);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 requests per minute

    const rateLimitDoc = await rateLimitRef.get();
    let currentCount = 0;
    let windowStart = now;

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      if (data && data.timestamp > now - windowMs) {
        currentCount = data.count;
        windowStart = data.timestamp;
      }
    }

    if (currentCount >= maxRequests) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await rateLimitRef.set({
      count: currentCount + 1,
      timestamp: windowStart,
      userId,
    });

    const result = await generateText(prompt, maxTokens, temperature);

    // 4. Audit Logging
    await adminDb.collection("aiAuditLogs").add({
      userId,
      prompt: prompt.substring(0, 500), // Log truncated prompt
      model: result.model,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "success",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
