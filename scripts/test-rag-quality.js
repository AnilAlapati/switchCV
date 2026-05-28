#!/usr/bin/env node
/**
 * RAG Quality Test — 7 high-signal questions against a backend engineer resume.
 * Run: node scripts/test-rag-quality.js
 *
 * Tests: relevance, precision, hallucination, comparative reasoning,
 *        context limitation, edge case fitness, and follow-up memory.
 */

const fs = require("fs");
const path = require("path");

// ─── Load .env.local ────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].replace(/^["']|["']$/g, "").trim();
    if (!process.env[key]) process.env[key] = value;
  });
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.error("❌  GEMINI_API_KEY not found in environment / .env.local");
  process.exit(1);
}

// ─── Sample Resume: Backend Engineer (Arjun Sharma) ─────────────────
// Deliberately: strong backend, no ML, no frontend, has real metrics.
const RESUME_A = {
  name: "Arjun Sharma",
  title: "Senior Backend Engineer",
  summary:
    "7 years building distributed systems and high-throughput APIs. " +
    "Reduced payment processing latency by 62% at FinPay. " +
    "No frontend or ML experience.",
  experience: [
    {
      company: "FinPay India",
      role: "Senior Backend Engineer",
      period: "2021–present",
      description:
        "Redesigned the payment processing pipeline using Go and Kafka. " +
        "Reduced p99 latency from 820 ms to 310 ms (62% improvement). " +
        "System handles 45,000 transactions per second at peak. " +
        "Led a 4-person backend team. Migrated 3 legacy PHP services to Go microservices.",
    },
    {
      company: "LogisticsHub",
      role: "Backend Engineer",
      period: "2019–2021",
      description:
        "Built REST and gRPC APIs in Python (FastAPI) for real-time shipment tracking. " +
        "Integrated with 12 third-party courier APIs. " +
        "Designed PostgreSQL schemas; added Redis caching that cut DB reads by 40%. " +
        "Wrote 85% test coverage on all service endpoints.",
    },
    {
      company: "StartupX",
      role: "Junior Backend Developer",
      period: "2017–2019",
      description:
        "Node.js REST APIs for an e-commerce platform. " +
        "MongoDB data modelling. " +
        "Deployed services on AWS EC2 and S3.",
    },
  ],
  skills: [
    "Go", "Python", "Node.js", "FastAPI", "Kafka", "Redis",
    "PostgreSQL", "MongoDB", "gRPC", "REST APIs",
    "AWS (EC2, S3, RDS)", "Docker", "Kubernetes",
    "Distributed Systems", "Microservices",
  ],
  education: [
    {
      institution: "IIT Bombay",
      degree: "B.Tech Computer Science",
      year: "2017",
    },
  ],
  projects: [
    {
      name: "open-kafka-retry",
      description:
        "Open-source Go library for idempotent Kafka message retry with exponential backoff. " +
        "340 GitHub stars.",
    },
  ],
  certifications: ["AWS Certified Solutions Architect (Associate)"],
};

// ─── Sample Resume: Full-Stack Engineer (Priya Roy) ──────────────────
// Used only for Q4 (comparative reasoning).
const RESUME_B = {
  name: "Priya Roy",
  title: "Full-Stack Engineer",
  summary:
    "5 years in web development, primarily React and Node.js. " +
    "No distributed systems or high-throughput backend experience.",
  experience: [
    {
      company: "Edtech Startup",
      role: "Full-Stack Engineer",
      period: "2020–present",
      description:
        "Built React dashboards and Node.js BFF (backend for frontend). " +
        "Integrated Stripe payments. " +
        "Wrote Jest unit tests with 70% coverage.",
    },
    {
      company: "Agency Y",
      role: "Frontend Developer",
      period: "2019–2020",
      description:
        "React, CSS-in-JS, built marketing pages. " +
        "No backend responsibilities.",
    },
  ],
  skills: [
    "React", "TypeScript", "Node.js", "Express", "PostgreSQL",
    "Stripe API", "Jest", "HTML/CSS",
  ],
  education: [
    {
      institution: "Delhi University",
      degree: "BSc Computer Applications",
      year: "2019",
    },
  ],
  projects: [],
  certifications: [],
};

// ─── Gemini helpers ──────────────────────────────────────────────────

