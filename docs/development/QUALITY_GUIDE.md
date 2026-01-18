# 🛠️ Development Quality Guide & Watch Mode

This guide explains how to use SwitchCV's automated quality system to catch errors in real-time and prevent regressions of the **104+ issues** fixed during the initial "Vibes Coding" cleanup.

---

## 🚀 Quick Start

The fastest way to develop with full quality protection:

```bash
npm run dev:watch
```

This command runs both the **Next.js development server** and the **Automatic Quality Watcher** in parallel.

### ⌨️ Terminal Shortcuts

- `q`: Stop the watcher
- `Enter`: Force a full re-run of all checks
- `l`: Clear terminal logs

---

## 🔍 What is Monitored?

The system monitors your files in real-time and runs 7 categories of checks:

1.  **TypeScript:** Catches type mismatches, missing properties, and null pointers.
2.  **ESLint:** Enforces code style and catches common React/Next.js pitfalls.
3.  **Logger Validation:** Ensures you use the centralized `pino` logger with correct JSON formatting.
4.  **Import Consistency:** Prevents mixing absolute/relative imports and server/client code.
5.  **Security Scanning:** Looks for hardcoded secrets or dangerous API patterns.
6.  **Zod Schema Validation:** Ensures all API inputs have corresponding validation schemas.
7.  **Firebase Rules:** Basic validation of local security rule changes.

---

## 🎯 Coverage: The "104 Issues" Promise

This system was built to specifically monitor every single one of the 104+ issues identified in the January 2026 audit.

| Category       | Issues Monitored | Examples                                          |
| :------------- | :--------------- | :------------------------------------------------ |
| **TypeScript** | 40+              | Missing `userId` in props, incorrect SWR types    |
| **ESLint**     | 30+              | Missing `useEffect` dependencies, unsafe any      |
| **Logging**    | 15+              | `console.log` usage, improper error serialization |
| **API**        | 10+              | Missing error handlers, raw status codes          |
| **Security**   | 9+               | Hardcoded keys, insecure Firestore queries        |

---

## 🔄 Quality Pipeline Comparison

| Feature      | Watch Mode (`npm run dev:watch`) | Unit Tests (`npm test`)  | Pre-commit Hooks       |
| :----------- | :------------------------------- | :----------------------- | :--------------------- |
| **Speed**    | Instant (Real-time)              | Medium (seconds/minutes) | Slow (barrier to push) |
| **Focus**    | Correctness & Syntax             | Business Logic           | Final Safety Net       |
| **Feedback** | Terminal Overlay                 | Test Result List         | Push Rejection         |

**Recommended Workflow:**

1.  Keep `npm run dev:watch` running while coding.
2.  Run `npm test` before major feature completion.
3.  Rely on CI/CD (and pre-commit) for final verification.

---

## 🛠️ Advanced Setup & Troubleshooting

### VS Code Integration

If you prefer not to use the terminal directly, use these VS Code Tasks (`Cmd+Shift+P` -> `Tasks: Run Task`):

- `Quality Watch - Continuous`
- `Quality Check (Quick) - On Demand`

### Troubleshooting

- **Memory Issues:** The watcher uses `chokidar`. If it uses too much CPU, ensure `node_modules` is excluded (it is by default).
- **False Positives:** If a check incorrectly flags your code, add `// @quality-ignore` to the line.
- **Port Conflicts:** If `dev:watch` fails, check if port `3000` is already in use by another process.
