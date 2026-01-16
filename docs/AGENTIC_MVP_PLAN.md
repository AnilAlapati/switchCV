# Agentic MVP Rollout Plan - Growth Budget Strategy

**Date:** January 3, 2026
**Status:** Architecture Locked 🔒
**Target Launch:** 1,000-10,000 users with full features
**Safety Level:** Quadruple-layered (Runtime Config Kill Switch + Sharded Budget Counters + Hard Cap + Per-User Credits)

---

## Executive Summary

We will give **all users** full agentic resume features (Planning → Research → Validation → Polish) to drive growth and conversions to Premium. The experience is gated behind:

1.  **Dynamic Config Flag** (`system/config` in Firestore) — Toggle instantly without deployment.
2.  **Global Budget Cap** ($30/month Soft, $70/month Hard) — Strict limits.
3.  **Sharded Cost Tracking** — scalable, high-throughput billing.
4.  **Per-User Promotional Credits** (3 for Basic users) — Users get 3 free agent runs.

**Win:** Users see powerful AI agents working for them, driving Premium upgrades
**Safety:** Automatic fallback to **current legacy (single-turn) system** if anything breaks
**Rollback:** Firestore update reverts everything to non-agentic version instantly (< 1s)

---

## 1. Cost Model & Financial Safety

### Baseline Token Costs

| Model | Cost/1M Tokens | Per-Resume (4k tokens) |
| :--- | :--- | :--- |
| Gemini 1.5 Flash | $0.075 | $0.0003 |
| Gemini 1.5 Pro | $3.50 | $0.014 |
| Claude 3.5 Haiku | $1.00 | $0.004 |

### Agentic Workflow Token Usage

| Step | Tokens | Cost (Flash) | Cost (Pro) |
| :--- | :--- | :--- | :--- |
| Planning Agent | 3,000 | $0.0002 | $0.010 |
| Research Agent | 2,500 | $0.0002 | $0.009 |
| Question Reflection | 2,000 | $0.00015 | $0.007 |
| Validation (per response) | 1,500 | $0.0001 | $0.005 |
| Polish Agent | 2,000 | $0.00015 | $0.007 |
| **Total (Full Suite)** | **~11,000** | **$0.0008** | **$0.038** |

### Scenario Analysis (Cost/Month)

| Users | Single-Turn | Agentic (Flash) | Agentic (Pro) | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1,000 | $1.60 | $0.80 | $38 | ✅ Safe |
| 10,000 | $16 | $8.00 | $380 | ✅ Safe |
| 100,000 | $160 | $80.00 | $3,800 | 🔴 Stop |

**Financial Strategy & Model Selection:**

*   **Promotional/Free Users**: **Hybrid Strategy**.
    *   **Planning Agent**: Uses **Gemini 1.5 Pro** (The "Brain" - Smarter strategy).
    *   **Execution Agents**: Use **Gemini 1.5 Flash** (The "Muscle" - Fast drafting).
    *   *Result*: High-level intelligence at low cost (~$0.008/resume).
*   **Premium Users**: Can choose **Any Model** (OpenAI GPT-4, Groq Llama, Gemini Pro).
*   **Budget Target**: $30/month (Managed by Hybrid approach).
*   **Hard Kill Switch (Growth/Free)**: $70/month.
*   **Sharded Counters**: Track *only* unrecovered promotional costs (Free tier).

---

## 2. System Architecture

### 2.1 Dynamic Config Toggle (Kill Switch)

**File:** `src/lib/getSystemConfig.ts`

Leverage existing `system/config` document logic.

```typescript
// Add to SystemConfig type
export type SystemConfig = {
  agentic: {
    enabled: boolean;
    budgetCap: number;
    model: string;
  };
  // VIRAL DEFENSE: Global Registration Toggle
  registrations: {
    enabled: boolean; // Set to false to halt new sign-ups
    waitlistMode: boolean; // Optional: Show waitlist instead of 403
  };
};

// Usage in orchestrator & auth
const config = await getSystemConfig();
if (!config.registrations.enabled) return showWaitlistUI();
if (!config.agentic.enabled) return runStandardWorkflow(data);
```

**Rollback:** Update Firestore doc `config/system`. **Zero deployment required.**

### 2.2 Scalable Cost Control Service (Sharded Counters)

**File:** `src/lib/services/costControlService.ts`

To avoid Firestore's 1 write/sec limit on a single document, we use **Sharded Counters**.
We pick a random shard (`billing/shards/cost_0` ... `cost_9`) to increment.

