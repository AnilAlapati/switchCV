import React from "react";

export const MockResumeQAForm = ({ onComplete, onCancel }: any) => (
  <div data-testid="resume-qa-form">
    <button
      onClick={() =>
        onComplete({
          name: "John Doe",
          email: "john@example.com",
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
          name: ["John", "Doe"], // Invalid name type
          email: null, // Invalid email type
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
          name: "", // Empty name
          email: "john@example.com",
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
          email: "john@example.com",
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
          name: "John Doe",
          email: "john@example.com",
          skills: "React, TypeScript",
          summary: "Experienced developer",
        })
      }
    >
      Submit String Skills
    </button>
    <button onClick={onCancel}>Cancel QA</button>
  </div>
);

export const MockResumeGenerationLoader = ({ status, message }: any) => (
  <div data-testid="resume-loader">
    Status: {status}, Message: {message}
  </div>
);

export const MockResumeReviewModal = ({ onAccept, onRewrite, resume }: any) => (
  <div data-testid="resume-review-modal">
    <h1>{resume.title}</h1>
    <p>{resume.summary}</p>
    <button onClick={onAccept}>Accept</button>
    <button onClick={() => onRewrite("Make it better")}>Rewrite</button>
  </div>
);
