#!/usr/bin/env node
/**
 * Test: Can the AI extract a full resume from a pasted PDF?
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node scripts/test-pdf-resume.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const https = require("https");

const MODEL = "gemini-2.5-flash-lite"; // was gemini-2.0-flash-lite (discontinued June 1 2026)

// ─────────────────────────────────────────────
// The actual text extracted from the PDF
// ─────────────────────────────────────────────
const RESUME_TEXT = `(+91) 9916179765
Hyderabad, INDIA
anilalapati.66@gmail.com
10 Years 8 Months of experience

Anil Alapati
Software Engineer III

PROFILE SUMMARY
An introspective Senior Software Engineer with over 10 years of proficient experience in automation and artificial intelligence. Currently shaping innovative solutions at JPMorgan Chase while passionately pursuing self-built projects like SwitchCV.com to transform recruitment processes. Embracing cutting-edge technologies, I aim to foster impactful advancements in the tech landscape.

WORK EXPERIENCE

Software Engineer III
JPMorgan Chase & Co
01-2024 - Present
- Led a team of 5 delivering enterprise automation and GenAI solutions, exceeding efficiency targets by 15% across 5+ projects.
- Built an MVP LLM-generated feedback agent, designing resilient architectures with monitoring, guardrails, and cost controls.
- Authored patents and GenAI innovation proposals, influencing firm-wide AI adoption.

Software Engineer II
JPMorgan Chase & Co
10-2020 - 12-2023
- Delivered 15+ automations, generating multi-million-dollar business value.
- Ensured InfoSec-compliant delivery for all projects.

Senior RPA Developer
TEKsystems
03-2020 - 10-2020
- Developed automation solutions based on business requirements.
- Coordinated with teams to deliver solutions effectively.

RPA Developer
IBM India Pvt Ltd
05-2015 - 03-2020
- Analyzed user needs and developed software solutions.
- Delivered post-implementation maintenance and enhancements for clients.

EDUCATION
B.Tech/B.E. - Bachelor of Technology / Engineering - Electronics and Telecommunication Engineering
2014
SBCE, Telangana
Grade - 7.2/10

Class XII
2010
Andhra Pradesh, English
Marks - 85-89.9%

Class X
2008
Andhra Pradesh, Telugu
Marks - 80-84.9%

KEY SKILLS
Microservices, SQL, React.js, Python, Angular, Javascript, Azure, Node.js, API, Nextjs, UiPath, Firebase, Prompt Engineering, Vibe coding

CERTIFICATION
Automation Anywhere Certified Advanced RPA Professional
Automation Anywhere Master Certified Professional v11.0
Microsoft Certified Azure Data Scientist Associate (Valid upto June 2025)
Microsoft certified: Azure AI Fundamentals
AWS Certified Cloud Practitioner (Valid upto February 2027)

PROJECTS
SwitchCV.com (83 Days) - Designed and built a SaaS application for sharing digital resumes. Implemented features for efficient candidate sourcing for recruiters.
LoyalTenant (30 Days) - Developed a tenant loyalty application to improve resident engagement. Integrated feedback systems powered by AI for continuous improvement.
VibeAIPartner (14 Days) - Created a partnership platform using Generative AI for enhanced decision-making. Focused on user-friendly interactions and automated workflows.
AgentPandu (55 Days) - Developed an AI-driven application optimized for business tasks. Leveraged machine learning for dynamic problem-solving and user suggestions.

LANGUAGES
English, Hindi, Telugu

SOCIAL LINKS
https://www.linkedin.com/in/anilalapati`;

// ─────────────────────────────────────────────
// System prompt for PDF paste flow
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a Career Coach AI helping someone create a standout resume through a quick, friendly conversation.

YOUR GOAL: Generate a complete, professional resume as a JSON object.

The user has pasted their existing resume. Extract ALL data from it faithfully.

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "",
  "location": "City, Country",
  "linkedin": "",
  "github": "",
  "summary": "2-3 sentence professional summary. Quantify impact where the user mentioned numbers. Do NOT invent numbers they didn't say.",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start - End",
      "description": "What they did.",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": "Graduation Year",
      "major": "Field of Study",
      "grade": "GPA, CGPA, percentage, or degree classification exactly as stated (e.g. 3.8/4.0, 8.5/10, 85%, 2:1, First Class, 1.3)"
    }
  ],
  "skills": ["Skill1", "Skill2"],
  "certifications": ["Cert1", "Cert2"],
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does"
    }
  ],
  "languages": ["Language1", "Language2"]
}

STRICT RULES:
- NEVER invent numbers, metrics, or achievements the user did not state.
- If the user mentioned a number (like 15% or 5+ projects), include it exactly.
- PRESERVE ALL GRADES EXACTLY in the "grade" field:
  * India: CGPA (7.2/10, 8.5/10), percentage (85-89.9%, 92%), marks
  * USA: GPA (3.8/4.0, 3.5)
  * UK: degree classification (First Class, 2:1, 2:2, Third)
  * Germany: final grade (1.3, 1.5, 2.0)
  * Any other grading format the user stated
- The "grade" field MUST contain the grade EXACTLY as written in the resume. If no grade is mentioned for an education entry, leave grade as empty string "".
- ALWAYS include professional registrations, licenses, and certifications.
- Include ALL certifications mentioned.
- Include ALL projects mentioned with descriptions.
- Include ALL languages mentioned.
- Skills: include everything listed. Do not add skills they didn't mention.
- Support international education formats: B.Tech, B.Com, M.Sc., etc. Use the exact format stated.
- Preserve currency symbols as given.
- Output ONLY the JSON object. No markdown, no explanation, no code fences.`;

// ─────────────────────────────────────────────
// Call Gemini
// ─────────────────────────────────────────────
function callGemini(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const start = Date.now();
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const latencyMs = Date.now() - start;
        if (res.statusCode !== 200) {
          reject(new Error(`Gemini API ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          const usage = parsed.usageMetadata ?? {};
          resolve({ text, inputTokens: usage.promptTokenCount ?? 0, outputTokens: usage.candidatesTokenCount ?? 0, latencyMs });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Set GEMINI_API_KEY env var");
    process.exit(1);
  }

  const finalPrompt = `${SYSTEM_PROMPT}\n\nHere is the user's pasted resume:\n\n${RESUME_TEXT}\n\nGenerate the complete resume JSON now:`;

  console.log("=".repeat(65));
  console.log("  PDF RESUME → AI EXTRACTION TEST");
  console.log("  Source: Anil_Alapati_Senior_Software_Engineer.pdf");
  console.log("  Model : " + MODEL);
  console.log("=".repeat(65));

  process.stdout.write("\n  Sending to Gemini...\n");
  const { text, inputTokens, outputTokens, latencyMs } = await callGemini(apiKey, finalPrompt);

  let resume;
  try {
    resume = JSON.parse(text);
  } catch {
    console.log("\n  INVALID JSON! Raw output:\n  " + text.slice(0, 500));
    process.exit(1);
  }

  // ─── Print resume ───
  console.log("\n  " + "-".repeat(55));
  console.log(`  NAME      : ${resume.name || "MISSING"}`);
  console.log(`  EMAIL     : ${resume.email || "MISSING"}`);
  console.log(`  PHONE     : ${resume.phone || "MISSING"}`);
  console.log(`  LOCATION  : ${resume.location || "MISSING"}`);
  console.log(`  LINKEDIN  : ${resume.linkedin || "MISSING"}`);

  if (resume.summary) {
    console.log("\n  SUMMARY");
    const words = resume.summary.split(" ");
    let line = "  ";
    for (const w of words) {
      if ((line + w).length > 65) { console.log(line); line = "  "; }
      line += w + " ";
    }
    if (line.trim()) console.log(line);
  }

  if (resume.experience?.length) {
    console.log(`\n  EXPERIENCE (${resume.experience.length} roles)`);
    for (const exp of resume.experience) {
      console.log(`  • ${exp.title} @ ${exp.company}  (${exp.duration})`);
      if (exp.description) console.log(`    ${exp.description.slice(0, 100)}`);
      if (exp.achievements?.length) {
        for (const a of exp.achievements) console.log(`    ✓ ${a}`);
      }
    }
  }

  if (resume.education?.length) {
    console.log(`\n  EDUCATION (${resume.education.length} entries)`);
    for (const edu of resume.education) {
      const grade = edu.grade || edu.gpa || edu.marks || "";
      console.log(`  • ${edu.degree}${edu.major ? " in " + edu.major : ""} — ${edu.institution} (${edu.year})${grade ? " [" + grade + "]" : ""}`);
    }
  }

  if (resume.skills?.length) {
    console.log(`\n  SKILLS (${resume.skills.length})`);
    console.log(`  ${resume.skills.join("  •  ")}`);
  }

  if (resume.certifications?.length) {
    console.log(`\n  CERTIFICATIONS (${resume.certifications.length})`);
    for (const c of resume.certifications) console.log(`  • ${c}`);
  }

  if (resume.projects?.length) {
    console.log(`\n  PROJECTS (${resume.projects.length})`);
    for (const p of resume.projects) console.log(`  • ${p.name} — ${(p.description || "").slice(0, 80)}`);
  }

  if (resume.languages?.length) {
    console.log(`\n  LANGUAGES: ${resume.languages.join(", ")}`);
  }

  // ─── Quality checks ───
  const resumeStr = JSON.stringify(resume).toLowerCase();

  const checks = [
    ["Name is Anil Alapati", resume.name === "Anil Alapati"],
    ["Email correct", resume.email === "anilalapati.66@gmail.com"],
    ["Phone has 9916179765", (resume.phone || "").includes("9916179765")],
    ["Location has Hyderabad", resumeStr.includes("hyderabad")],
    ["LinkedIn URL present", (resume.linkedin || "").includes("anilalapati")],
    ["JPMorgan in experience", resumeStr.includes("jpmorgan")],
    ["IBM in experience", resumeStr.includes("ibm")],
    ["TEKsystems in experience", resumeStr.includes("teksystems")],
    ["4 work experiences", resume.experience?.length >= 4],
    ["15% efficiency target kept", resumeStr.includes("15%")],
    ["B.Tech degree preserved", resumeStr.includes("b.tech")],
    ["Grade 7.2/10 preserved", resumeStr.includes("7.2")],
    ["Class XII 85% marks", resumeStr.includes("85")],
    ["5+ certifications", resume.certifications?.length >= 5],
    ["AWS cert included", resumeStr.includes("aws")],
    ["Azure cert included", resumeStr.includes("azure")],
    ["SwitchCV project", resumeStr.includes("switchcv")],
    ["4+ projects", resume.projects?.length >= 4],
    ["Languages: English Hindi Telugu", resume.languages?.length >= 3],
    ["14+ skills", resume.skills?.length >= 14],
    ["Python in skills", resume.skills?.some(s => s.toLowerCase().includes("python"))],
    ["Firebase in skills", resume.skills?.some(s => s.toLowerCase().includes("firebase"))],
    ["React in skills", resume.skills?.some(s => s.toLowerCase().includes("react"))],
    ["No hallucinated percentages", (() => {
      const pcts = (JSON.stringify(resume).match(/\d+%/g) || []);
      const origText = RESUME_TEXT;
      return pcts.every(p => origText.includes(p));
    })()],
  ];

  console.log("\n" + "=".repeat(65));
  console.log("  QUALITY CHECKS");
  console.log("=".repeat(65));

  let passed = 0;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "✅" : "❌"}  ${label}`);
    if (ok) passed++;
  }

  const cost = (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.30;

  console.log(`\n  Result   : ${passed}/${checks.length} checks passed`);
  console.log(`  Latency  : ${latencyMs}ms`);
  console.log(`  Tokens   : ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`);
  console.log(`  Cost     : $${cost.toFixed(4)}`);
  console.log(`\n  ${passed === checks.length ? "✅  ALL PASSED" : "❌  SOME FAILED — check above"}`);
  console.log("=".repeat(65));

  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((err) => {
  console.error("Script crashed:", err.message);
  process.exit(1);
});
