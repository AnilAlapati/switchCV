// src/app/onboarding/page-with-preview.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  ResumeProfile,
  Experience,
  Education,
  Skill,
  Project,
  Visibility,
} from "@/types";
import { VisibilityControls } from "@/components/VisibilityControls";
import { ResumePreviewPanel } from "@/components/ResumePreview";

const steps = [
  "Basic Info",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Contact",
  "Review",
];

/**
 * Enhanced Onboarding Page with Live Preview
 *
 * Features:
 * - Split-screen design with form on left and live preview on right
 * - Responsive layout that stacks on mobile
 * - Real-time preview updates
 * - Complete form fields for all resume sections
 * - Per-field visibility controls
 * - Progress tracking and step navigation
 */
export default function OnboardingWithPreview() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<ResumeProfile>>({
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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // TODO: Save to Firestore
    console.log("Saving profile:", profile);
    router.push("/dashboard");
  };

  const updateProfile = (updates: Partial<ResumeProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  // Experience management
  const addExperience = () => {
    const newExperience: Experience = {
      company: "",
      role: "",
      startDate: "",
      description: "",
      visibility: "public",
    };
    updateProfile({
      experience: [...(profile.experience || []), newExperience],
    });
  };

  const updateExperience = (index: number, updates: Partial<Experience>) => {
    const updated = [...(profile.experience || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ experience: updated });
  };

  const removeExperience = (index: number) => {
    const updated = (profile.experience || []).filter((_, i) => i !== index);
    updateProfile({ experience: updated });
  };

  // Education management
  const addEducation = () => {
    const newEducation: Education = {
      institution: "",
      degree: "",
      startDate: "",
      visibility: "public",
    };
    updateProfile({
      education: [...(profile.education || []), newEducation],
    });
  };

  const updateEducation = (index: number, updates: Partial<Education>) => {
    const updated = [...(profile.education || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ education: updated });
  };

  const removeEducation = (index: number) => {
    const updated = (profile.education || []).filter((_, i) => i !== index);
    updateProfile({ education: updated });
  };

  // Skills management
  const addSkill = () => {
    const newSkill: Skill = {
      name: "",
      level: "intermediate",
      visibility: "public",
    };
    updateProfile({
      skills: [...(profile.skills || []), newSkill],
    });
  };

  const updateSkill = (index: number, updates: Partial<Skill>) => {
    const updated = [...(profile.skills || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ skills: updated });
  };

  const removeSkill = (index: number) => {
    const updated = (profile.skills || []).filter((_, i) => i !== index);
    updateProfile({ skills: updated });
  };

  // Projects management
  const addProject = () => {
    const newProject: Project = {
      name: "",
      description: "",
      visibility: "public",
    };
    updateProfile({
      projects: [...(profile.projects || []), newProject],
    });
  };

  const updateProject = (index: number, updates: Partial<Project>) => {
    const updated = [...(profile.projects || [])];
    updated[index] = { ...updated[index], ...updates };
    updateProfile({ projects: updated });
  };

  const removeProject = (index: number) => {
    const updated = (profile.projects || []).filter((_, i) => i !== index);
    updateProfile({ projects: updated });
  };

  // Visibility control component
  const VisibilityControl = ({
    value,
    onChange,
  }: {
    value: Visibility;
    onChange: (v: Visibility) => void;
  }) => (
    <VisibilityControls
      value={value}
      onChange={onChange}
      label="Privacy Setting"
      showLabels={false}
    />
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Resume Title
              </label>
              <input
                type="text"
                value={profile.title || ""}
                onChange={(e) => updateProfile({ title: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Software Engineer Resume"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Professional Summary
              </label>
              <textarea
                value={profile.summary || ""}
                onChange={(e) => updateProfile({ summary: e.target.value })}
                rows={4}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief summary of your professional background..."
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <button
                onClick={addExperience}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                + Add Experience
              </button>
            </div>

            {(profile.experience || []).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No experience added yet. Click "Add Experience" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {(profile.experience || []).map((exp, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900">
                        Experience #{index + 1}
                      </h4>
                      <button
                        onClick={() => removeExperience(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) =>
                            updateExperience(index, { company: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Acme Corp"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) =>
                            updateExperience(index, { role: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Senior Software Engineer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) =>
                            updateExperience(index, {
                              startDate: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Jan 2020"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          End Date (optional)
                        </label>
                        <input
                          type="text"
                          value={exp.endDate || ""}
                          onChange={(e) =>
                            updateExperience(index, { endDate: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Present"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Description & Achievements
                      </label>
                      <textarea
                        value={exp.description}
                        onChange={(e) =>
                          updateExperience(index, {
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Describe your key responsibilities and achievements..."
                      />
                    </div>

                    <VisibilityControl
                      value={exp.visibility}
                      onChange={(v) =>
                        updateExperience(index, { visibility: v })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Education</h3>
              <button
                onClick={addEducation}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                + Add Education
              </button>
            </div>

            {(profile.education || []).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No education added yet. Click "Add Education" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {(profile.education || []).map((edu, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900">
                        Education #{index + 1}
                      </h4>
                      <button
                        onClick={() => removeEducation(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) =>
                            updateEducation(index, {
                              institution: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., MIT"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Degree
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) =>
                            updateEducation(index, { degree: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Bachelor's in Computer Science"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={edu.startDate}
                          onChange={(e) =>
                            updateEducation(index, {
                              startDate: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., 2016"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          End Date (optional)
                        </label>
                        <input
                          type="text"
                          value={edu.endDate || ""}
                          onChange={(e) =>
                            updateEducation(index, { endDate: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., 2020"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Description (optional)
                      </label>
                      <textarea
                        value={edu.description || ""}
                        onChange={(e) =>
                          updateEducation(index, {
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., GPA, honors, relevant coursework..."
                      />
                    </div>

                    <VisibilityControl
                      value={edu.visibility}
                      onChange={(v) =>
                        updateEducation(index, { visibility: v })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Skills</h3>
              <button
                onClick={addSkill}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                + Add Skill
              </button>
            </div>

            {(profile.skills || []).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No skills added yet. Click "Add Skill" to get started.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(profile.skills || []).map((skill, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium text-gray-900">
                        Skill #{index + 1}
                      </h4>
                      <button
                        onClick={() => removeSkill(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) =>
                          updateSkill(index, { name: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., React, Python, Leadership"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Proficiency Level
                      </label>
                      <select
                        value={skill.level}
                        onChange={(e) =>
                          updateSkill(index, { level: e.target.value })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <VisibilityControl
                      value={skill.visibility}
                      onChange={(v) => updateSkill(index, { visibility: v })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Projects</h3>
              <button
                onClick={addProject}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                + Add Project
              </button>
            </div>

            {(profile.projects || []).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No projects added yet. Click "Add Project" to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {(profile.projects || []).map((project, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-900">
                        Project #{index + 1}
                      </h4>
                      <button
                        onClick={() => removeProject(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) =>
                            updateProject(index, { name: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., E-commerce Platform"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Project URL (optional)
                        </label>
                        <input
                          type="url"
                          value={project.url || ""}
                          onChange={(e) =>
                            updateProject(index, { url: e.target.value })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., https://github.com/..."
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        value={project.description}
                        onChange={(e) =>
                          updateProject(index, { description: e.target.value })
                        }
                        rows={3}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Describe the project, technologies used, and your role..."
                      />
                    </div>

                    <VisibilityControl
                      value={project.visibility}
                      onChange={(v) => updateProject(index, { visibility: v })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.contact?.email?.value || ""}
                  onChange={(e) =>
                    updateProfile({
                      contact: {
                        ...profile.contact!,
                        email: {
                          ...profile.contact!.email,
                          value: e.target.value,
                        },
                      },
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your.email@example.com"
                />
                <VisibilityControl
                  value={profile.contact?.email?.visibility || "masked"}
                  onChange={(v) =>
                    updateProfile({
                      contact: {
                        ...profile.contact!,
                        email: {
                          ...profile.contact!.email,
                          visibility: v,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.contact?.phone?.value || ""}
                  onChange={(e) =>
                    updateProfile({
                      contact: {
                        ...profile.contact!,
                        phone: {
                          ...profile.contact!.phone,
                          value: e.target.value,
                        },
                      },
                    })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+1 (555) 123-4567"
                />
                <VisibilityControl
                  value={profile.contact?.phone?.visibility || "masked"}
                  onChange={(v) =>
                    updateProfile({
                      contact: {
                        ...profile.contact!,
                        phone: {
                          ...profile.contact!.phone,
                          visibility: v,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Your Information</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Title & Summary
                  </h4>
                  <p className="text-gray-700">
                    <strong>Title:</strong> {profile.title || "Not provided"}
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    <strong>Summary:</strong>{" "}
                    {profile.summary || "Not provided"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Experience ({(profile.experience || []).length})
                  </h4>
                  {(profile.experience || []).length > 0 ? (
                    (profile.experience || []).map((exp, i) => (
                      <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
                        <p>
                          <strong>{exp.role}</strong> at {exp.company} (
                          {exp.startDate} - {exp.endDate || "Present"})
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No experience added</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Education ({(profile.education || []).length})
                  </h4>
                  {(profile.education || []).length > 0 ? (
                    (profile.education || []).map((edu, i) => (
                      <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
                        <p>
                          <strong>{edu.degree}</strong> from {edu.institution} (
                          {edu.startDate})
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No education added</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Skills ({(profile.skills || []).length})
                  </h4>
                  {(profile.skills || []).length > 0 ? (
                    <p className="text-gray-700 text-sm">
                      {(profile.skills || []).map((s) => s.name).join(", ")}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm">No skills added</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Projects ({(profile.projects || []).length})
                  </h4>
                  {(profile.projects || []).length > 0 ? (
                    (profile.projects || []).map((proj, i) => (
                      <div key={i} className="ml-4 mb-2 text-sm text-gray-700">
                        <p>
                          <strong>{proj.name}</strong>
                          {proj.url && ` - ${proj.url}`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No projects added</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const formContent = (
    <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 lg:p-8">
      {renderStep()}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Create Your Resume
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Step {currentStep + 1} of {steps.length}:{" "}
            <span className="font-medium">{steps[currentStep]}</span>
          </p>

          {/* Progress Bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Layout - Form on left, Preview on right for larger screens */}
        <ResumePreviewPanel profile={profile}>
          {formContent}

          {/* Navigation Buttons */}
          <div className="mt-8 flex flex-col-reverse sm:flex-row gap-4 justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ← Previous
            </button>

            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
              >
                ✓ Complete Setup
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
              >
                Next →
              </button>
            )}
          </div>

          {/* Step Indicator */}
          <div className="mt-8 flex gap-2 justify-center flex-wrap">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`px-3 py-1 text-xs sm:text-sm rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-indigo-600 text-white"
                    : index < currentStep
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {index + 1}. {step}
              </button>
            ))}
          </div>
        </ResumePreviewPanel>
      </div>
    </div>
  );
}
