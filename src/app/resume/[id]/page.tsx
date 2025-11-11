// src/app/resume/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ResumeProfile } from "@/types";

export default function PublicResume() {
  const params = useParams();
  const id = params.id as string;

  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Query by slug field
        const resumesRef = collection(db, "resumeProfiles");
        const q = query(resumesRef, where("slug", "==", id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const resumeDoc = querySnapshot.docs[0];
          const resumeData = resumeDoc.data() as ResumeProfile;
          setResume(resumeData);
        } else {
          setError("Resume not found");
        }
      } catch (err) {
        console.error("Error fetching resume:", err);
        setError("Failed to load resume");
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full mx-auto mb-4"></div>
          <p className="text-red-400 text-lg">{error || "Resume not found"}</p>
        </div>
      </div>
    );
  }

  // Parse the generated text to get enhanced content
  let enhancedContent = null;
  try {
    if (
      resume.generatedText?.polished &&
      typeof resume.generatedText.polished === "string" &&
      resume.generatedText.polished.trim() !== "" &&
      resume.generatedText.polished !== "undefined" &&
      resume.generatedText.polished !== "null"
    ) {
      enhancedContent = JSON.parse(resume.generatedText.polished);
    }
  } catch (e) {
    console.error("Error parsing enhanced content:", e);
    console.error("Problematic data:", resume.generatedText?.polished);
    // Continue without enhanced content
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            {resume.title}
          </h1>
          <p className="text-slate-400 text-lg">Professional Resume</p>
        </div>

        {/* Resume Content */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8">
          {/* Personal Info */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              {resume.contact.email.value.split("@")[0]}
            </h2>
            <div className="flex flex-wrap gap-4 text-slate-300">
              <span>📧 {resume.contact.email.value}</span>
              {resume.contact.phone.value && (
                <span>📱 {resume.contact.phone.value}</span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
              Professional Summary
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {enhancedContent?.enhancedSummary || resume.summary}
            </p>
          </div>

          {/* Experience */}
          {resume.experience.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Experience
              </h3>
              <div className="space-y-6">
                {resume.experience.map((exp, index) => (
                  <div key={index} className="border-l-4 border-cyan-500 pl-6">
                    <h4 className="text-xl font-semibold text-white">
                      {exp.role}
                    </h4>
                    <p className="text-purple-400 font-medium">{exp.company}</p>
                    <p className="text-slate-400 text-sm mb-2">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {enhancedContent?.enhancedExperience?.[index]
                        ?.enhancedDescription || exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Education
              </h3>
              <div className="space-y-4">
                {resume.education.map((edu, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-purple-500 pl-6"
                  >
                    <h4 className="text-xl font-semibold text-white">
                      {edu.degree}
                    </h4>
                    <p className="text-purple-400 font-medium">
                      {edu.institution}
                    </p>
                    <p className="text-slate-400 text-sm">{edu.startDate}</p>
                    {edu.description && (
                      <p className="text-slate-300 mt-2">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {resume.skills.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Skills
              </h3>
              <div className="flex flex-wrap gap-3">
                {resume.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-cyan-300 font-medium"
                  >
                    {skill.name}
                  </span>
                ))}
                {enhancedContent?.skillSuggestions?.map(
                  (skill: string, index: number) => (
                    <span
                      key={`suggested-${index}`}
                      className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-300 font-medium"
                    >
                      {skill} (Suggested)
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Projects */}
          {resume.projects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
                Projects
              </h3>
              <div className="space-y-4">
                {resume.projects.map((project, index) => (
                  <div key={index} className="border-l-4 border-pink-500 pl-6">
                    <h4 className="text-xl font-semibold text-white">
                      {project.name}
                    </h4>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 font-medium"
                      >
                        🔗 View Project
                      </a>
                    )}
                    <p className="text-slate-300 mt-2 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-400 text-sm">
            Created with ❤️ using SwitchCV
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Last updated: {new Date(resume.lastUpdatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
