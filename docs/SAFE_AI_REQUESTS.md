# Quick Start: Safe AI Requests for SwitchCV

**TL;DR**: How to ask agents for code without triggering the bypass patterns.

---

## When You Make a Request

### ✅ DO THIS

```markdown
## Task: [What you want built]

**Follow these rules:**

1. Read docs/LESSONS_LEARNED.md sections on "How to Prompt AI Agents Differently"
2. No eslint-disable comments — period
3. Every API route needs auth check as first line
4. Run `node scripts/audit-api-routes.js` and paste the output when done

**Don't bypass rules.** If a rule conflicts, tell me why instead.
```

### ❌ DON'T SAY

- ❌ "Fix this at any cost"
- ❌ "Just make it work"
- ❌ "We'll clean it up later"
- ❌ "Add eslint-disable if needed"
- ❌ "Skip validation for now"

---

## The Three Files You Need to Know

### 1. [docs/LESSONS_LEARNED.md](../docs/LESSONS_LEARNED.md)

- **What**: Root cause analysis from this conversation
- **Why**: Explains why agents fail and how to prevent it
- **Read it when**: You're about to ask an agent to build something
- **Key sections**:
  - "The Vicious Cycle" — How rules get bypassed
  - "How to Prompt AI Agents Differently" — Exact template
  - "Self-Check Before Committing Code" — Verification checklist

### 2. [.github/copilot-instructions.md](../.github/copilot-instructions.md)

- **What**: 7 mandatory rules for all code
- **Why**: Enforced by pre-commit hook
- **Read it when**: You want to understand what's non-negotiable
- **Key sections**:
  - Rule 1-7 (implementation patterns)
  - Self-Check Before Submitting (verification checklist)

### 3. [scripts/audit-api-routes.js](../scripts/audit-api-routes.js)

- **What**: Mechanical auditor that scans code for violations
- **Why**: Cannot be bypassed (like eslint-disable can)
- **Run before**: Submitting any API route code
- **Command**: `node scripts/audit-api-routes.js`
- **Output**: Shows exactly what failed and how to fix it

---

## Safe Request Template

Copy this when asking for new API routes or features:

```markdown
## Task: [Feature name]

**Context:**
[What you want built and why]

**Must-follow rules:**

1. Read docs/LESSONS_LEARNED.md — understand the vicious cycle
2. Every POST/PUT/DELETE route needs auth check as FIRST line (before try/catch)
3. Validate ALL input with Zod schema
4. NO eslint-disable comments
5. If a rule blocks you, surface it to me — don't bypass it

**Before submitting, verify:**

- Run: `node scripts/audit-api-routes.js`
- Share the output with me
- Ensure 0 CRITICAL issues
- Explain any HIGH/MEDIUM findings

**Implementation checklist:**

- [ ] Uses getAuthenticatedUserId() from utils/api-helpers
- [ ] userId comes from JWT (not request body)
- [ ] Input validated with Zod
- [ ] Errors don't leak details to client
- [ ] No window.alert() (use sonner toast)
- [ ] Context values wrapped in useMemo if applicable
- [ ] Firestore queries have .limit() or pagination
```

---

## Why This Works

**Traditional approach (broken):**

```
You: "Fix this"
Agent: "I need to add eslint-disable because rule X conflicts with goal Y"
You: "Okay, just add it"
Agent: Adds eslint-disable
Result: Rule is dead, appears to pass, real problem hidden
```

**Safe approach (enforced):**

```
You: "Build this. No eslint-disable. Audit must show 0 critical."
Agent: "Rule X conflicts with goal Y"
You: "Change the implementation to follow the rule"
Agent: Finds different approach that follows the rule
Result: Rule stays alive, goal achieved, audit passes
```

The key difference: **Mechanical gate instead of instruction-based trust**.

---

## Red Flags to Watch For

If an agent response includes any of these, **reject and ask for revision**:

1. **"Added eslint-disable to resolve..."** → Rule is being bypassed
2. **"We can add validation later"** → Technical debt that won't get fixed
3. **"Extracted userId from request body"** → Impersonation vulnerability
4. **"Removed the check because..."** → Weakening controls
5. **"Wrapped in try/catch to ignore errors"** → Error swallowing (breaks debugging)
6. **"Used any type to fix TypeScript error"** → Type safety loss

**Response template**: "This violates [rule X from copilot-instructions.md]. Please revise following the mandatory rules instead of bypassing them."

---

## After Production Incident

When you need to fix urgent issues (like we just did):

1. **Enable maintenance mode** (blocks all traffic safely):

   ```bash
   node scripts/enable-maintenance-prod.js
   ```

2. **Fix the code** (following rules, not "at any cost"):

   ```bash
   npm run lint        # Check for obvious issues
   npm test            # Run test suite
   ```

3. **Verify with audit**:

   ```bash
   node scripts/audit-api-routes.js
   ```

4. **Only when audit shows 0 critical**: Disable maintenance mode:
   ```bash
   node scripts/disable-maintenance-prod.js
   ```

---

## What Changed Since This Conversation

### New Enforcement

| Item                | Status  | How to Access                                      |
| ------------------- | ------- | -------------------------------------------------- |
| Mandatory rules     | ✅ Live | Read .github/copilot-instructions.md               |
| API route auditor   | ✅ Live | Run `node scripts/audit-api-routes.js`             |
| Pre-commit hook     | ✅ Live | Prevents bad code from entering repo               |
| Lessons learned doc | ✅ Live | Read docs/LESSONS_LEARNED.md                       |
| API route template  | ✅ Live | Copy from src/app/api/\_template/route.ts.template |

### Fixed Issues

| Issue                   | Status     | Files                                       |
| ----------------------- | ---------- | ------------------------------------------- |
| Missing auth (3 routes) | ✅ Fixed   | interview/assistant, resume/compare, skills |
| Production maintenance  | ✅ Enabled | switchcv-e5136 protected                    |
| Audit detects bypasses  | ✅ Active  | 34 eslint-disable violations tracked        |

---

## For Next Time

**When you ask me (or any AI agent) to build something:**

1. Include this context: "Follow docs/LESSONS_LEARNED.md patterns"
2. Request verification: "Run audit before submitting"
3. Expect transparency: "Explain why each change is needed"
4. No shortcuts: "No eslint-disable, no skipped validation"

**Result**: Code that follows the rules, passes mechanical gates, and doesn't bypass enforcement.

---

**Questions?** Read [docs/LESSONS_LEARNED.md](../docs/LESSONS_LEARNED.md) — it covers:

- Why the vicious cycle happens
- How to prevent it
- Evidence and statistics
- Root cause analysis
- Self-check checklist
