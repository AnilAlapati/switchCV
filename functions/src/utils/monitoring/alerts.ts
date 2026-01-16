/**
 * Alert Management
 *
 * @module utils/monitoring/alerts
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Metric, MetricType, AlertThreshold } from "./types";
import { emailService } from "../../services/emailService";

/**
 * Alert manager for monitoring thresholds
 */
export class AlertManager {
  private db: FirebaseFirestore.Firestore;
  private thresholds: Map<string, AlertThreshold> = new Map();
  private alertCooldowns: Map<string, number> = new Map();
  private readonly cooldownMs = 3600000; // 1 hour

  constructor() {
    this.db = admin.firestore();
    this.loadThresholds();
  }

  /**
   * Load alert thresholds from Firestore
   *
   * Fetches the 'alertThresholds' document from the 'config' collection
   * and updates the local thresholds map.
   *
   * @returns {Promise<void>} A promise that resolves when thresholds are loaded
   */
  private async loadThresholds(): Promise<void> {
    try {
      const snapshot = await this.db
        .collection("config")
        .doc("alertThresholds")
        .get();

      if (snapshot.exists) {
        const data = snapshot.data() as Record<string, AlertThreshold>;
        this.thresholds = new Map(Object.entries(data));
      }
    } catch (error) {
      functions.logger.error("Failed to load alert thresholds", { error });
    }
  }

  /**
   * Check metric against thresholds and send alerts
   *
   * Evaluates a metric against defined thresholds. If a threshold is exceeded
   * and the alert is not in cooldown, it triggers an alert notification.
   *
   * @param {Metric} metric - The metric to evaluate
   * @returns {Promise<void>} A promise that resolves when the check is complete
   */
  async checkAndAlert(metric: Metric): Promise<void> {
    const key = `${metric.type}_${metric.name}`;

    if (!this.thresholds.has(key)) {
      return;
    }

    const threshold = this.thresholds.get(key)!;

    // Check if alert is within cooldown period
    const lastAlertTime = this.alertCooldowns.get(key) || 0;
    if (Date.now() - lastAlertTime < this.cooldownMs) {
      return;
    }

    // Check if metric exceeds threshold
    let triggered = false;

    switch (threshold.condition) {
      case "above":
        triggered = metric.value > threshold.value;
        break;
      case "below":
        triggered = metric.value < threshold.value;
        break;
      case "equals":
        triggered = metric.value === threshold.value;
        break;
    }

    if (triggered) {
      await this.sendAlert(metric, threshold);
      this.alertCooldowns.set(key, Date.now());
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(
    metric: Metric,
    threshold: AlertThreshold
  ): Promise<void> {
    const message = `
      Alert: ${metric.name} threshold exceeded
      Type: ${metric.type}
      Value: ${metric.value} ${metric.unit}
      Threshold: ${threshold.condition} ${threshold.value}
      Timestamp: ${new Date(metric.timestamp).toISOString()}
    `;

    try {
      // Log alert
      functions.logger.warn("Alert triggered", {
        metric: metric.name,
        type: metric.type,
        value: metric.value,
        threshold: threshold.value,
      });

      // Send email if configured
      if (threshold.notifyEmail) {
        await emailService.sendCustomEmail({
          to: threshold.notifyEmail,
          subject: `Alert: ${metric.name}`,
          html: message,
        });
      }

      // Store alert in Firestore
      await this.db.collection("alerts").add({
        metric: metric.name,
        type: metric.type,
        value: metric.value,
        threshold: threshold.value,
        condition: threshold.condition,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message,
      });
    } catch (error) {
      functions.logger.error("Failed to send alert", { error });
    }
  }

  /**
   * Register a new alert threshold
   */
  async registerThreshold(threshold: AlertThreshold): Promise<void> {
    const key = `${threshold.metricType}_${threshold.metricType}`;
    this.thresholds.set(key, threshold);

    try {
      await this.db
        .collection("config")
        .doc("alertThresholds")
        .update({
          [key]: threshold,
        });
    } catch (error) {
      functions.logger.error("Failed to register alert threshold", { error });
    }
  }

  /**
   * Remove an alert threshold
   */
  async removeThreshold(metricType: MetricType, name: string): Promise<void> {
    const key = `${metricType}_${name}`;
    this.thresholds.delete(key);

    try {
      await this.db
        .collection("config")
        .doc("alertThresholds")
        .update({
          [key]: admin.firestore.FieldValue.delete(),
        });
    } catch (error) {
      functions.logger.error("Failed to remove alert threshold", { error });
    }
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(
    timeWindowMs: number = 24 * 60 * 60 * 1000
  ): Promise<any[]> {
    const startTime = Date.now() - timeWindowMs;

    try {
      const snapshot = await this.db
        .collection("alerts")
        .where("timestamp", ">=", new Date(startTime))
        .orderBy("timestamp", "desc")
        .get();

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      functions.logger.error("Failed to get active alerts", { error });
      return [];
    }
  }
}