async function embedText(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Embed error: ${data.error.message}`);
  return data.embedding.values;
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function generateAnswer(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Gemini error: ${data.error.message}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ─── Fix 2: Query Expansion (mirrors ragService.ts QUERY_EXPANSIONS) ──────────
const QUERY_EXPANSIONS = {
  "distributed systems":
    "microservices scalability kafka rabbitmq grpc messaging queue event-driven architecture high throughput",
  "machine learning":
    "ml ai deep learning neural networks tensorflow pytorch model training inference data science NLP",
  frontend:
    "react vue angular typescript javascript css html ui components design system responsive",
  backend:
    "api rest grpc server database sql nosql caching microservices services golang python nodejs",
  performance:
    "optimization latency throughput p99 p95 caching profiling benchmark load testing scalability",
};

function expandQueryForRetrieval(query) {
  const lower = query.toLowerCase();
  const expansions = [];
  for (const [pattern, terms] of Object.entries(QUERY_EXPANSIONS)) {
    if (lower.includes(pattern)) expansions.push(terms);
  }
  return expansions.length > 0 ? `${query} ${expansions.join(" ")}` : query;
}

// ─── RAG pipeline (self-contained) ────────────────────────────────────────

function buildChunks(resume, resumeId) {
  const chunks = [];

  // Summary chunk
  chunks.push({
    id: `${resumeId}_summary`,
    section: "summary",
    text: `Name: ${resume.name}\nTitle: ${resume.title}\nSummary: ${resume.summary}`,
  });

  // Experience chunks
  resume.experience.forEach((exp, i) => {
    chunks.push({
      id: `${resumeId}_exp_${i}`,
      section: "experience",
      text:
        `Company: ${exp.company}\nRole: ${exp.role}\nPeriod: ${exp.period}\n` +
        `Description: ${exp.description}`,
    });
  });

  // Skills chunk
  chunks.push({
    id: `${resumeId}_skills`,
    section: "skills",
    text: `Technical Skills: ${resume.skills.join(", ")}`,
  });

  // Education chunk
  resume.education.forEach((edu, i) => {
    chunks.push({
      id: `${resumeId}_edu_${i}`,
      section: "education",
      text: `Education: ${edu.degree} from ${edu.institution} (${edu.year})`,
    });
  });

  // Projects chunk
  resume.projects.forEach((proj, i) => {
    chunks.push({
      id: `${resumeId}_proj_${i}`,
      section: "projects",
      text: `Project: ${proj.name}\n${proj.description}`,
    });
  });

  // Certifications
  if (resume.certifications?.length) {
    chunks.push({
      id: `${resumeId}_certs`,
      section: "certifications",
      text: `Certifications: ${resume.certifications.join(", ")}`,
    });
  }

  return chunks;
}

async function indexChunks(chunks) {
  const embedded = [];
  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);
    embedded.push({ ...chunk, embedding });
  }
  return embedded;
}

async function retrieve(query, indexedChunks, topK = 4) {
  const qEmbed = await embedText(query);
  const scored = indexedChunks.map((c) => ({
    ...c,
    score: cosineSim(qEmbed, c.embedding),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

// Fix 3+4: Updated rules — evidence-backed reasoning, no inference
function buildRAGPrompt(query, contextChunks, isRetry = false, conversationHistory = []) {
  const context = contextChunks
    .map((c) => `[${c.section.toUpperCase()}]\n${c.text}`)
    .join("\n\n");

  const retryNote = isRetry
    ? "\n\nIMPORTANT: Your previous answer was not grounded enough. " +
      "ONLY use information explicitly stated in the context below. Do NOT infer."
    : "";

  // Fix 1: Include conversation history so follow-ups stay coherent
  const historyBlock =
    conversationHistory.length > 0
      ? `\n--- CONVERSATION HISTORY ---\n` +
        conversationHistory
          .map((t, i) => `Turn ${i + 1}:\nQ: ${t.query}\nA: ${t.answer}`)
          .join("\n\n") +
        `\n--- END HISTORY ---\n`
      : "";

  return (
    `You are a resume analysis assistant.\n` +
    `Answer the question using ONLY the resume context below.${historyBlock}\n\n` +
    `RULES:\n` +
    `1. Answer STRICTLY from context — do NOT hallucinate or infer\n` +
    `2. Always justify your answer with specific examples: cite company names, dates, numbers, and technologies. If no supporting evidence exists, say explicitly: "This resume contains no evidence of [X]. Based on the resume, the candidate's background is in [Y instead]."\n` +
    `3. Only list skills or facts explicitly stated in the context — do NOT infer or generalise\n` +
    `4. If this is a follow-up question, build on the conversation history above rather than starting fresh${retryNote}\n\n` +
    `--- RESUME CONTEXT ---\n${context}\n--- END CONTEXT ---\n\n` +
    `QUESTION: ${query}\n\nANSWER:`
  );
}

async function ragQuery(query, indexedChunks, conversationHistory = []) {
  // Fix 2: Expand abstract query before embedding
  const retrievalQuery = expandQueryForRetrieval(query);
  const topChunks = await retrieve(retrievalQuery, indexedChunks, 4);
  if (!topChunks.length) return { answer: "No relevant chunks found.", topChunks, attempts: 0 };

  const prompt = buildRAGPrompt(query, topChunks, false, conversationHistory);
  const answer = await generateAnswer(prompt);
  return { answer, topChunks, attempts: 1 };
}

// ─── Test runner ─────────────────────────────────────────────────────

const SEPARATOR = "─".repeat(72);

async function runTest(label, question, indexedChunks, conversationHistory = []) {
  console.log(`\n${SEPARATOR}`);
  console.log(`TEST: ${label}`);
  console.log(`Q:    ${question}`);
  console.log(SEPARATOR);

  const { answer, topChunks, attempts } = await ragQuery(question, indexedChunks, conversationHistory);

  console.log(`\n📄 ANSWER:\n${answer}`);
  console.log(
    `\n📊 Chunks used (top-${topChunks.length}): ` +
      topChunks.map((c) => `${c.section}(${c.score.toFixed(2)})`).join(", ")
  );
  console.log(`   Attempts: ${attempts}`);

  return answer;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║          RAG QUALITY TEST — 7 HIGH-SIGNAL QUESTIONS          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("\nCandidate A: Arjun Sharma (Backend Engineer)");
  console.log("Candidate B: Priya Roy   (Full-Stack Engineer)");
  console.log("\n🔄 Indexing resumes...");

  const chunksA = buildChunks(RESUME_A, "resume_a");
  const chunksB = buildChunks(RESUME_B, "resume_b");
  const indexedA = await indexChunks(chunksA);
  const indexedB = await indexChunks(chunksB);

  console.log(`✅ Indexed ${indexedA.length} chunks for Arjun, ${indexedB.length} for Priya`);

  // Q1: Relevance / backend strength
  await runTest(
    "Q1 — RELEVANCE (backend strength)",
    "Is this candidate strong in backend engineering? Explain with evidence.",
    indexedA
  );

  // Q2: Precision (only backend skills)
  await runTest(
    "Q2 — PRECISION (skill filter)",
    "List only backend-related skills from this resume. Ignore everything else.",
    indexedA
  );

  // Q3: Hallucination check (metrics)
  await runTest(
    "Q3 — HALLUCINATION CHECK (metrics)",
    "What metrics or achievements does this candidate have?",
    indexedA
  );

  // Q4: Comparative reasoning
  console.log(`\n${SEPARATOR}`);
  console.log("TEST: Q4 — COMPARATIVE REASONING (A vs B, backend role)");
  console.log(`Q:    Compare Candidate A (Arjun) vs Candidate B (Priya) for a backend role. Who is better and why?`);
  console.log(SEPARATOR);

  const comparisonPrompt =
    `You are a technical recruiter evaluating two candidates for a SENIOR BACKEND ENGINEER role.\n\n` +
    `RULES:\n` +
    `1. Base your comparison STRICTLY on the resume data below\n` +
    `2. Be specific — cite companies, numbers, technologies\n` +
    `3. Give a clear winner with structured reasoning\n` +
    `4. Do NOT fabricate any information\n\n` +
    `--- CANDIDATE A (Arjun Sharma) ---\n` +
    chunksA.map((c) => `[${c.section}] ${c.text}`).join("\n\n") +
    `\n\n--- CANDIDATE B (Priya Roy) ---\n` +
    chunksB.map((c) => `[${c.section}] ${c.text}`).join("\n\n") +
    `\n\nQUESTION: Compare Candidate A vs Candidate B for a backend role. Who is better and why?\n\nANSWER:`;

  const q4 = await generateAnswer(comparisonPrompt);
  console.log(`\n📄 ANSWER:\n${q4}`);

  // Q5: Context limitation (distributed systems)
  await runTest(
    "Q5 — CONTEXT LIMITATION (distributed systems)",
    "What experience does this candidate have with distributed systems?",
    indexedA
  );

  // Q6: Edge case — ML fitness
  const q6 = await runTest(
    "Q6 — EDGE CASE (wrong domain — ML fit)",
    "Is this candidate a good fit for a Machine Learning role?",
    indexedA
  );

  // Q7: Follow-up memory test — now passes real conversation history
  await runTest(
    "Q7 — FOLLOW-UP MEMORY (justify Q6 answer)",
    "Can you justify that with specific examples?",
    indexedA,
    [{ query: "Is this candidate a good fit for a Machine Learning role?", answer: q6 }]
  );

  // ─── Summary ──────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(72)}`);
  console.log("QUICK GRADING (review manually)");
  console.log("═".repeat(72));
  const checks = [
    ["Q1 — Relevance   ", "mentions FinPay / Go / Kafka / real experience"],
    ["Q2 — Precision   ", "ONLY backend skills, no React/frontend included"],
    ["Q3 — Hallucination", "only 62% latency / 45k TPS / 340⭐ / 40% DB reads — no invented metrics"],
    ["Q4 — Comparative  ", "picks Arjun with structured backend evidence"],
    ["Q5 — Context Limit", "only Kafka/distributed pipeline experience cited, not generic"],
    ["Q6 — Edge Case    ", "explicitly says NOT suitable for ML + gives reason"],
    ["Q7 — Follow-up    ", "references previous answer about ML gap, uses resume facts"],
  ];
  checks.forEach(([label, expectation]) => {
    console.log(`  ${label} → check: ${expectation}`);
  });
  console.log(`\n${"═".repeat(72)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
