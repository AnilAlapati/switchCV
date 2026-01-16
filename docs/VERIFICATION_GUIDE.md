# Agentic Resume System: Verification & Metrics Guide

This guide explains how to verify that the Agentic Resume System is working correctly and how to track its metrics.

## 1. Operational Verification

To ensure the backend is functioning:

### A. Check Cloud Function Logs
1.  Go to the **Firebase Console** -> **Functions** -> **Logs**.
2.  Search for "Agentic Workflow".
3.  **Success Signs**:
    -   `Starting Agentic Workflow for {userId}`
    -   `Agentic Planning Complete`
    -   `Start Execution...`
    -   **No** `Agentic workflow failed` errors.

### B. Verify User Usage Limit
Pass/Fail criteria for the 5-run free limit.
1.  Go to **Firestore** -> `users` -> `{userId}`.
2.  Check the `agentic` map:
    -   `usageCount`: Should increment by 1 after each generation.
    -   `lastRunAt`: Should match the latest run time.
3.  **Test**: Try running a 6th time. It should fail or return a limit message.

### C. Verify Cost Tracking
1.  Go to **Firestore** -> `system` -> `billing`.
2.  Check `totalCost`: Should increase by ~$0.005 (or your configured `ESTIMATED_COST_PER_RUN`) after each run.

## 2. Metric Verification

### A. "Quality" Metric
**Note:** Currently, the `quality` score displayed in the dashboard is **not** automatically calculated by the Agentic Resume Generator. It defaults to `0` or requires a separate "Resume Review" step (if implemented).
-   *Action Item:* If you want automated quality scoring, we need to add a "Judge" agent step to the workflow.

### B. Engagement Metrics (Public View)
When a resume is shared and viewed:
1.  Go to **Firestore** -> `analytics` -> `{resumeId}`.
2.  Check:
    -   `views.count`: Increments on page load.
    -   `views.uniqueViewers`: Tracks unique IP/Session.
    -   `engagement.avgSessionDuration`: Updates based on time spent.

## 3. Automated Testing
Run the integration tests to verify the UI flow:
```bash
npm run test src/__tests__/flows/resume-generation-integration.test.tsx
```
*Note: This mocks the AI response, so it tests the app logic, not the AI's actual output quality.*
