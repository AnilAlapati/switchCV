# Test Plan — Smart Resume Creator (LLM)

**Status**: Draft / In Progress
**Last Updated**: 21 November 2025

## 1 — High-level goals

- [ ] Produce accurate, relevant, and personalized resumes from user inputs.
- [ ] Minimize hallucinations and privacy leaks.
- [ ] Fast, reliable UX across devices and integrations.
- [ ] Compliant with data/privacy regulations and auditable.

## 2 — Important test categories (with key scenarios)

### Functional

#### Input handling
- [ ] Free-form text input, structured forms, file uploads (LinkedIn, PDF/Word).
- [ ] Missing fields, ambiguous inputs, long bios, special characters, Unicode.

#### Resume generation
- [ ] One-click generate, regenerate (different tone/templates), edit suggestions.
- [ ] Export to PDF/Word, copy-to-clipboard, download metadata (json).

#### Templates & formatting
- [ ] Multiple templates (modern, classic, technical), page-break handling, bullets, sections ordering.

#### Personalization
- [ ] Skill highlighting by role, achievement extraction, ATS-optimization toggle, length/word-count control.

#### Account & project flows
- [ ] Save drafts, versioning, history, project rename, multiple resumes per user.

### ML / Model-specific

#### Factuality / Hallucination
- [ ] Ensure claims (titles, dates, companies, certifications) are preserved or signaled if model is unsure.

#### Instruction following
- [ ] Tone (concise, storytelling), role-targeting (SWE @ FAANG), and other prompts respected.

#### Consistency
- [ ] Same input -> deterministic output (or documented randomness via seed/temperature).

#### Bias & fairness
- [ ] Gender/ethnicity neutral phrasing; avoid stereotyping.

#### Prompt robustness
- [ ] Handles short/long prompts, ambiguous job titles, role synonyms.

#### Safety
- [ ] No creation of illegal/fraudulent claims, no disclosure of third-party PII beyond what user provided.

### Data & Privacy

#### PII protection
- [ ] Redact sensitive fields in logs, encryption at rest/in transit.

#### Consent flows
- [ ] Explicit consent for importing LinkedIn/third-party data.

#### Retention
- [ ] Delete/forget requests work (right to be forgotten).

### Integration & API

#### Third-party imports
- [ ] LinkedIn, GitHub, Google Drive, resume parsers.

#### ATS export
- [ ] Compatibility with common ATS formats (XML/CSV).

#### Webhook & callbacks
- [ ] Job status, generation success/failure events.

### Performance & Scalability

#### Latency
- [ ] Time-to-first-draft under SLA (e.g., <3s for small inputs, <15s for long ones).

#### Throughput
- [ ] Concurrent users, heavy batch generation.

#### Stability
- [ ] Graceful degradation (fallback templates) when LLM is slow/down.

### Security & Compliance

#### Auth & roles
- [ ] Session management, RBAC for organization accounts.

#### Penetration tests
- [ ] Injection, XSS in user-provided text, file upload scanning.

#### Auditability
- [ ] Logging of prompts, model version, template used (with PII-safe logs).

### UX & Accessibility

#### Preview & editing
- [ ] Live preview matches exported file; WYSIWYG edits persist.

#### Mobile / responsive
- [ ] Templates render properly on mobile/tablet.

#### Accessibility
- [ ] Keyboard nav, screen-reader labels, contrast.

### Regression & CI

- [ ] Automated smoke for generation, export, login flows on each release.

### Monitoring & Observability

#### Quality metrics
- [ ] Factual-correction rate, user accept rate, manual edits per resume.

#### Error monitoring
- [ ] Failures, timeouts, model errors.

## 3 — Example concrete test cases (ready to convert to tickets)

1. **Import LinkedIn → Generate**
   - [ ] Steps: Import profile with 10 jobs + 3 certifications → generate resume (technical template).
   - [ ] Acceptance: All job titles/dates appear; no change to employment dates; exportable PDF preserves bullets and page breaks.

2. **Hallucination guard**
   - [ ] Steps: Provide short single-line bio (“SWE, 3 yrs”) → ask model to add leadership achievements.
   - [ ] Acceptance: Model either (A) asks for permission to synthesize achievements, or (B) generates suggestions clearly prefixed as “suggested—please verify”, with no fabricated company names/dates.

3. **Tone & ATS toggle**
   - [ ] Steps: Provide one work entry; generate with “concise + ATS-friendly” and “storytelling + recruiter” settings.
   - [ ] Acceptance: Two outputs differ in style; ATS version has keyword density and simple formatting; storytelling includes bullet narratives.

4. **Malformed input**
   - [ ] Steps: Upload corrupted PDF or unsupported file type.
   - [ ] Acceptance: User receives clear error and recovery options (retry, paste text).

5. **Privacy delete**
   - [ ] Steps: Create resume from LinkedIn import; request account data deletion.
   - [ ] Acceptance: System revokes access tokens, deletes user content and logs deletion event; cannot regenerate resume after deletion.

6. **Concurrency stress**
   - [ ] Steps: Simulate 500 concurrent generation requests (short prompts).
   - [ ] Acceptance: No data crossover; 99% requests meet latency SLA; failures degrade with informative errors.

7. **Edge-case multilingual**
   - [ ] Steps: Provide resume in Hindi (Devanagari) plus English mixed.
   - [ ] Acceptance: Model preserves non-English content and outputs readable, correctly encoded PDF.

## 4 — Acceptance criteria & KPIs

- [ ] **Quality**: >85% user-accept rate (first draft) in beta.
- [ ] **Factuality**: <2% of resumes contain fabricated employer names/dates (measured by sampling).
- [ ] **Latency**: 95th percentile under SLA.
- [ ] **Reliability**: 99.9% uptime for core API.
- [ ] **Privacy**: 100% of PII redaction rules applied in logs.

## 5 — Test data & labeling needs

- [ ] Realistic synthetic profiles across seniority/industries.
- [ ] Edge-case list: gaps, contract work, multiple overlapping roles, internal transfers.
- [ ] Labeled dataset for factuality checks (gold standard resumes vs. generated).

## 6 — Automation & tools suggestions

- [ ] **Unit & API tests**: Jest/Pytest + Postman/newman.
- [ ] **E2E**: Playwright or Cypress for UI flows including file uploads and exports.
- [ ] **Load**: k6 or Locust for concurrency.
- [ ] **ML eval**: Human-in-the-loop annotation tool (Label Studio) for factuality, coherence, bias metrics.
- [ ] **Monitoring**: Sentry + Prometheus/Grafana for latency and errors.
- [ ] **Red-team**: Manual adversarial prompt suites to catch jailbreaks/hallucinations.

## 7 — Release checklist (pre-release)

- [ ] Smoke tests pass (generation, export, login).
- [ ] Model version pinned and documented.
- [ ] Logging & observability enabled (prometheus metrics, error traces).
- [ ] Privacy/consent flows verified.
- [ ] Manual review samples: 100 generated resumes inspected for hallucination/bias.
