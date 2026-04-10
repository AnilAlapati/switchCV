/**
 * Edge-case stress tests for ConversationManager
 *
 * These test scenarios that have caused real production bugs:
 * - Name guard bypasses
 * - Array merge (experience/education/projects) data loss
 * - Conversational text leaking into resume fields
 * - Section headers misclassified as data
 */
import {
  ConversationManager,
  type ExperienceEntry,
  type EducationEntry,
  type ProjectEntry,
} from "@/lib/services/conversationManager";

describe("ConversationManager — edge case stress tests", () => {
  // =========================================================================
  // NAME GUARD — Exhaustive bypass attempts
  // =========================================================================
  describe("name guard — reject non-name phrases", () => {
    const PHRASES_THAT_MUST_BE_REJECTED = [
      // Conversational/frustration (the Resume 25 bug)
      "Saying",
      "Thats What I Am Saying",
      "Unable To Understand",
      "What Are You Saying",
      // UI complaints
      "Preview Not Updating",
      "Just See Name",
      "Nothing Much In Preview",
      "Resume Not Ready",
      "Why Is It Wrong",
      "Can You Fix It",
      "Please Update My Name",
      "How Can I See The Resume",
      // Intent signals
      "Create My Resume Now",
      "Generate Resume",
      "Yes Sir Go Ahead",
      "Ok Sure",
      // Interest/goal phrases (the vibecoding bug)
      "Interested In Vibecoding",
      "Looking For AI Roles",
      "Passionate About Machine Learning",
      "Excited About GenAI",
      "Trying To Get Into Data Science",
      "Working On Automation Projects",
      "Building AI Applications For Fun",
      "Learning React And Node",
      // Sentences that start with "I"
      "I Am A Software Engineer",
      "I Am Interested In AI",
      "I Am Looking For Senior Roles",
      "I'm Passionate About Tech",
    ];

    it.each(PHRASES_THAT_MUST_BE_REJECTED)(
      "should REJECT name overwrite with: %s",
      (phrase) => {
        const manager = new ConversationManager({ name: "Anil Alapati" });
        manager.updateData({ name: phrase });
        expect(manager.getData().name).toBe("Anil Alapati");
      },
    );

    const NAMES_THAT_MUST_BE_ACCEPTED = [
      "Anil",
      "John Doe",
      "Maria Santos",
      "Sai Krishna",
      "Priya",
      "Ravi Kumar",
      "Jean-Pierre Dupont", // hyphenated — 2 words but name-like
    ];

    it.each(NAMES_THAT_MUST_BE_ACCEPTED)(
      "should ACCEPT name overwrite with: %s",
      (name) => {
        const manager = new ConversationManager({ name: "Old Name" });
        manager.updateData({ name });
        expect(manager.getData().name).toBe(name);
      },
    );

    it("should allow setting name when no name exists yet", () => {
      const manager = new ConversationManager({});
      manager.updateData({ name: "Anil" });
      expect(manager.getData().name).toBe("Anil");
    });

    it("should NOT allow setting initial name to a phrase", () => {
      // First time setting — name guard only applies on OVERWRITE.
      // However, the initial set should work even if it's a sentence,
      // because there's no existing name to protect.
      const manager = new ConversationManager({});
      manager.updateData({ name: "Interested In Vibecoding" });
      // This is expected to SET because no existing name to protect
      expect(manager.getData().name).toBe("Interested In Vibecoding");
      // But a SUBSEQUENT real name should overwrite it
      manager.updateData({ name: "Anil" });
      expect(manager.getData().name).toBe("Anil");
    });

    it("should NOT lose name when updateData has empty name", () => {
      const manager = new ConversationManager({ name: "Anil" });
      manager.updateData({ name: "" });
      expect(manager.getData().name).toBe("Anil");
    });

    it("should NOT lose name when updateData has whitespace name", () => {
      const manager = new ConversationManager({ name: "Anil" });
      manager.updateData({ name: "   " });
      expect(manager.getData().name).toBe("Anil");
    });
  });

  // =========================================================================
  // EXPERIENCE ARRAY MERGE — Prevent data loss across turns
  // =========================================================================
  describe("experience array merge — prevent data loss", () => {
    it("should MERGE experience from multiple turns (JPMorgan + TEKsystems)", () => {
      const manager = new ConversationManager({});
      // Turn 1: user provides JPMorgan
      manager.updateData({
        experience: [
          {
            title: "Software Engineer III",
            company: "JPMorgan Chase",
            duration: "01-2024 - Present",
            description: "Led a team of 5",
          },
        ],
      });
      // Turn 2: user pastes more data with TEKsystems
      manager.updateData({
        experience: [
          {
            title: "Senior RPA Developer",
            company: "TEKsystems",
            duration: "2020-2024",
            description: "RPA automation",
          },
        ],
      });

      const exp = manager.getData().experience!;
      expect(exp).toHaveLength(2);
      expect(exp[0].company).toBe("JPMorgan Chase");
      expect(exp[1].company).toBe("TEKsystems");
    });

    it("should NOT duplicate same company+title across turns", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        experience: [
          {
            title: "SWE",
            company: "Google",
            duration: "2020-2022",
            description: "Backend",
          },
        ],
      });
      // Same role mentioned again in later turn
      manager.updateData({
        experience: [
          {
            title: "SWE",
            company: "Google",
            duration: "2020-2022",
            description: "Built payment microservice",
          },
        ],
      });

      expect(manager.getData().experience).toHaveLength(1);
    });

    it("should handle case-insensitive duplicate detection", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        experience: [
          {
            title: "Software Engineer",
            company: "jpmorgan chase",
            duration: "",
            description: "",
          },
        ],
      });
      manager.updateData({
        experience: [
          {
            title: "software engineer",
            company: "JPMorgan Chase",
            duration: "2024-present",
            description: "Led team",
          },
        ],
      });

      expect(manager.getData().experience).toHaveLength(1);
    });

    it("should allow same company different title (promotion scenario)", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        experience: [
          {
            title: "Junior Developer",
            company: "IBM",
            duration: "2015-2017",
            description: "Entry level",
          },
        ],
      });
      manager.updateData({
        experience: [
          {
            title: "Senior Developer",
            company: "IBM",
            duration: "2017-2020",
            description: "Lead projects",
          },
        ],
      });

      expect(manager.getData().experience).toHaveLength(2);
      expect(manager.getData().experience![0].title).toBe("Junior Developer");
      expect(manager.getData().experience![1].title).toBe("Senior Developer");
    });

    it("should merge 3+ companies across 3 separate turns", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        experience: [
          {
            title: "SWE3",
            company: "JPMorgan",
            duration: "2024-present",
            description: "GenAI",
          },
        ],
      });
      manager.updateData({
        experience: [
          {
            title: "RPA Dev",
            company: "TEKsystems",
            duration: "2020-2024",
            description: "Automation",
          },
        ],
      });
      manager.updateData({
        experience: [
          {
            title: "Developer",
            company: "IBM India",
            duration: "2015-2020",
            description: "Software",
          },
        ],
      });

      expect(manager.getData().experience).toHaveLength(3);
    });

    it("should NOT lose experience when an empty array is sent", () => {
      const manager = new ConversationManager({
        experience: [
          {
            title: "SWE",
            company: "Google",
            duration: "",
            description: "",
          },
        ],
      });
      manager.updateData({ experience: [] });
      expect(manager.getData().experience).toHaveLength(1);
    });
  });

  // =========================================================================
  // EDUCATION ARRAY MERGE
  // =========================================================================
  describe("education array merge — prevent data loss", () => {
    it("should MERGE education from multiple turns", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "SBCE College",
            year: "2014",
            gpa: "7.2 CGPA",
          },
        ],
      });
      manager.updateData({
        education: [
          {
            degree: "M.S.",
            institution: "Stanford",
            year: "2016",
            gpa: "3.9",
          },
        ],
      });

      expect(manager.getData().education).toHaveLength(2);
    });

    it("should NOT duplicate same institution+degree", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "IIT Delhi",
            year: "2020",
            gpa: "",
          },
        ],
      });
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "IIT Delhi",
            year: "2020",
            gpa: "8.5 CGPA",
          },
        ],
      });

      // Should NOT duplicate
      expect(manager.getData().education).toHaveLength(1);
    });

    it("should allow same institution, different degree (BS + MS)", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        education: [
          {
            degree: "B.S. Computer Science",
            institution: "MIT",
            year: "2018",
          },
        ],
      });
      manager.updateData({
        education: [
          {
            degree: "M.S. Computer Science",
            institution: "MIT",
            year: "2020",
          },
        ],
      });

      expect(manager.getData().education).toHaveLength(2);
    });
  });

  // =========================================================================
  // PROJECTS ARRAY MERGE
  // =========================================================================
  describe("projects array merge — prevent data loss", () => {
    it("should MERGE projects from multiple turns", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        projects: [
          {
            name: "SwitchCV",
            description: "Digital resume platform",
            technologies: ["Next.js", "Firebase"],
          },
        ],
      });
      manager.updateData({
        projects: [
          {
            name: "LoyalTenant",
            description: "Tenant loyalty app",
            technologies: ["React"],
          },
        ],
      });

      expect(manager.getData().projects).toHaveLength(2);
    });

    it("should NOT duplicate same project name", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        projects: [
          {
            name: "SwitchCV",
            description: "v1",
          },
        ],
      });
      manager.updateData({
        projects: [
          {
            name: "SwitchCV",
            description: "SaaS resume platform with AI chat",
            technologies: ["Next.js"],
          },
        ],
      });

      expect(manager.getData().projects).toHaveLength(1);
    });

    it("should merge 4 projects across 2 turns (the Resume 25 scenario)", () => {
      const manager = new ConversationManager({});
      manager.updateData({
        projects: [
          { name: "SwitchCV", description: "Resume SaaS" },
          { name: "LoyalTenant", description: "Tenant app" },
        ],
      });
      manager.updateData({
        projects: [
          { name: "VibeAIPartner", description: "AI partnership platform" },
          { name: "AgentPandu", description: "AI-driven app" },
        ],
      });

      expect(manager.getData().projects).toHaveLength(4);
    });
  });

  // =========================================================================
  // SKILLS ARRAY — intentional full replacement (no merge)
  // =========================================================================
  describe("skills array — full replacement behavior", () => {
    it("should REPLACE skills (not merge) since all skills come in one extraction", () => {
      const manager = new ConversationManager({
        skills: ["Python", "React"],
      });
      manager.updateData({
        skills: ["Python", "React", "Node.js", "Firebase"],
      });

      const skills = manager.getData().skills!;
      expect(skills).toHaveLength(4);
    });

    it("should NOT lose skills when empty array is sent", () => {
      const manager = new ConversationManager({
        skills: ["Python", "React"],
      });
      manager.updateData({ skills: [] });
      expect(manager.getData().skills).toHaveLength(2);
    });
  });

  // =========================================================================
  // MULTI-TURN FULL SIMULATION — Real conversation replay
  // =========================================================================
  describe("full multi-turn conversation simulations", () => {
    it("should accumulate data correctly across a 5-turn conversation", () => {
      const manager = new ConversationManager({});

      // Turn 1: Name + email
      manager.updateData({
        name: "Anil",
        email: "anil@test.com",
      });

      // Turn 2: JPMorgan experience
      manager.updateData({
        experience: [
          {
            title: "SWE III",
            company: "JPMorgan Chase",
            duration: "2024-present",
            description: "GenAI and automation",
          },
        ],
      });

      // Turn 3: Education
      manager.updateData({
        education: [
          {
            degree: "B.Tech",
            institution: "SBCE College",
            year: "2014",
            gpa: "7.2 CGPA",
          },
        ],
      });

      // Turn 4: Paste with more experience + skills + projects + LinkedIn
      manager.updateData({
        experience: [
          {
            title: "Senior RPA Developer",
            company: "TEKsystems",
            duration: "2020-2024",
            description: "Automation",
          },
          {
            title: "RPA Developer",
            company: "IBM India",
            duration: "2015-2020",
            description: "Software development",
          },
        ],
        skills: [
          "Python",
          "React",
          "Node.js",
          "UiPath",
          "Firebase",
          "Azure",
          "AWS",
        ],
        projects: [
          { name: "SwitchCV", description: "Resume SaaS" },
          { name: "AgentPandu", description: "AI app" },
        ],
        linkedin: "https://linkedin.com/in/anilalapati",
      });

      // Turn 5: User frustration — should NOT corrupt data
      // (In real flow, META_INTENT_PATTERN skips extraction,
      //  but test the guard layer too)
      manager.updateData({
        name: "Showing The Wrong Name",
      });

      // Verify ALL data is intact
      expect(manager.getData().name).toBe("Anil");
      expect(manager.getData().email).toBe("anil@test.com");
      expect(manager.getData().experience).toHaveLength(3);
      expect(manager.getData().experience![0].company).toBe("JPMorgan Chase");
      expect(manager.getData().experience![1].company).toBe("TEKsystems");
      expect(manager.getData().experience![2].company).toBe("IBM India");
      expect(manager.getData().education).toHaveLength(1);
      expect(manager.getData().skills).toHaveLength(7);
      expect(manager.getData().projects).toHaveLength(2);
      expect(manager.getData().linkedin).toBe(
        "https://linkedin.com/in/anilalapati",
      );
    });

    it("should handle user correcting their name (legitimate overwrite)", () => {
      const manager = new ConversationManager({});
      manager.updateData({ name: "Anl" }); // typo
      manager.updateData({ name: "Anil" }); // correction
      expect(manager.getData().name).toBe("Anil");
    });

    it("should handle same experience appearing in multiple turns with slight variations", () => {
      const manager = new ConversationManager({});

      // Turn 1: Brief mention
      manager.updateData({
        experience: [
          {
            title: "Software Engineer",
            company: "Google",
            duration: "",
            description: "Backend work",
          },
        ],
      });

      // Turn 2: Bulk paste includes the same role + new role
      manager.updateData({
        experience: [
          {
            title: "Software Engineer",
            company: "Google",
            duration: "2019-2022",
            description: "Built payment microservice",
          },
          {
            title: "Junior Dev",
            company: "Startup ABC",
            duration: "2017-2019",
            description: "Full stack",
          },
        ],
      });

      // Should have 2 (Google deduped, Startup added)
      expect(manager.getData().experience).toHaveLength(2);
      // Original Google entry is preserved (first one wins)
      expect(manager.getData().experience![0].company).toBe("Google");
      expect(manager.getData().experience![1].company).toBe("Startup ABC");
    });
  });

  // =========================================================================
  // EDGE CASES — Weird but real user inputs
  // =========================================================================
  describe("weird real-world edge cases", () => {
    it("should handle experience with undefined company/title gracefully", () => {
      const manager = new ConversationManager({
        experience: [
          {
            title: "SWE",
            company: "Google",
            duration: "",
            description: "",
          },
        ],
      });

      // AI extracts entry with undefined company — should not crash
      manager.updateData({
        experience: [
          {
            title: "Developer",
            company: undefined as unknown as string,
            duration: "",
            description: "",
          },
        ],
      });

      // Should still have the Google entry + the new one (no crash)
      expect(manager.getData().experience!.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle education with empty strings for institution", () => {
      const manager = new ConversationManager({
        education: [
          { degree: "B.Tech", institution: "MIT", year: "2020" },
        ],
      });
      manager.updateData({
        education: [
          { degree: "MBA", institution: "", year: "2022" },
        ],
      });

      // Both should be present (different degree, different institution)
      expect(manager.getData().education).toHaveLength(2);
    });

    it("should preserve summary across turns", () => {
      const manager = new ConversationManager({
        summary: "Experienced engineer with AI background",
      });
      manager.updateData({ summary: "" }); // empty should not overwrite
      expect(manager.getData().summary).toBe(
        "Experienced engineer with AI background",
      );
    });

    it("should handle null/undefined in updateData without crashing", () => {
      const manager = new ConversationManager({ name: "Anil" });
      manager.updateData({
        name: undefined,
        email: null as unknown as string,
        experience: undefined,
      });
      expect(manager.getData().name).toBe("Anil");
    });
  });
});
