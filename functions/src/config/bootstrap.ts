import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { config } from ".";
import { performanceMonitor } from "../utils/monitoring";

let initialized = false;

export function bootstrap(): void {
  if (initialized) {
    return;
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
