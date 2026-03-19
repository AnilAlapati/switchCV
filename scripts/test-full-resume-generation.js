#!/usr/bin/env node
/**
 * Full Resume Generation Test
 *
 * Shows the COMPLETE picture: conversation → AI generates a full resume.
 * Prints the conversation AND the final resume side by side so you can
 * judge quality with your own eyes.
 *
 * Usage:
 *   GEMINI_API_KEY=<key> node scripts/test-full-resume-generation.js
 *   GEMINI_API_KEY=<key> node scripts/test-full-resume-generation.js --case 3
 *   GEMINI_API_KEY=<key> node scripts/test-full-resume-generation.js --all
 *
 * Exits 0 on pass, 1 on failure.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const https = require("https");

// ─────────────────────────────────────────────
// CLI flags
// ─────────────────────────────────────────────
const runAll = process.argv.includes("--all");
const caseIndex = process.argv.indexOf("--case");
const singleCase = caseIndex !== -1 ? parseInt(process.argv[caseIndex + 1], 10) - 1 : null;
const MODEL = "gemini-2.5-flash-lite"; // was gemini-2.0-flash-lite (discontinued June 1 2026)

// ─────────────────────────────────────────────
// 5 diverse personas with realistic conversations
// ─────────────────────────────────────────────
const TEST_PERSONAS = [
  {
    label: "Software Engineer — 5 years, tech industry",
    conversation: [
      { role: "assistant", text: "Hey! I'm your Career Coach AI. Let's build your resume in about 3 minutes.\n\nWhat's your name, email, and what kind of role are you targeting?" },
      { role: "user",      text: "Hi, I'm Alex Thompson, alex.thompson@gmail.com. I'm looking for Senior Software Engineer roles." },
      { role: "assistant", text: "Great to meet you Alex! Senior SWE — nice. Tell me about your most impactful work experience. Where have you worked and what did you build?" },
      { role: "user",      text: "I've been at Stripe for 3 years as a Software Engineer. I worked on the payments infrastructure team. I built a retry system that reduced failed payments by 23%. Before that I was at a startup called Finly for 2 years doing full-stack work in React and Node." },
      { role: "assistant", text: "That's impressive work — reducing failed payments by 23% is a concrete, meaningful result! Education?" },
      { role: "user",      text: "B.S. Computer Science from Georgia Tech, graduated 2019." },
      { role: "assistant", text: "Any skills or technologies you want highlighted?" },
      { role: "user",      text: "Python, Go, TypeScript, React, PostgreSQL, Kubernetes, AWS. Also I'm based in San Francisco." },
      { role: "assistant", text: "Perfect, I have everything I need. Creating your resume now!" },
    ],
    checkFor: ["Alex Thompson", "Stripe", "23%", "Georgia Tech", "Kubernetes"],
  },
  {
    label: "Career changer — Teacher moving into Product Management",
    conversation: [
      { role: "assistant", text: "Hey! Let's build your resume. What's your name, email, and what role are you targeting?" },
      { role: "user",      text: "I'm Sarah Okonkwo, sarah.okonkwo@outlook.com. I want to transition into Product Management." },
      { role: "assistant", text: "Exciting move Sarah! Tell me about your current or most recent work experience." },
      { role: "user",      text: "I've been a high school math teacher for 6 years at Lincoln High School in Chicago. I recently led a project to roll out a new digital learning platform to 800 students across the school. I managed the vendor relationship, trained 30 teachers, and got the adoption rate to 85% within 3 months." },
      { role: "assistant", text: "That's actually really strong PM experience — stakeholder management, rollout, adoption metrics. Did you study anything relevant?" },
      { role: "user",      text: "I have a B.Ed in Mathematics from University of Illinois, 2017. I also completed a Google Project Management certificate this year." },
      { role: "user",      text: "Skills: stakeholder management, data analysis, Excel, Google Workspace, Figma basics, Agile." },
      { role: "assistant", text: "Great profile. Generating your PM-focused resume now!" },
    ],
    checkFor: ["Sarah Okonkwo", "Lincoln High", "800 students", "85%", "Google Project Management"],
  },
  {
    label: "Fresh graduate — No work experience",
    conversation: [
      { role: "assistant", text: "Hi! Let's get your resume built. What's your name, email, and role you're targeting?" },
      { role: "user",      text: "I'm Priya Patel, priya.patel@gmail.com. I just graduated and looking for entry-level Data Analyst jobs." },
      { role: "assistant", text: "Congrats on graduating Priya! What work or internship experience do you have?" },
      { role: "user",      text: "I had a 2-month internship at a local marketing agency called BrightAds. I helped them build a dashboard in Python and Tableau to track their ad campaign performance. I also did two university projects — one where I analysed Airbnb pricing data using pandas and scikit-learn, and another where I built a SQL database for a fictional e-commerce store." },
      { role: "assistant", text: "Solid for an entry-level candidate! Where did you study?" },
      { role: "user",      text: "B.S. Statistics from University of Michigan, graduated May 2025. GPA 3.8." },
      { role: "user",      text: "Skills: Python, SQL, Tableau, Excel, R, pandas, scikit-learn, Power BI. I'm based in Ann Arbor, Michigan." },
    ],
    checkFor: ["Priya Patel", "BrightAds", "Tableau", "University of Michigan", "3.8"],
  },
  {
    label: "Executive — 20 years, finance sector",
    conversation: [
      { role: "assistant", text: "Let's build your resume. Name, email, and target role?" },
      { role: "user",      text: "James Whitfield, j.whitfield@whitfieldcap.com. Looking for CFO or VP Finance roles." },
      { role: "assistant", text: "Tell me about your most recent experience." },
      { role: "user",      text: "I'm currently CFO at Meridian Logistics, $400M revenue company, for the past 5 years. I led a $60M Series C fundraise, managed a finance team of 35 people, and drove EBITDA improvement from 8% to 14% over 3 years. Before that I was VP Finance at Cardinal Health for 8 years, and before that Controller at a manufacturing firm." },
      { role: "assistant", text: "Very strong track record. Education?" },
      { role: "user",      text: "MBA from Wharton 2004, B.S. Accounting from Penn State 2001. CPA certified." },
      { role: "user",      text: "Skills: Financial modelling, M&A, capital markets, SAP, Oracle Financials, board reporting. Based in New York." },
    ],
    checkFor: ["James Whitfield", "Meridian Logistics", "$60M", "14%", "Wharton", "CPA"],
  },
  {
    label: "Freelancer with career gaps — Graphic Designer (USA)",
    conversation: [
      { role: "assistant", text: "Hi! What's your name, email, and the role you're going for?" },
      { role: "user",      text: "Hey, I'm Maya Rodriguez, maya.r.design@gmail.com. Looking for Senior Graphic Designer or Art Director positions." },
      { role: "assistant", text: "Tell me about your experience Maya." },
      { role: "user",      text: "I've been freelancing for the past 4 years. Main clients include Nike, a couple of Shopify brands, and some local restaurants. I took a year off in 2022 to care for a family member. Before freelancing I worked full time at a branding agency called Collective Studio in LA for 3 years." },
      { role: "assistant", text: "Good mix of agency and freelance experience. Any education?" },
      { role: "user",      text: "BFA in Graphic Design from ArtCenter College of Design, graduated 2016." },
      { role: "user",      text: "Skills: Figma, Adobe Illustrator, Photoshop, InDesign, After Effects, brand identity, typography, motion graphics. Based in Los Angeles." },
    ],
    checkFor: ["Maya Rodriguez", "Nike", "Collective Studio", "ArtCenter", "Figma"],
  },

  // ─────────────────────────────────────────────
  // INTERNATIONAL PERSONAS
  // ─────────────────────────────────────────────

  {
    label: "🇮🇳 Indian Software Developer — B.Tech, CGPA, Infosys background",
    conversation: [
      { role: "assistant", text: "Hey! I'm your Career Coach AI. Let's build your resume. What's your name, email, and what kind of role are you targeting?" },
      { role: "user",      text: "Hi, my name is Rahul Sharma, rahul.sharma@gmail.com. I'm targeting Senior Software Developer roles." },
      { role: "assistant", text: "Great Rahul! Tell me about your work experience." },
      { role: "user",      text: "I worked at Infosys for 3 years as a Systems Engineer in Bangalore. I was working on the banking domain, handling transaction processing systems in Java and Spring Boot. Then I moved to Flipkart as a Software Developer for 2 years where I built microservices for the checkout flow. I improved the checkout API response time from 800ms to 200ms." },
      { role: "assistant", text: "Nice progression! What about your education?" },
      { role: "user",      text: "I did my B.Tech in Computer Science from NIT Warangal, graduated 2019. My CGPA was 8.5 out of 10. Before that I did my 12th from Kendriya Vidyalaya with 92% marks." },
      { role: "assistant", text: "Skills or certifications?" },
      { role: "user",      text: "Java, Spring Boot, Python, MySQL, MongoDB, Redis, Docker, Kafka, AWS. I also have AWS Solutions Architect Associate certification. Currently serving 90 days notice period at Flipkart. Based in Bangalore." },
    ],
    checkFor: ["Rahul Sharma", "Infosys", "Flipkart", "B.Tech", "NIT Warangal", "8.5", "200ms"],
  },

  {
    label: "🇬🇧 UK Marketing Manager — 2:1 degree, A-levels background",
    conversation: [
      { role: "assistant", text: "Hey! Let's build your CV. What's your name, email, and what role are you looking for?" },
      { role: "user",      text: "I'm Charlotte Evans, charlotte.evans@gmail.co.uk. I'm looking for Head of Marketing or Marketing Director roles." },
      { role: "assistant", text: "Brilliant Charlotte! Tell me about your experience." },
      { role: "user",      text: "I've been Marketing Manager at Deliveroo in London for 3 years. I led their UK brand campaigns and grew the email subscriber base from 200K to 1.2M. I managed a team of 8 and a budget of £2.5M per quarter. Before that I was at Innocent Drinks as a Digital Marketing Executive for 2 years." },
      { role: "assistant", text: "Fantastic results! What about your education?" },
      { role: "user",      text: "I have a BA in English Literature from University of Edinburgh, graduated 2018 with a 2:1. I also have a CIM Diploma in Professional Marketing." },
      { role: "assistant", text: "Any particular skills you want to highlight?" },
      { role: "user",      text: "Brand strategy, campaign management, Google Analytics, HubSpot, social media marketing, SEO, content strategy, team leadership. I'm based in London." },
    ],
    checkFor: ["Charlotte Evans", "Deliveroo", "1.2M", "Edinburgh", "2:1", "£2.5M"],
  },

  {
    label: "🇮🇳 Indian MBA Graduate — IIM, fresher with internships",
    conversation: [
      { role: "assistant", text: "Hi! Let's build your resume. Name, email, and target role?" },
      { role: "user",      text: "I'm Ananya Krishnan, ananya.k@gmail.com. I'm targeting Management Consulting or Strategy Analyst roles." },
      { role: "assistant", text: "Tell me about your experience Ananya." },
      { role: "user",      text: "I just completed my MBA from IIM Ahmedabad, class of 2025. During my MBA I did a summer internship at McKinsey for 2 months where I worked on a market entry strategy project for a FMCG client. Before MBA I worked at TCS as a Business Analyst for 2 years in Chennai." },
      { role: "assistant", text: "That's excellent! Education details?" },
      { role: "user",      text: "MBA from IIM Ahmedabad, 2025, CGPA 3.6 out of 4.33. B.Com from Loyola College Chennai, 2022, scored 85%. I also did a case competition — won first place at the IIM-A National Case Competition." },
      { role: "assistant", text: "Skills?" },
      { role: "user",      text: "Strategy frameworks, financial modelling, Excel, PowerPoint, Python for data analysis, Tableau, market research. Fluent in English, Tamil, and Hindi. Based in Mumbai." },
    ],
    checkFor: ["Ananya Krishnan", "IIM Ahmedabad", "McKinsey", "TCS", "85%", "3.6"],
  },

  {
    label: "🇬🇧 UK Junior Developer — University graduate, bootcamp",
    conversation: [
      { role: "assistant", text: "Let's get your CV sorted! Name, email, and target role?" },
      { role: "user",      text: "Hi, I'm Oliver Jenkins, oliver.jenkins@outlook.com. Looking for Junior Software Developer or Graduate Developer roles." },
      { role: "assistant", text: "Tell me what experience you have Oliver." },
      { role: "user",      text: "I did a 12-week coding bootcamp at Le Wagon London last year. For my final project I built a full-stack marketplace app using Ruby on Rails and JavaScript, deployed on Heroku. Before the bootcamp I worked as a recruitment consultant at Hays for 1 year, which is where I got interested in tech." },
      { role: "assistant", text: "Good career change path! Education?" },
      { role: "user",      text: "BSc Geography from University of Leeds, graduated 2022 with a 2:2. A-levels: Geography A, Maths B, Economics B from Eton College." },
      { role: "assistant", text: "Skills?" },
      { role: "user",      text: "Ruby, Rails, JavaScript, HTML, CSS, PostgreSQL, Git, Heroku, basic React. Also communication skills from my recruitment background. Based in Manchester." },
    ],
    checkFor: ["Oliver Jenkins", "Le Wagon", "Ruby on Rails", "Leeds", "2:2", "Hays"],
  },

  {
    label: "🇩🇪 German Engineer — TU degree, working in automotive",
    conversation: [
      { role: "assistant", text: "Hi! Let's build your resume. What's your name, email, and target role?" },
      { role: "user",      text: "I'm Stefan Müller, stefan.mueller@web.de. Looking for Lead Mechanical Engineer or Engineering Manager positions." },
      { role: "assistant", text: "Tell me about your experience Stefan." },
      { role: "user",      text: "I've been at BMW in Munich for 6 years. Started as a Design Engineer working on powertrain components, then got promoted to Senior Engineer leading a team of 4 on e-mobility projects. I led the development of a new battery housing that reduced weight by 15% while maintaining crash safety standards. Before BMW I spent 2 years at Bosch in Stuttgart on sensor systems." },
      { role: "assistant", text: "Impressive! Education?" },
      { role: "user",      text: "M.Sc. in Mechanical Engineering from TU Munich, graduated 2016 with final grade 1.3. Bachelor from TU Munich as well, 2014, grade 1.5." },
      { role: "assistant", text: "Skills?" },
      { role: "user",      text: "CATIA V5, ANSYS, SolidWorks, FEM analysis, GD&T, project management, Python for simulation, SAP. Languages: German native, English fluent, French basic. Based in Munich." },
    ],
    checkFor: ["Stefan Müller", "BMW", "15%", "TU Munich", "1.3", "Bosch"],
  },

  {
    label: "🇳🇬 Nigerian Accountant — ICAN certified, Big 4 experience",
    conversation: [
      { role: "assistant", text: "Let's build your resume! Name, email, and target role?" },
      { role: "user",      text: "Hi, I'm Chidinma Okafor, chidinma.okafor@yahoo.com. I'm targeting Senior Accountant or Finance Manager roles." },
      { role: "assistant", text: "Tell me about your experience Chidinma." },
      { role: "user",      text: "I've been at Deloitte Lagos for 3 years doing external audits for banking clients. I've audited companies with assets over ₦500B. I also led a team of 5 juniors on the GTBank audit engagement. Before Deloitte I was an intern at PwC Lagos for 6 months." },
      { role: "assistant", text: "Strong Big 4 background! Education?" },
      { role: "user",      text: "B.Sc Accounting from University of Lagos, graduated 2020, First Class Honours with CGPA 4.7 out of 5.0. I'm also ICAN certified — passed all exams in first attempt." },
      { role: "assistant", text: "Skills?" },
      { role: "user",      text: "IFRS, financial reporting, audit planning, Excel advanced, SAP FICO, data analytics with Power BI, tax compliance. Based in Lagos, Nigeria." },
    ],
    checkFor: ["Chidinma Okafor", "Deloitte", "University of Lagos", "4.7", "ICAN", "GTBank"],
  },

  {
    label: "🇦🇺 Australian Nurse — Regional experience, AHPRA registered",
    conversation: [
      { role: "assistant", text: "Hi! Let's get your resume built. Name, email, and target role?" },
      { role: "user",      text: "I'm Emily Watson, emily.watson@hotmail.com.au. Looking for Clinical Nurse Specialist or Nurse Unit Manager roles." },
      { role: "assistant", text: "Tell me about your experience Emily." },
      { role: "user",      text: "I've been a Registered Nurse for 7 years. Currently at Royal Melbourne Hospital in the Emergency Department for 4 years. I implemented a triage fast-track system that reduced wait times by 30%. Before that I was at a rural hospital in Bendigo for 3 years — I was the only senior nurse on night shifts." },
      { role: "assistant", text: "Great experience mix! Education?" },
      { role: "user",      text: "Bachelor of Nursing from Monash University, graduated 2017. I also have a Graduate Certificate in Emergency Nursing from Deakin University, 2021. AHPRA registered, current." },
      { role: "assistant", text: "Any specific skills?" },
      { role: "user",      text: "Emergency triage, IV cannulation, wound management, trauma care, patient assessment, clinical leadership, ACLS certified, mentoring new graduates. Based in Melbourne." },
    ],
    checkFor: ["Emily Watson", "Royal Melbourne", "30%", "Monash University", "AHPRA", "Bendigo"],
  },
];

// ─────────────────────────────────────────────
// The same system prompt the app uses in production
// ─────────────────────────────────────────────
const RESUME_SYSTEM_PROMPT = `You are a Career Coach AI helping someone create a standout resume through a quick, friendly conversation.

YOUR GOAL: Generate a complete, professional resume as a JSON object.

When you have enough information (name + email + any experience or education), output ONLY a valid JSON object with this structure:

{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "",
  "location": "City, State",
  "linkedin": "",
  "github": "",
  "summary": "2-3 sentence professional summary. Quantify impact where the user mentioned numbers. Do NOT invent numbers they didn't say.",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Start Year - End Year (or Present)",
      "description": "What they did in this role.",
      "achievements": ["Specific achievement 1", "Specific achievement 2"]
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
  "skills": ["Skill1", "Skill2", "Skill3"]
}

STRICT RULES:
- NEVER invent numbers, metrics, or achievements the user did not state.
- If the user mentioned a number (like 23% or $60M or ₦500B or £2.5M), include it exactly as they said it.
- PRESERVE ALL GRADES EXACTLY in the "grade" field:
  * India: CGPA (8.5/10, 3.6/4.33), percentage (85%, 92%)
  * USA: GPA (3.8/4.0, 3.5)
  * UK: degree classification (First Class, 2:1, 2:2, Third)
  * Germany: final grade (1.3, 1.5, 2.0)
  * Any other grading format the user stated
- The "grade" field MUST contain the grade exactly as the user said it. If no grade is mentioned, set grade to "".
- Skills: include everything the user listed. Also infer obvious skills from their experience if they forgot to list them.
- Certifications: if user mentions certifications (CPA, ICAN, AHPRA, AWS, CIM, etc.), include them — either in education or skills.
- For career changers, write a summary that bridges their past experience to the new target role.
- For gaps in employment, do NOT hide them. List freelance or caregiving honestly.
- Support international education formats: B.Tech, M.Sc., BA, BSc, BFA, B.Com, MBA, etc.
- ALWAYS include professional registrations, licenses, and certifications the user mentions (e.g. AHPRA, CPA, CFA, ICAN, PMP, AWS certified, bar admission). Add them either as skills, education, or a separate note — NEVER drop them.
- If user mentions notice period, languages spoken, or location — include them if relevant.
- Output ONLY the JSON object. No markdown, no explanation, no \`\`\`json fences.`;

// ─────────────────────────────────────────────
// Call Gemini
// ─────────────────────────────────────────────
function callGemini(apiKey, conversationHistory) {
  return new Promise((resolve, reject) => {
    // Build the prompt: show entire conversation, then ask for resume JSON
    const conversationText = conversationHistory
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n\n");

    const finalPrompt = `${RESUME_SYSTEM_PROMPT}

Here is the full conversation:

${conversationText}

Based on this conversation, generate the complete resume JSON now:`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
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
          resolve({
            text,
            inputTokens: usage.promptTokenCount ?? 0,
            outputTokens: usage.candidatesTokenCount ?? 0,
            latencyMs,
          });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
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
// Render: print conversation + resume side by side
// ─────────────────────────────────────────────
function printConversation(persona) {
  console.log("\n  📋 CONVERSATION:");
  for (const msg of persona.conversation) {
    const prefix = msg.role === "user" ? "  👤 User     :" : "  🤖 Assistant:";
    const lines = msg.text.split("\n");
    console.log(`${prefix} ${lines[0]}`);
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) console.log(`               ${lines[i]}`);
    }
  }
}

function printResume(resume) {
  console.log("\n  📄 GENERATED RESUME:");
  console.log(`  ┌─────────────────────────────────────────────────────┐`);
  console.log(`  │  ${(resume.name || "Unknown").padEnd(51)}│`);
  if (resume.email)    console.log(`  │  📧 ${(resume.email || "").padEnd(48)}│`);
  if (resume.phone)    console.log(`  │  📞 ${(resume.phone || "").padEnd(48)}│`);
  if (resume.location) console.log(`  │  📍 ${(resume.location || "").padEnd(48)}│`);
  if (resume.linkedin) console.log(`  │  🔗 ${(resume.linkedin || "").padEnd(48)}│`);
  console.log(`  └─────────────────────────────────────────────────────┘`);

  if (resume.summary) {
    console.log(`\n  SUMMARY`);
    // Word-wrap at 60 chars
    const words = resume.summary.split(" ");
    let line = "  ";
    for (const word of words) {
      if ((line + word).length > 62) { console.log(line); line = "  "; }
      line += word + " ";
    }
    if (line.trim()) console.log(line);
  }

  if (resume.experience?.length) {
    console.log(`\n  EXPERIENCE`);
    for (const exp of resume.experience) {
      console.log(`  • ${exp.title} @ ${exp.company}  (${exp.duration})`);
      if (exp.description) console.log(`    ${exp.description.slice(0, 80)}${exp.description.length > 80 ? "..." : ""}`);
      if (exp.achievements?.length) {
        for (const ach of exp.achievements) {
          console.log(`    ✓ ${ach}`);
        }
      }
    }
  }

  if (resume.education?.length) {
    console.log(`\n  EDUCATION`);
    for (const edu of resume.education) {
      const grade = edu.grade || "";
      console.log(`  • ${edu.degree}${edu.major ? ` in ${edu.major}` : ""} — ${edu.institution} (${edu.year})${grade ? ` [${grade}]` : ""}`);
    }
  }

  if (resume.skills?.length) {
    console.log(`\n  SKILLS`);
    console.log(`  ${resume.skills.join("  •  ")}`);
  }
}

function scoreResume(resume, persona) {
  const issues = [];
  const passed = [];

  // Must-haves
  if (!resume.name)    issues.push("Missing name");
  else passed.push("Has name");

  if (!resume.email)   issues.push("Missing email");
  else passed.push("Has email");

  if (!resume.summary || resume.summary.length < 30)
    issues.push("Summary missing or too short");
  else passed.push("Has summary");

  if (!resume.experience?.length && !resume.education?.length)
    issues.push("No experience or education");
  else passed.push("Has experience/education");

  if (!resume.skills?.length)
    issues.push("No skills listed");
  else passed.push(`Has ${resume.skills.length} skills`);

  // Check that key facts from the conversation appear in the output
  for (const keyword of persona.checkFor) {
    const resumeStr = JSON.stringify(resume).toLowerCase();
    if (resumeStr.includes(keyword.toLowerCase())) {
      passed.push(`Found "${keyword}"`);
    } else {
      issues.push(`MISSING key fact: "${keyword}" — user said it but AI ignored it`);
    }
  }

  // Hallucination check: look for suspicious made-up numbers not in conversation
  const conversationText = persona.conversation.map((m) => m.text).join(" ");
  const percentagesInResume = (JSON.stringify(resume).match(/\d+%/g) || []);
  for (const pct of percentagesInResume) {
    if (!conversationText.includes(pct)) {
      issues.push(`Possible hallucination: "${pct}" not mentioned in conversation`);
    }
  }

  return { passed, issues };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌  GEMINI_API_KEY not set.");
    process.exit(1);
  }

  // Which cases to run
  let casesToRun;
  if (runAll) {
    casesToRun = TEST_PERSONAS.map((p, i) => ({ persona: p, index: i }));
  } else if (singleCase !== null && singleCase >= 0 && singleCase < TEST_PERSONAS.length) {
    casesToRun = [{ persona: TEST_PERSONAS[singleCase], index: singleCase }];
  } else {
    // Default: run the first 3 for a quick check
    casesToRun = TEST_PERSONAS.slice(0, 3).map((p, i) => ({ persona: p, index: i }));
  }

  console.log("═".repeat(65));
  console.log("  FULL RESUME GENERATION TEST");
  console.log(`  Model : ${MODEL}   |   Cases: ${casesToRun.length}`);
  console.log("═".repeat(65));

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let allPassed = true;
  const summary = [];

  for (const { persona, index } of casesToRun) {
    console.log(`\n${"─".repeat(65)}`);
    console.log(`  CASE ${index + 1}: ${persona.label}`);
    console.log("─".repeat(65));

    printConversation(persona);

    process.stdout.write("\n  ⏳ Sending to Gemini...\n");

    try {
      const { text, inputTokens, outputTokens, latencyMs } = await callGemini(apiKey, persona.conversation);
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      // Parse the JSON resume
      let resume;
      try {
        resume = JSON.parse(text);
      } catch {
        console.log(`\n  ❌ AI returned invalid JSON. Raw output:\n  ${text.slice(0, 300)}`);
        summary.push({ label: persona.label, pass: false, issues: ["AI returned invalid JSON"] });
        allPassed = false;
        continue;
      }

      printResume(resume);

      const { passed, issues } = scoreResume(resume, persona);

      console.log(`\n  QUALITY CHECK  (${latencyMs}ms)`);
      for (const p of passed) console.log(`  ✅  ${p}`);
      for (const issue of issues) console.log(`  ❌  ${issue}`);

      const casePass = issues.length === 0;
      if (!casePass) allPassed = false;
      summary.push({ label: persona.label, pass: casePass, issues });

    } catch (err) {
      console.log(`\n  ❌ ERROR: ${err.message}`);
      summary.push({ label: persona.label, pass: false, issues: [err.message] });
      allPassed = false;
    }

    // Small pause between API calls
    if (casesToRun.indexOf(casesToRun.find(c => c.index === index)) < casesToRun.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // ─────────────────────────────────────────────
  // Final report
  // ─────────────────────────────────────────────
  const cost =
    (totalInputTokens / 1_000_000) * 0.075 +
    (totalOutputTokens / 1_000_000) * 0.30;

  console.log(`\n${"═".repeat(65)}`);
  console.log("  SUMMARY");
  console.log("═".repeat(65));
  for (const s of summary) {
    const icon = s.pass ? "✅" : "❌";
    console.log(`  ${icon}  ${s.label}`);
    if (!s.pass) {
      for (const issue of s.issues) {
        console.log(`      └─ ${issue}`);
      }
    }
  }

  const passed = summary.filter(s => s.pass).length;
  console.log(`\n  Result  : ${passed}/${summary.length} cases passed`);
  console.log(`  Tokens  : ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`  Cost    : $${cost.toFixed(4)}`);
  console.log(`\n  ${allPassed ? "✅  ALL PASSED — resume generation is working correctly." : "❌  SOME CASES FAILED — check issues above."}`);
  console.log("═".repeat(65));

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("💥 Script crashed:", err.message);
  process.exit(1);
});
