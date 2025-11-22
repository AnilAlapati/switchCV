"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { templateService } from "@/lib/services/templateService";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { ResumeTemplate } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export default function ResumeView() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [template, setTemplate] = useState<ResumeTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdating, setIsUpdating] = useState(false);

  const toggleVisibility = async () => {
    if (!resume || !user || isUpdating) return;

    setIsUpdating(true);
    const newVisibility = !resume.isPublic;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: newVisibility }),
      });

      if (!response.ok) {
        throw new Error("Failed to update visibility");
      }

      setResume((prev: any) => ({
        ...prev,
        isPublic: newVisibility,
        visibility: newVisibility ? "public" : "private",
      }));
    } catch (error) {
      console.error("Error updating visibility:", error);
      alert("Failed to update visibility settings");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchResumeAndTemplate = async () => {
      if (!id || authLoading) return;

      try {
        console.log("Fetching resume", id);

        // Use API route instead of direct Firestore access to bypass client-side rule issues
        const headers: HeadersInit = {};
        if (user) {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/resumes/${id}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 403) {
            const errorData = await response.json();
            if (errorData.error === "Reserved System ID") {
              throw new Error(errorData.message);
            }
            throw new Error("Permission denied - You do not own this resume");
          }
          if (response.status === 404) throw new Error("Resume not found");
          if (response.status === 401)
            throw new Error("Unauthorized - Please log in");
          throw new Error("Failed to fetch resume");
        }

        const resumeData = await response.json();
        setResume(resumeData);

        // Fetch template if ID exists, otherwise default to standard
        const templateId = resumeData.templateId || "standard-v1";
        const fetchedTemplate = await templateService.getTemplateById(
          templateId
        );
        setTemplate(fetchedTemplate);
      } catch (error: any) {
        console.error("Error fetching resume:", error);
        setError(error.message || "Error loading resume");
      } finally {
        setLoading(false);
      }
    };

    fetchResumeAndTemplate();
  }, [id, authLoading, user]);

  if (authLoading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Checking authentication...
      </div>
    );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-4">
        <p>You must be logged in to view this resume.</p>
        <a href="/auth" className="bg-blue-600 px-4 py-2 rounded">
          Go to Login
        </a>
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading resume...
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white flex-col gap-2">
        <p className="text-red-400 text-xl">Error: {error}</p>
        <p className="text-gray-400 text-sm">User ID: {user.uid}</p>
      </div>
    );
  }

  if (!resume)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Resume not found
      </div>
    );

  // Use the new TemplateRenderer if a template is loaded
  if (template) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 font-sans relative">
        {/* Privacy Toggle */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-700 print:hidden">
          <span className="text-sm font-medium text-gray-300">
            {resume.isPublic ? "Public" : "Private"}
          </span>
          <button
            onClick={toggleVisibility}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              resume.isPublic ? "bg-green-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`${
                resume.isPublic ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </button>
        </div>

        <TemplateRenderer template={template} data={resume} />
      </div>
    );
  }

  // Fallback to legacy rendering if no template system works
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
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-md print:hidden"
            >
              Download PDF
            </button>
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
              {resume.experience.map((exp: any, index: number) => (
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
              {resume.education.map((edu: any, index: number) => (
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
              {resume.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-medium border border-gray-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
