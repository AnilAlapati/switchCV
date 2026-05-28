import { sanitizeResumeForPublicView } from "@/lib/utils/resumeVisibility";

describe("resumeVisibility Utilities - sanitizeResumeForPublicView", () => {
  const baseResume = {
    userId: "user-1",
    summary: "Full stack engineer",
    contact: {
      email: { value: "john@example.com", visibility: "public" as const },
      phone: { value: "555-123-4567", visibility: "public" as const },
    },
    personalInfo: {
      email: "john@example.com",
      phone: "555-123-4567",
      name: "John Doe",
    },
  };

  it("masks email, phone, and name values", () => {
    const sanitized = sanitizeResumeForPublicView(baseResume);

    expect(sanitized.contact.email.value).toBe("j***@example.com");
    expect(sanitized.contact.email.visibility).toBe("masked");
    expect(sanitized.contact.phone.value).toBe("***-***-4567");
    expect(sanitized.contact.phone.visibility).toBe("masked");
    expect(sanitized.personalInfo.email).toBe("j***@example.com");
    expect(sanitized.personalInfo.phone).toBe("***-***-4567");
    expect(sanitized.personalInfo.name).toBe("John D.");
  });

  it("preserves request visibility without revealing values", () => {
    const resume = {
      ...baseResume,
      contact: {
        email: { value: "john@example.com", visibility: "request" as const },
        phone: { value: "555-123-4567", visibility: "request" as const },
      },
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.contact.email.visibility).toBe("request");
    expect(sanitized.contact.email.value).toBe("");
    expect(sanitized.personalInfo.email).toBe("Available upon request");
    expect(sanitized.contact.phone.visibility).toBe("request");
    expect(sanitized.contact.phone.value).toBe("");
    expect(sanitized.personalInfo.phone).toBe("Available upon request");
  });

  it("adds viewer access metadata", () => {
    const sanitized = sanitizeResumeForPublicView(baseResume);

    expect(sanitized.viewerAccess).toEqual(
      expect.objectContaining({
        scope: "public-preview",
        isOwner: false,
        isMasked: true,
      })
    );
  });

  it("does not mutate the original resume object", () => {
    const original = JSON.parse(JSON.stringify(baseResume));
    sanitizeResumeForPublicView(baseResume);
    expect(baseResume).toEqual(original);
  });

  it("masks personalInfo fields even if contact fields are missing", () => {
    const resume = {
      userId: "user-1",
      summary: "Full stack engineer",
      contact: {}, // Empty contact
      personalInfo: {
        email: "john@example.com",
        phone: "555-123-4567",
        name: "John Doe",
      },
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.personalInfo.email).toBe("j***@example.com");
    expect(sanitized.personalInfo.phone).toBe("***-***-4567");
  });

  it("clears detailed sections for snapshot view", () => {
    const resume = {
      ...baseResume,
      experience: [{ company: "Tech Corp", role: "Dev" }],
      education: [{ school: "University", degree: "BS" }],
      projects: [{ name: "Project A" }],
      skills: [{ name: "React" }],
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.experience).toEqual([]);
    expect(sanitized.education).toEqual([]);
    expect(sanitized.projects).toEqual([]);
    expect(sanitized.skills).toEqual([]);
    expect(sanitized.viewerAccess.isSnapshot).toBe(true);
  });

  it("handles legacy string format for contact fields", () => {
    const resume = {
      userId: "user-1",
      contact: {
        email: "john@example.com",
        phone: "555-123-4567",
      },
      personalInfo: {
        name: "John Doe",
      },
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.contact.email.value).toBe("j***@example.com");
    expect(sanitized.contact.phone.value).toBe("***-***-4567");
  });

  it("handles missing contact fields falling back to personalInfo", () => {
    const resume = {
      userId: "user-1",
      contact: {},
      personalInfo: {
        email: "john@example.com",
        phone: "555-123-4567",
        name: "John Doe",
      },
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.contact.email.value).toBe("j***@example.com");
    expect(sanitized.contact.phone.value).toBe("***-***-4567");
  });

  it("handles completely missing email and phone", () => {
    const resume = {
      userId: "user-1",
      contact: {},
      personalInfo: {
        name: "John Doe",
      },
    };

    const sanitized = sanitizeResumeForPublicView(resume);

    expect(sanitized.contact.email.value).toBe("");
    expect(sanitized.contact.phone.value).toBe("");
    expect(sanitized.personalInfo.email).toBeUndefined();
    expect(sanitized.personalInfo.phone).toBeUndefined();
  });

  it("handles null/undefined resume input", () => {
    // @ts-expect-error - Testing invalid input
    const sanitized = sanitizeResumeForPublicView(null);
    expect(sanitized).toBeDefined();
    expect(sanitized.contact).toBeDefined();

    // @ts-expect-error - Testing invalid input
    const sanitized2 = sanitizeResumeForPublicView(undefined);
    expect(sanitized2).toBeDefined();
  });
});
