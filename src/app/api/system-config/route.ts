import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  defaultSystemConfig,
  mergeWithDefaultConfig,
  type SystemConfig,
} from "@/lib/system-config";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("config").doc("system").get();
    const config = snapshot.exists
      ? mergeWithDefaultConfig(snapshot.data() as Partial<SystemConfig>)
      : defaultSystemConfig;

    return NextResponse.json({
      config,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "Unable to fetch system configuration");
  }
}
