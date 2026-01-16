# Automatic Quality Checking

The SwitchCV codebase has multiple ways to catch issues automatically, depending on your workflow.

## 🚀 Quick Start

### Option 1: Watch Mode (Recommended for Active Development)

Run this in a terminal while developing:

```bash
npm run quality:watch
```

This will:

- Monitor all your changes in real-time
- Run quality checks automatically on every file save
- Display errors instantly in your terminal
- Keep running until you press `Ctrl+C`

### Option 2: VS Code Tasks (Best for IDE Integration)

**Quick Check (on demand):**

- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Tasks: Run Task"
- Select "Quality Check (Quick) - On Demand"

**Continuous Watch:**

- Press `Cmd+Shift+P` or `Ctrl+Shift+P`
- Type "Tasks: Run Task"
- Select "Quality Watch - Continuous"
- Runs silently in the background
- Shows errors in VS Code's Problems panel

**Type Checking Only:**

- Select "TypeScript Check - Watch"
- Lighter weight, just TypeScript compilation

### Option 3: Pre-commit Hook (Automatic Before Commits)

Already installed! Every time you run `git commit`, the hook automatically:

- Runs `npm run quality:quick`
- Blocks the commit if errors are found
- Forces you to fix issues before committing

You don't need to do anything - it's automatic!

---

## 📊 Comparison

| Feature      | Watch Mode                | VS Code Tasks        | Pre-commit Hook             |
| ------------ | ------------------------- | -------------------- | --------------------------- |
| **When**     | Continuous (as you type)  | On demand            | Before each commit          |
| **Setup**    | None (just run command)   | Automatic in VS Code | Automatic after setup:hooks |
| **Feedback** | Immediate terminal output | IDE Problems panel   | Blocks commit               |
| **Best for** | Active development        | IDE workflow         | Preventing bad commits      |
| **Overhead** | Moderate (watch process)  | Minimal              | Minimal                     |

---

## ⚡ What Gets Checked

All automatic methods check:

- ✅ **TypeScript** - Type errors in production code
- ✅ **ESLint** - Code quality and style
- ✅ **Security** - Hardcoded secrets, auth patterns
- ✅ **Patterns** - Logger format, `any` usage, error handling

**Quick mode skips:**

- Build verification (slower)
- Test suite (use `npm test` separately)

---

## 🔧 Troubleshooting

### "No such file or directory: chokidar-cli"

The watch script auto-installs chokidar, but if it fails:

```bash
npm install --save-dev chokidar-cli
npm run quality:watch
```

### "Too many open files" (on macOS)

Increase the file watcher limit:

```bash
ulimit -n 65536
npm run quality:watch
```

### TypeScript watch is slow

Use `quality:watch` instead - it's faster and covers most cases.

---

## 💡 Recommended Setup

**For best workflow:**

1. **Terminal 1:** `npm run quality:watch` (continuous feedback)
2. **Terminal 2:** `npm run dev` (dev server)
3. **Regular commits** (pre-commit hook prevents bad code)

This way you get:

- Instant feedback on errors
- Dev server running
- Automatic block on bad commits

---

## 📝 Related Commands

```bash
# Run checks on demand
npm run quality:quick        # Fast check (TS + lint)
npm run quality              # Full check (+ build + tests)
npm run quality:fix          # Auto-fix what you can

# Run tests separately
npm test                     # Jest unit tests
npm run test:coverage        # Coverage report
npm run e2e                  # Playwright E2E tests

# Git hooks
npm run setup:hooks          # Install pre-commit hook
```
