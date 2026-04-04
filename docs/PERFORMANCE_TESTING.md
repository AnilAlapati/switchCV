# SwitchCV Performance & Scalability Testing

This document outlines the performance testing strategy, tools, and thresholds for the SwitchCV platform.

## 1. Automated Performance Gate (Lighthouse CI)

We use Lighthouse CI to ensure that every production build meets our Core Web Vitals targets.

### Running the Audit

To run a local performance audit:

```bash
# Ensure the app is built first
npm run build
# Run the Lighthouse audit
npx @lhci/cli@0.13.x autorun
```

### Thresholds (lighthouserc.js)

| Metric                     | Target | Status       |
| :------------------------- | :----- | :----------- |
| **Performance Score**      | > 90   | Warning      |
| **Accessibility Score**    | > 90   | **Blocking** |
| **SEO Score**              | > 90   | **Blocking** |
| **First Contentful Paint** | < 2.0s | Warning      |
| **Time to Interactive**    | < 3.5s | Warning      |

---

## 2. Load & Stress Testing (k6)

For backend scalability, we use **k6** to simulate concurrent users.

### Current Test: [load-tests/load-test.js](load-tests/load-test.js)

This test ramps up to **20 concurrent users** over 2 minutes to verify API stability.

#### Run Command:

```bash
# Requires k6 installed: brew install k6
k6 run load-tests/load-test.js
```

---

## 3. Static Performance Audit

Run our internal script to verify caching headers and data-fetching patterns:

```bash
npm run audit:perf
```

### Checks Performed:

1. **Cache-Control Headers**: Verifies all GET API routes have caching enabled.
2. **SWR Usage**: Ensures page components use SWR for client-side fetching instead of `useEffect`.
3. **Bundle Analysis**: Run `npm run build` to see the Next.js bundle distribution.

---

## 4. Production Monitoring

We use **Decorators** in Cloud Functions to track real-world performance:

- **Location**: `functions/src/utils/monitoring/`
- **Metric**: Execution duration and cold-start frequency.
- **Alerts**: Triggered if function execution exceeds 5 seconds for resume generation.

---

## 5. Optimization Checklist

- [ ] Use `next/image` for all resume templates.
- [ ] Ensure `priority` flag is set on LCP images in the dashboard.
- [ ] Implement Redis/Upstash caching for public resume profiles (TODO).
- [ ] Optimize PDF generation (Move to worker threads).
