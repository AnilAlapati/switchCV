import { renderHook, act } from "@testing-library/react";
import { useProfileForm } from "../../hooks/useProfileForm";

describe("useProfileForm", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useProfileForm());

    expect(result.current.profile).toEqual({
      title: "",
      summary: "",
      skills: [],
      experience: [],
      education: [],
      contact: {
        email: { value: "", visibility: "masked" },
        phone: { value: "", visibility: "masked" },
      },
      projects: [],
    });
  });

  it("should initialize with provided values", () => {
    const initialProfile = {
      title: "Developer",
      summary: "Experienced dev",
    };
    const { result } = renderHook(() => useProfileForm(initialProfile));

    expect(result.current.profile.title).toBe("Developer");
    expect(result.current.profile.summary).toBe("Experienced dev");
  });

  it("should update profile fields", () => {
    const { result } = renderHook(() => useProfileForm());

    act(() => {
      result.current.updateProfile({ title: "Senior Dev" });
    });

    expect(result.current.profile.title).toBe("Senior Dev");
  });

  describe("Experience Management", () => {
    it("should add experience", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.experience.add();
      });

      expect(result.current.profile.experience).toHaveLength(1);
      expect(result.current.profile.experience![0]).toEqual({
        id: expect.any(String),
        company: "",
        role: "",
        startDate: "",
        description: "",
        visibility: "public",
      });
    });

    it("should update experience", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.experience.add();
      });

      act(() => {
        result.current.experience.update(0, { company: "Tech Corp" });
      });

      expect(result.current.profile.experience![0].company).toBe("Tech Corp");
    });

    it("should remove experience", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.experience.add();
      });

      act(() => {
        result.current.experience.add();
      });

      expect(result.current.profile.experience).toHaveLength(2);

      act(() => {
        result.current.experience.remove(0);
      });

      expect(result.current.profile.experience).toHaveLength(1);
    });
  });

  describe("Education Management", () => {
    it("should add education", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.education.add();
      });

      expect(result.current.profile.education).toHaveLength(1);
    });

    it("should update education", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.education.add();
      });

      act(() => {
        result.current.education.update(0, { institution: "University" });
      });

      expect(result.current.profile.education![0].institution).toBe(
        "University"
      );
    });

    it("should remove education", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.education.add();
      });

      act(() => {
        result.current.education.remove(0);
      });

      expect(result.current.profile.education).toHaveLength(0);
    });
  });

  describe("Skills Management", () => {
    it("should add skill", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.skills.add();
      });

      expect(result.current.profile.skills).toHaveLength(1);
    });

    it("should update skill", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.skills.add();
      });

      act(() => {
        result.current.skills.update(0, { name: "React" });
      });

      expect(result.current.profile.skills![0].name).toBe("React");
    });

    it("should remove skill", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.skills.add();
      });

      act(() => {
        result.current.skills.remove(0);
      });

      expect(result.current.profile.skills).toHaveLength(0);
    });
  });

  describe("Projects Management", () => {
    it("should add project", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.projects.add();
      });

      expect(result.current.profile.projects).toHaveLength(1);
    });

    it("should update project", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.projects.add();
      });

      act(() => {
        result.current.projects.update(0, { name: "Portfolio" });
      });

      expect(result.current.profile.projects![0].name).toBe("Portfolio");
    });

    it("should remove project", () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.projects.add();
      });

      act(() => {
        result.current.projects.remove(0);
      });

      expect(result.current.profile.projects).toHaveLength(0);
    });
  });
});
