import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { config } from ".";
import { performanceMonitor } from "../utils/monitoring";
import { configLoader } from "../lib/configLoader";

let initialized = false;

export function bootstrap(): void {
  if (initialized) {
    return;
  }

  // Load Firebase Config into process.env (for Gen 1 functions compatibility)
  try {
    const firebaseConfig = configLoader.getConfig();
    if (firebaseConfig.smtp) {
      process.env.SMTP_HOST = firebaseConfig.smtp.host || process.env.SMTP_HOST;
      process.env.SMTP_PORT =
        String(firebaseConfig.smtp.port) || process.env.SMTP_PORT;
      process.env.SMTP_USER = firebaseConfig.smtp.user || process.env.SMTP_USER;
      process.env.SMTP_PASS = firebaseConfig.smtp.pass || process.env.SMTP_PASS;
    }

    // Log which config mode is active
    functions.logger.info("Bootstrap: Configuration loaded", {
      mode: configLoader.getMode(),
      hasSMTP: !!firebaseConfig.smtp,
    });
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
    configMode: configLoader.getMode(),
  });

  initialized = true;
}

bootstrap();