```typescript
const NUM_SHARDS = 10;

export async function trackCost(cost: number) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = adminDb.doc(`system/billing/shards/${shardId}`);

  await shardRef.set({
    monthCost: admin.firestore.FieldValue.increment(cost),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function checkBudget(cap: number): Promise<boolean> {
   // Read aggregated cost (updated by scheduled function or calculated on-fly if cached)
   // For strict safety: Check aggregated doc.
   const aggRef = await adminDb.doc('system/billing').get();
   return aggRef.data().totalCost < cap;
}
```

### 2.3 Agent Orchestrator

**File:** `src/lib/services/agentOrchestrator.ts`

```typescript
export async function runAgenticWorkflow(userId, data) {
  const config = await getSystemConfig();

  // 1. GLOBAL KILL SWITCH
  if (!config.agentic.enabled) return runStandardWorkflow(data);

  // 2. BUDGET CHECK (Only for Free/Promotional models)
  const isFreeTier = user.role === 'basic' || user.role === 'jobseeker';
  
  if (isFreeTier && config.agentic.currentSpend >= config.agentic.budgetCap) {
     return runStandardWorkflow(data);
  }

  // 3. MODEL SELECTION
  // Free: HYBRID Strategy.
  // - Planning: gemini-1.5-pro (Smart)
  // - Writing: gemini-1.5-flash (Fast)
  const planningModel = isFreeTier ? "gemini-1.5-pro" : (user.preferredModel || "gpt-4o");
  const executionModel = isFreeTier ? "gemini-1.5-flash" : (user.preferredModel || "gpt-4o");
  
  try {
    // Step 1: Planning (Smart Brain)
    const strategy = await generateWithAgent("Plan...", planningModel);

    // Step 2: Execution (Fast Muscle)
    const result = await executeAgents(data, strategy, executionModel);

    // Track Cost (Only against 'Growth Budget' if user is Free)
    if (isFreeTier) {
       trackCost(ESTIMATED_COST);
    }

    // Deduct Credit
    if (user.role === "basic") {
       await userRef.update({
         promotionalCredits: admin.firestore.FieldValue.increment(-1)
       });
    }

    return result;
  } catch (e) {
    // Fallback on error
    return runStandardWorkflow(data);
  }
}
```

---

## 3. Implementation Phases

### Phase 1: Infrastructure (Foundation)
*   [ ] Update `SystemConfig` schema in `system-config-types.ts`.
*   [ ] Implement `costControlService.ts` with Sharded Counters.
*   [ ] creating `system/billing/shards/{0..9}` in Firestore.
*   [ ] Create Cloud Function `aggregateBilling` (triggers on shard write or runs minutely) to update `currentSpend` in `config/system`.

### Phase 2: Agent Orchestrator
*   [ ] Build `agentOrchestrator.ts` with strict fallbacks.
*   [ ] Wire up `Gemini 1.5 Flash` via `aiService`.
*   [ ] Implement "Planning", "Research", "Polish" prompts.

### Phase 3: UI & Feedback
*   [ ] Add `AgentStatus` component (UI for "Agent is thinking...").
*   [ ] Show "X free agent runs left" in Dashboard.
*   [ ] "Quota Exceeded" graceful UI (just runs standard generation, maybe small toast "High demand, using standard AI").

### Phase 4: Monitoring (Real-time)
*   [ ] Dashboard in Admin Panel reading `system/billing` total.
*   [ ] Alerting: Cloud Function checks `totalCost` vs `BudgetCap`.

---

## 4. Rollback Procedure

### Option A: Config Kill Switch (Instant)
```javascript
// Firestore Console -> config/system
{
  agentic: { enabled: false }
}
// Effect: Immediate fallback to standard AI for ALL new requests.
```

### Option C: Halt Registrations (Viral Defense)
```javascript
// Firestore Console -> config/system
{
  registrations: { enabled: false, waitlistMode: true }
}
// Effect: New users see "Due to high demand, we are paused. Join Waitlist."
// Existing users continue normally.
```

### Option D: Full Revert

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Firestore Contention** | High | **Sharded Counters** (10x throughput). |
| **Viral Overload (Budget)**| High | **Registration Kill Switch** (Halt sign-ups instantly). |
| **Budget Latency** | Med | Aggregator runs frequent/real-time. Shard writes are fast. |
| **Legacy User Data** | Low | Code defaults `undefined` credits to `3`. No migration needed. |
| **Model Hallucination** | Med | "Validation Agent" step specifically checks facts. |

---

## 6. Success Metrics

*   **Financial**: Cost per resume < $0.001 (Flash).
*   **Performance**: 99.9% success rate (including fallbacks).
*   **Growth**: 30% conversion rate for users who exhaust free agent credits.

---

**Status:** Ready to Build 🚀
