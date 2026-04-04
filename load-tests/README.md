# SwitchCV Load Tests

Load tests using [k6](https://k6.io/).

## Prerequisites

```bash
brew install k6   # macOS
```

## Scripts

| Script               | Purpose                           | Auth Required |
| -------------------- | --------------------------------- | ------------- |
| `load-test.js`       | Basic health check (smoke test)   | No            |
| `api-endpoints.js`   | Public + authed API endpoints     | Yes (token)   |
| `resume-pipeline.js` | Resume creation & generation flow | Yes (token)   |
| `search-flow.js`     | Recruiter search & AI search      | Yes (token)   |

## Usage

```bash
# Smoke test (no auth needed)
k6 run load-tests/load-test.js

# API endpoints (set auth token)
k6 run -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=<firebase-jwt> load-tests/api-endpoints.js

# Resume pipeline
k6 run -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=<firebase-jwt> load-tests/resume-pipeline.js

# Search flow
k6 run -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=<firebase-jwt> load-tests/search-flow.js

# Full suite with custom VUs
k6 run -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=<firebase-jwt> --vus 10 --duration 2m load-tests/api-endpoints.js
```

## Getting an Auth Token

```bash
# Use the Firebase Auth emulator or extract from browser DevTools:
# 1. Open browser → DevTools → Application → Local Storage
# 2. Find the firebase:authUser key
# 3. Copy the stsTokenManager.accessToken value
```

## Thresholds

All scripts define pass/fail thresholds:

- **p(95) < 500ms** for health/config endpoints
- **p(95) < 2s** for data-fetching endpoints
- **p(95) < 10s** for AI/generation endpoints
- **Error rate < 10%** overall
