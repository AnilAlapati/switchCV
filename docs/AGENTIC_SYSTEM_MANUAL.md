# Agentic System Manual

## 1. System Overview
The Agentic Resume System transforms standard resume generation into a two-step agentic workflow:
1.  **Planning Agent (`gemini-1.5-pro`)**: Analyzes the Job Description and User Resume to create a strategic tailoring plan.
2.  **Execution Agent (`gemini-1.5-flash` / `pro`)**: Rewrites the resume content strictly adhering to the plan.

This system is built for **Safety**, **Scalability**, and **Cost Control**.

## 2. Key Components

### Backend (Cloud Functions)
-   **`functions/src/agentOrchestrator.ts`**: The core brain.
    -   Checks `system/config` for `agentic.enabled`.
    -   Checks user budget/quota.
    -   Selects models (Hybrid strategy: Pro for brains, Flash for speed/cost).
    -   Executes the 2-step prompt chain.
    -   **Fallback**: If any step fails, it returns `null`, triggering the legacy `generateText` fallback in `resumeService.ts`.
-   **`functions/src/adminService.ts`**:
    -   Watches `system/admins/whitelist/{email}`.
    -   Auto-promotes/demotes Admins based on document presence.

### Database (Firestore)
-   **`system/config`**: Global configuration.
    -   `agentic.enabled`: Master kill switch.
    -   `agentic.budgetCap`: Monthly hard cap ($70).
-   **`system/billing`**: Aggregated cost metrics.
-   **`users/{userId}`**:
    -   `agentic.usageCount`: Tracks number of agent runs.
    -   `role`: 'jobseeker', 'recruiter', or 'admin'.

### Frontend (Next.js)
-   **`src/components/dashboard/AgentStatus.tsx`**: Displays "Free Runs Left" (Limit: 5).
-   **`src/app/admin/page.tsx`**: Real-time cost monitoring dashboard (Admin only).

## 3. Configuration & Limits

| Config | Location | Default | Description |
| :--- | :--- | :--- | :--- |
| **Kill Switch** | Firestore: `system/config` | `enabled: true` | Set to `false` to instantly disable all agents. |
| **Budget Cap** | Firestore: `system/config` | `$70.00` | System halts if `system/billing.totalCost` > `budgetCap`. |
| **User Limit** | Code: `config.client.ts` | `5` Runs | Free tier limit. Premium is unlimited. |

## 4. How to...

### Manage Admins
**Do NOT use scripts.**
1.  Go to Firebase Console -> Firestore.
2.  Navigate to `system/admins/whitelist`.
3.  **Add Admin**: Create a document with ID = `user@email.com`.
4.  **Remove Admin**: Delete the document.

### Change Agent Prompts
Edit `functions/src/agentOrchestrator.ts`:
-   `planningPrompt`: Controls the strategy phase.
-   `executionPrompt`: Controls the writing phase.
*Note: You must deploy functions (`npm run deploy:functions`) after changing prompts.*

### monitor Costs
1.  Go to `https://switchcv.com/admin` (or localhost).
2.  Login with an Admin account.
3.  View the "Agentic Spend" card.

## 5. Deployment
-   **Dev**: `./scripts/deploy-dev.sh` (Deploys Functions only).
-   **Prod**: `./scripts/deploy-prod.sh` (Deploys Full Stack).

## 6. Troubleshooting
-   **"Agentic Workflow Disabled"**: Check Firestore `system/config.agentic.enabled`.
-   **"Quota Exceeded"**: User has hit the 5-run limit. Upgrade to Premium or manually reset `agentic.usageCount` in their user doc.
-   **"Budget Exceeded"**: The global $70 cap is hit. Increase `budgetCap` in `system/config` if intended.
