import React from "react";

interface LegacyExperience {
  title: string;
  company: string;
  duration: string;
  description: string;
  achievements?: string[];
}

interface LegacyEducation {
  institution: string;
  degree: string;
  year: string;
  major?: string;
}

interface LegacySkill {
  name: string;
}

interface LegacyResumeData {
  title: string;
  numericId?: string | number;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  summary?: string;
  experience?: LegacyExperience[];
  education?: LegacyEducation[];
  skills?: (string | LegacySkill)[];
}

interface LegacyResumeRendererProps {
  resume: LegacyResumeData;
}

export const LegacyResumeRenderer: React.FC<LegacyResumeRendererProps> = ({
  resume,
}) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white text-gray-900 p-10 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-200 pb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 uppercase tracking-wide">
              {resume.personalInfo?.name || resume.title}
            </h1>
            <div className="text-gray-600 flex flex-wrap gap-4 text-sm mt-3">
              {resume.personalInfo?.email && (
                <span className="flex items-center gap-1">
                  📧 {resume.personalInfo.email}
                </span>
              )}
              {resume.personalInfo?.phone && (
                <span className="flex items-center gap-1">
                  📱 {resume.personalInfo.phone}
                </span>
              )}
              {resume.personalInfo?.location && (
                <span className="flex items-center gap-1">
                  📍 {resume.personalInfo.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mt-2 print:hidden">
              ID: <span>{resume.numericId}</span>
            </p>
          </div>
        </div>

        {/* Summary */}
        {resume.summary && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-800 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Professional Summary
            </h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              {resume.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
              Experience
            </h2>
            <div className="space-y-6">
              {resume.experience.map((exp: LegacyExperience, index: number) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      {exp.title}
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">
                      {exp.duration}
                    </span>
                  </div>
                  <div className="text-blue-600 font-medium mb-2">
                    {exp.company}
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">
                    {exp.description}
                  </p>
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="list-disc list-outside ml-5 mt-2 text-gray-700 space-y-1">
                      {exp.achievements.map((ach: string, i: number) => (
                        <li key={i}>{ach}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-800 uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">
              Education
            </h2>
            <div className="space-y-4">
              {resume.education.map((edu: LegacyEducation, index: number) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-lg font-bold text-gray-800">
                      {edu.institution}
                    </h3>
                    <span className="text-sm text-gray-500 font-medium">
                      {edu.year}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    {edu.degree} {edu.major ? `- ${edu.major}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-800 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-medium border border-gray-200"
                >
                  {typeof skill === "object" ? (skill as LegacySkill).name : skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
