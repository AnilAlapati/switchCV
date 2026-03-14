import * as functions from "firebase-functions/v1";
import { aggregateAiMonitoring } from "../services/aiMonitoringService";

export async function aggregateAiMonitoringHandler(
  context: functions.EventContext,
): Promise<{
  alertsSent: number;
  recoveriesSent: number;
  activeIncidents: number;
  dateKey: string;
}> {
  void context;
  return aggregateAiMonitoring();
}
