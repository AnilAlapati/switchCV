# 🚀 Quick Start - Development with Automatic Quality Checking

## The Simplest Setup

You now have ONE command that does everything:

```bash
npm run dev:watch
```

This automatically starts:

1. ✅ Dev server on `http://localhost:3000`
2. ✅ Quality watch (checks code on every change)

That's it! No more thinking about checking code quality manually.

---

## What You'll See

### Terminal Output

```
=================================================
  SwitchCV Development with Quality Checking
=================================================

✅ Starting in parallel:
   1️⃣  Dev server (http://localhost:3000)
   2️⃣  Quality watch (automatic checks on code changes)

Press Ctrl+C to stop both

[DEV SERVER] Starting...
[QUALITY WATCH] Starting...

✅ Both processes running!
[DEV SERVER] http://localhost:3000
```

### When You Edit Code

- **Terminal 1**: Dev server hot-reloads your page
- **Terminal 2**: Quality checks run automatically
  - Shows TypeScript errors instantly
  - Shows ESLint issues immediately
  - Shows security patterns
  - No waiting, no manual commands

---

## 💡 What Gets Checked (Automatically)

Every time you save a file:

- ✅ **TypeScript** - Type errors caught instantly
- ✅ **ESLint** - Code quality issues
- ✅ **Security** - Hardcoded secrets, auth patterns
- ✅ **Patterns** - Logger format, `any` usage, etc.

All 104+ issue patterns from your previous fix are monitored.

---

## 🛑 When Something Breaks

If quality check finds an error:

- The error appears in your terminal immediately
- Fix it in your IDE
- Quality watch re-checks automatically
- No need to reload or restart anything

---

## ⌨️ Keyboard Shortcuts

```bash
npm run dev:watch      # Start dev + quality (THIS IS YOUR NEW MAIN COMMAND)
npm run quality:watch  # Just quality (if you want it separate)
npm run dev            # Just dev server (old way)
```

---

## 🎯 What Changed From Before

| Before                      | Now                        |
| --------------------------- | -------------------------- |
| `npm run dev`               | `npm run dev:watch`        |
| Manual quality checks       | Automatic checks           |
| Errors found at commit time | Errors caught while typing |
| Two terminals needed        | Everything in one command  |

---

## 📊 Example Workflow

```bash
# 1. Start development (one command)
npm run dev:watch

# 2. Open code and start editing
#    → Dev server updates your page
#    → Quality watch shows any errors

# 3. Fix errors (you'll see them in terminal)

# 4. When ready: git commit
#    → Pre-commit hook double-checks
#    → Commit succeeds if everything is clean
```

---

## ✅ That's It!

You now have continuous, automatic quality checking. No more surprise issues at commit time. 🎉

Press `Ctrl+C` anytime to stop both processes.
