import React from "react";

export const MockResumeQAForm = ({
  onComplete,
  onCancel,
}: {
  onComplete: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) => (
  <div data-testid="resume-qa-form">
    <button
      onClick={() =>
        onComplete({
          personal_name: "John Doe",
          personal_email: "john@example.com",
          skills: ["React", "TypeScript"],
          summary: "Experienced developer",
        })
      }
    >
      Submit QA
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: ["John", "Doe"], // Invalid name type
          personal_email: null, // Invalid email type
          skills: null, // Invalid skills type
          summary: null, // Invalid summary
        })
      }
    >
      Submit QA Edge Cases
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: "", // Empty name
          personal_email: "john@example.com",
          skills: ["React", "TypeScript"],
          summary: "Experienced developer",
        })
      }
    >
      Submit Empty Name
    </button>
    <button
      onClick={() =>
        onComplete({
          // name missing
          personal_email: "john@example.com",
          skills: ["React", "TypeScript"],
          summary: "Experienced developer",
        })
      }
    >
      Submit Missing Name
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: "John Doe",
          personal_email: "john@example.com",
          skills: "React, TypeScript",
          summary: "Experienced developer",
        })
      }
    >
      Submit String Skills
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: "John Doe",
          personal_email: "john@example.com",
          skills: ["React", "TypeScript"],
          summary: "Experienced developer",
          preferences_template: "minimalist",
          preferences_tone: "creative",
        })
      }
    >
      Submit QA Creative
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: "",
          personal_email: "",
          skills: [],
          summary: "",
        })
      }
    >
      Submit QA Empty
    </button>
    <button
      onClick={() =>
        onComplete({
          personal_name: "Complex User",
          personal_email: "complex@example.com",
          personal_location: "Complex City",
          personal_linkedin: "https://linkedin.com/in/complex",
          personal_github: "https://github.com/complex",
          personal_phone: "+1-234-567-8900",
          skills: ["React", "TypeScript", "Node.js"],
          summary: "Complex professional summary",
          experience_count: "1",
          experience_1_title: "Senior Developer",
          experience_1_company: "Tech Corp",
          experience_1_duration: "2019-2023",
          experience_1_description: "Led development team",
          education_count: "1",
          education_1_degree: "MS Computer Science",
          education_1_institution: "Tech University",
          education_1_year: "2023",
          preferences_template: "technical",
          preferences_tone: "concise",
        })
      }
    >
      Submit QA Complex
    </button>
    <button onClick={onCancel}>Cancel QA</button>
  </div>
);

export const MockResumeGenerationLoader = ({
  status,
  message,
}: {
  status: string;
  message: string;
}) => (
  <div data-testid="resume-loader">
    Status: {status}, Message: {message}
  </div>
);

export const MockResumeReviewModal = ({
  onAccept,
  onRewrite,
  resume,
	}: {
	  onAccept: () => void;
	  onRewrite: (feedback?: string) => void;
	  resume: Record<string, unknown>;
	}) => (
	  <div data-testid="resume-review-modal">
	    <h1>{String(resume.title ?? "")}</h1>
	    <p>{String(resume.summary ?? "")}</p>
	    <button onClick={onAccept}>Accept</button>
	    <button onClick={() => onRewrite("Make it better")}>Rewrite</button>
	  </div>
	);
