/**
 * End-to-end verification: runs the EXACT text Anil pasted through
 * both ExperienceExtractor and full conversation extraction.
 * Confirms the skills-as-experience bug is fixed.
 */

import { ExperienceExtractor } from "@/lib/services/extractors/ExperienceExtractor";
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";

// The exact big paste from the chat session
const BIG_PASTE = `An introspective Senior Software Engineer with
over 10 years of proficient experience in
automation and artificial intelligence. Currently
shaping innovative solutions at JPMorgan Chase
while passionately pursuing self-built projects like
SwitchCV.com to transform recruitment
processes. Embracing cutting-edge technologies,
I aim to foster impactful advancements in the tech
landscape.

Microservices SQL React.js Python
Angular Javascript Azure Node.js
API Nextjs UiPath Firebase
Prompt Engineering Vibe coding

CERTIFICATION
Automation Anywhere Certified Advanced
RPA Professional
Automation Anywhere Master Certified
Professional v11.0
Microsoft Certified Azure Data Scientist
Associate
Valid upto June 2025
Microsoft certified: azure ai fundamentals
AWS Certified Cloud Practitioner
Valid upto February 2027

Software Engineer III
JPMorgan Chase & Co
01-2024 - Present
- Led a team of 5 delivering enterprise automation
and GenAI solutions, exceeding efficiency targets
by 15% across 5+ projects.
- Built an MVP LLM-
generated feedback agent, designing resilient
architectures with monitoring, guardrails, and cost
controls.
- Authored patents and GenAI
innovation proposals, influencing firm-wide AI
adoption.
Software Engineer II
JPMorgan Chase & Co
10-2020 - 12-2023
- Delivered 15+ automations, generating multi-
million-dollar business value.
- Ensured InfoSec-
compliant delivery for all projects.
Senior RPA Developer
TEKsystems
03-2020 - 10-2020
- Developed automation solutions based on
business requirements.
- Coordinated with teams
(+91) 9916179765
Hyderabad, INDIA
anilalapati.66@gmail.com
10 Years 8 Months of experience
KEY SKILLS
Microservices SQL React.js Python
Angular Javascript Azure Node.js
API Nextjs UiPath Firebase
Prompt Engineering Vibe coding
CERTIFICATION
Automation Anywhere Certified Advanced
RPA Professional
Automation Anywhere Master Certified
Professional v11.0
Microsoft Certified Azure Data Scientist
Associate
Valid upto June 2025
Microsoft certified: azure ai fundamentals
AWS Certified Cloud Practitioner
Valid upto February 2027
PROJECTS
SwitchCV.com
83 Days
- Designed and built a SaaS application for
sharing digital resumes.
- Implemented features
for efficient candidate sourcing for recruiters.
LoyalTenant
30 Days
- Developed a tenant loyalty application to
improve resident engagement.
- Integrated
feedback systems powered by AI for continuous
improvement.
to deliver solutions effectively.
RPA Developer
IBM India Pvt Ltd
05-2015 - 03-2020
- Analyzed user needs and developed software
solutions.
- Delivered post-implementation
maintenance and enhancements for clients.`;

// The full conversation as it happened
const FULL_CONVERSATION = [
  { content: "Hey there, this is Anil", isUser: true },
  {
    content:
      "Hey Anil! Great to meet you. To get started, could you please share your email and the specific job title you're targeting?",
    isUser: false,
  },
  {
    content:
      "anilalapati.66@gmail.com and i am targeting Applied AI or Gen AI roles",
    isUser: true,
  },
  {
    content: "Great choice! Thanks Anil. Now, let's dive into your experience.",
    isUser: false,
  },
  {
    content:
      "I vibeCoded Switchcv.com, From idea to execution. Everything is done by me. I wanted to create a platform where people can share the link which has the digital resume",
    isUser: true,
  },
  { content: "Founder and CEO", isUser: true },
  { content: "B.Tech 2010-2014 with 72%", isUser: true },
  {
    content: "Its not a great one, but you can write S.B.C.E",
    isUser: true,
  },
  { content: BIG_PASTE, isUser: true },
];

describe("End-to-end verification: Anil's exact chat data", () => {
  // -------------------------------------------------------------------------
  // THE BUG: "API Nextjs UiPath Firebase" was extracted as a job title
  // and "Prompt Engineering Vibe coding" as a company name.
  // -------------------------------------------------------------------------

  describe("ExperienceExtractor on big paste alone", () => {
    const extractor = new ExperienceExtractor();

    it("does NOT produce phantom experience from skill rows", () => {
      const result = extractor.extract(BIG_PASTE, "experience");

      if (result.experience) {
        for (const entry of result.experience) {
          expect(entry.title).not.toBe("API Nextjs UiPath Firebase");
          expect(entry.company).not.toBe("Prompt Engineering Vibe coding");
        }
      }
    });

    it("extracts a real experience entry if any", () => {
      const result = extractor.extract(BIG_PASTE, "experience");
      // We expect it to find at least one of the real entries
      // (Software Engineer III at JPMorgan, or Senior RPA Developer at TEKsystems, etc.)
      if (result.experience && result.experience.length > 0) {
        const entry = result.experience[0];
        const validTitles = [
          "Software Engineer III",
          "Software Engineer II",
          "Senior RPA Developer",
          "RPA Developer",
        ];
        const validCompanies = [
          "JPMorgan Chase",
          "JPMorgan Chase & Co",
          "TEKsystems",
          "IBM India Pvt Ltd",
          "IBM India",
        ];
        const titleMatch = validTitles.some(
          (t) => entry.title.includes(t) || t.includes(entry.title),
        );
        const companyMatch = validCompanies.some(
          (c) => entry.company.includes(c) || c.includes(entry.company),
        );
        expect(titleMatch || companyMatch).toBe(true);
      }
    });
  });

  describe("Full conversation extraction", () => {
    it("does NOT produce phantom experience from skill rows", () => {
      const result =
        ResumeDataExtractor.extractFromConversation(FULL_CONVERSATION);

      expect(result.data.experience).toBeDefined();
      for (const entry of result.data.experience || []) {
        expect(entry.title).not.toBe("API Nextjs UiPath Firebase");
        expect(entry.company).not.toBe("Prompt Engineering Vibe coding");
      }
    });

    it("extracts the correct email", () => {
      const result =
        ResumeDataExtractor.extractFromConversation(FULL_CONVERSATION);
      expect(result.data.email).toBe("anilalapati.66@gmail.com");
    });

    it("extracts skills as skills, not as experience", () => {
      const result =
        ResumeDataExtractor.extractFromConversation(FULL_CONVERSATION);

      const skills = result.data.skills || [];
      // At least some of these tech keywords should appear in skills
      const expectedSkills = ["React.js", "Python", "Firebase", "SQL"];
      const foundInSkills = expectedSkills.filter((s) =>
        skills.some((skill) => skill.toLowerCase().includes(s.toLowerCase())),
      );
      expect(foundInSkills.length).toBeGreaterThan(0);
    });
  });
});
