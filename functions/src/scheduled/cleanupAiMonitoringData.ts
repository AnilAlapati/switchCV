import * as functions from "firebase-functions/v1";
import { cleanupAiMonitoringData } from "../services/aiMonitoringService";

export async function cleanupAiMonitoringDataHandler(
  context: functions.EventContext,
): Promise<{
  rawEventsDeleted: number;
  requestSummariesDeleted: number;
  dailyMetricsDeleted: number;
}> {
  void context;
  return cleanupAiMonitoringData();
}
