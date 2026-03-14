import * as functions from "firebase-functions/v1";
import { sendAiMonitoringDigest } from "../services/aiMonitoringService";

export async function sendAiMonitoringDigestHandler(
  context: functions.EventContext,
): Promise<{
  sent: boolean;
  dateKey: string;
  unresolvedIncidents: number;
}> {
  void context;
  return sendAiMonitoringDigest();
}
