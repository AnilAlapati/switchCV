import { mergeProfileIntoResume } from "./resumeEditor";

describe("mergeProfileIntoResume", () => {
  it("should fallback to base contact info if profile contact info is missing", () => {
    const base = {
      contact: {
        email: { value: "base@example.com", visibility: "public" },
        phone: { value: "000-000-0000", visibility: "public" },
      },
    };
    const profile = {
      contact: {
        email: { visibility: "masked" as const }, // value missing
        phone: { visibility: "masked" as const }, // value missing
      },
    } as any;
    const result = mergeProfileIntoResume(base, profile);
    expect(result.contact.email.value).toBe("base@example.com");
    expect(result.contact.phone.value).toBe("000-000-0000");
  });

  it("should fallback to empty string/masked if both are missing", () => {
    const result = mergeProfileIntoResume({}, { contact: {} as any });
    expect(result.contact.email.value).toBe("");
    expect(result.contact.email.visibility).toBe("masked");
  });

  it("should use profile visibility if present", () => {
    const base = {
      contact: {
        email: { value: "base@example.com", visibility: "public" },
      },
    };
    const profile = {
      contact: {
        email: { value: "new@example.com", visibility: "request" as const },
        phone: { value: "123", visibility: "public" as const },
      },
    };
    const result = mergeProfileIntoResume(base, profile);
    expect(result.contact.email.visibility).toBe("request");
  });

  it("should skip undefined profile fields", () => {
    const base = {
      title: "Base Title",
      summary: "Base Summary",
      skills: [],
      experience: [],
      education: [],
      projects: [],
      personalInfo: { name: "Base Name" },
    };
    const profile = {}; // All fields undefined
    const result = mergeProfileIntoResume(base, profile);

    expect(result.title).toBe("Base Title");
    expect(result.summary).toBe("Base Summary");
    expect(result.skills).toEqual([]);
    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.personalInfo).toEqual({ name: "Base Name" });
  });

  it("should merge profile data into resume", () => {
    const resume = {
      skills: [{ name: "Java", level: "expert", visibility: "public" }],
      id: "1",
    };
    const profileUpdate = {
      skills: [{ name: "Kotlin", level: "intermediate", visibility: "public" }],
      experience: [
        {
          company: "New Co",
          role: "Dev",
          startDate: "2023",
          visibility: "public",
        },
      ],
    };
    // @ts-expect-error - partial mock
    const result = mergeProfileIntoResume(resume, profileUpdate);

    expect(result.skills).toEqual([
      { name: "Kotlin", level: "intermediate", visibility: "public" },
    ]);
    expect(result.experience).toEqual([
      {
        company: "New Co",
        role: "Dev",
        startDate: "2023",
        visibility: "public",
      },
    ]);
    expect(result.id).toBe("1");
  });

  it("should handle null resume", () => {
    const result = mergeProfileIntoResume(null, { skills: [] });
    expect(result.skills).toEqual([]);
  });

  it("should handle empty profile update", () => {
    const resume = { skills: ["A"] };
    const result = mergeProfileIntoResume(resume, {});
    expect(result.skills).toEqual(["A"]);
  });

  it("should deep merge contact info", () => {
    const resume = {
      contact: {
        email: { value: "old@test.com", visibility: "masked" },
        phone: { value: "123", visibility: "public" },
      },
    };
    const profileUpdate = {
      contact: { email: { value: "new@test.com", visibility: "public" } },
    };
    // @ts-expect-error - partial mock
    const result = mergeProfileIntoResume(resume, profileUpdate);

    expect(result.contact.email.value).toBe("new@test.com");
    expect(result.contact.email.visibility).toBe("public");
    expect(result.contact.phone.value).toBe("123");
  });

  it("should merge all optional fields", () => {
    const resume = {
      title: "Old Title",
      summary: "Old Summary",
      education: [
        {
          institution: "Old Uni",
          degree: "BS",
          startDate: "2020",
          visibility: "public",
        },
      ],
      projects: [
        { name: "Old Project", description: "Desc", visibility: "public" },
      ],
      personalInfo: { name: "Old Name" },
    };
    const profileUpdate = {
      title: "New Title",
      summary: "New Summary",
      education: [
        {
          institution: "New Uni",
          degree: "MS",
          startDate: "2022",
          visibility: "public",
        },
      ],
      projects: [
        {
          name: "New Project",
          description: "New Desc",
          visibility: "public",
        },
      ],
      personalInfo: { name: "New Name" },
    };
    // @ts-expect-error - partial mock
    const result = mergeProfileIntoResume(resume, profileUpdate);

    expect(result.title).toBe("New Title");
    expect(result.summary).toBe("New Summary");
    expect(result.education).toEqual([
      {
        institution: "New Uni",
        degree: "MS",
        startDate: "2022",
        visibility: "public",
      },
    ]);
    expect(result.projects).toEqual([
      { name: "New Project", description: "New Desc", visibility: "public" },
    ]);
    expect(result.personalInfo.name).toBe("New Name");
  });
});
