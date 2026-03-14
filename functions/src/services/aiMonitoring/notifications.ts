import { emailService } from "../emailService";
import type { AIIncident, PersistedAIIncident } from "./types";
import { SUPPORT_EMAIL } from "./types";

export async function sendIncidentEmail(
  incident: AIIncident,
  now: Date,
): Promise<void> {
  const details = Object.entries(incident.details)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${value}</li>`)
    .join("");

  const requestIds = incident.requestIds.length
    ? incident.requestIds.map((requestId) => `<li>${requestId}</li>`).join("")
    : "<li>None available</li>";

  const subject = `[SWITCHCV ALERT] ${incident.title}`;
  const html = `
    <h2>${incident.title}</h2>
    <p>${incident.summary}</p>
    <p><strong>Severity:</strong> ${incident.severity}</p>
    <p><strong>Environment:</strong> production</p>
    <p><strong>Detected:</strong> ${now.toISOString()}</p>
    <h3>Details</h3>
    <ul>${details}</ul>
    <h3>Representative Request IDs</h3>
    <ul>${requestIds}</ul>
  `;
  const text = [
    incident.title,
    incident.summary,
    `Severity: ${incident.severity}`,
    `Detected: ${now.toISOString()}`,
    `Request IDs: ${incident.requestIds.join(", ") || "None available"}`,
  ].join("\n");

  await emailService.sendCustomEmail({
    to: SUPPORT_EMAIL,
    subject,
    html,
    text,
  });
}

export async function sendRecoveryEmail(
  incident: PersistedAIIncident,
  now: Date,
): Promise<void> {
  const subject = `[SWITCHCV RECOVERY] ${incident.title}`;
  const html = `
    <h2>${incident.title} resolved</h2>
    <p>${incident.summary}</p>
    <ul>
      <li><strong>Started:</strong> ${incident.startedAt.toISOString()}</li>
      <li><strong>Recovered:</strong> ${now.toISOString()}</li>
      <li><strong>Representative request IDs:</strong> ${incident.requestIds.join(", ") || "None available"}</li>
    </ul>
  `;
  const text = [
    `${incident.title} resolved`,
    incident.summary,
    `Started: ${incident.startedAt.toISOString()}`,
    `Recovered: ${now.toISOString()}`,
    `Request IDs: ${incident.requestIds.join(", ") || "None available"}`,
  ].join("\n");

  await emailService.sendCustomEmail({
    to: SUPPORT_EMAIL,
    subject,
    html,
    text,
  });
}
