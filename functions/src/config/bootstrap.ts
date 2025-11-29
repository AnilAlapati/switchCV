import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { config } from ".";
import { performanceMonitor } from "../utils/monitoring";

let initialized = false;

export function bootstrap(): void {
  if (initialized) {
    return;
  }

  // Load Firebase Config into process.env (for Gen 1 functions compatibility)
  try {
    const firebaseConfig = (functions.config as any)();
    if (firebaseConfig.smtp) {
      process.env.SMTP_HOST = firebaseConfig.smtp.host || process.env.SMTP_HOST;
      process.env.SMTP_PORT = firebaseConfig.smtp.port || process.env.SMTP_PORT;
      process.env.SMTP_USER = firebaseConfig.smtp.user || process.env.SMTP_USER;
      process.env.SMTP_PASS = firebaseConfig.smtp.pass || process.env.SMTP_PASS;
    }
  } catch (e) {
    console.warn("Failed to load firebase config", e);
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const environment = config.get("app", "environment");
  functions.logger.info("SwitchCV Cloud Functions bootstrap complete", {
    environment,
    pendingMetrics: performanceMonitor.getMetricsSummary().pending,
  });

  initialized = true;
}

bootstrap();
