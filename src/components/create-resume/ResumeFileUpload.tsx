"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type {
  EducationEntry,
  ExperienceEntry,
  ResumeDataRequirements,
} from "@/lib/services/conversationManager";
import type {
  ResumeUploadDraft,
} from "@/types/resumeUpload";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

type EditableTextField = "name" | "email" | "phone" | "location" | "summary";

interface ResumeFileUploadProps {
  onComplete: (uploadDraft: ResumeUploadDraft) => void | Promise<void>;
  onCancel: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFileExtension(fileName: string): string | null {
  const lowerName = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext)) ?? null;
}

function validateClientFile(file: File): string | null {
  if (getFileExtension(file.name) === null) {
    return "Upload a PDF, DOCX, or TXT file.";
  }

  if (file.size > MAX_FILE_BYTES) {
    return "File size must be 5 MB or less.";
  }

  return null;
}

function extractErrorMessage(status: number, payload: unknown): string {
  if (status === 403) {
    return "File upload is not available on your plan.";
  }

  if (isRecord(payload) && payload.code === "SCANNED_PDF") {
    return "This looks like a scanned PDF. Paste your resume text in chat instead.";
  }

  if (isRecord(payload) && typeof payload.error === "string") {
    return payload.error;
  }

  return "Could not process this file. Please try another resume.";
}

function getExtractedFields(
  data: Partial<ResumeDataRequirements>,
): string[] {
  return Object.entries(data)
    .filter(([, value]) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    })
    .map(([field]) => field);
}

function splitSkills(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

function formatExperience(entry: ExperienceEntry): string {
  const title = entry.title || "Role";
  const company = entry.company ? ` at ${entry.company}` : "";
  const duration = entry.duration ? ` (${entry.duration})` : "";
  return `${title}${company}${duration}`;
}

function formatEducation(entry: EducationEntry): string {
  const degree = entry.degree || "Education";
  const institution = entry.institution ? `, ${entry.institution}` : "";
  const year = entry.year ? ` (${entry.year})` : "";
  return `${degree}${institution}${year}`;
}

export function ResumeFileUpload({
  onComplete,
  onCancel,
}: ResumeFileUploadProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ResumeUploadDraft | null>(null);
  const [editedData, setEditedData] = useState<
    Partial<ResumeDataRequirements>
  >({});
  const [skillsText, setSkillsText] = useState("");

  const updateTextField = useCallback(
    (field: EditableTextField, value: string) => {
      setEditedData((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateSkills = useCallback((value: string) => {
    setSkillsText(value);
    setEditedData((current) => ({ ...current, skills: splitSkills(value) }));
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateClientFile(file);
      if (validationError !== null) {
        setError(validationError);
        return;
      }

      if (!user) {
        setError("Sign in again before uploading a resume.");
        return;
      }

      setIsUploading(true);
      setError(null);
      setDraft(null);
      setSelectedFileName(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const idToken = await user.getIdToken();
        const response = await fetch("/api/resume/upload-and-extract", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(extractErrorMessage(response.status, payload));
        }

        if (!isRecord(payload) || !isRecord(payload.uploadDraft)) {
          throw new Error("Could not process this file. Please try again.");
        }
        const uploadDraft = payload.uploadDraft as unknown as ResumeUploadDraft;

        setDraft(uploadDraft);
        setEditedData(uploadDraft.extractedData);
        setSkillsText(uploadDraft.extractedData.skills?.join(", ") ?? "");
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Could not process this file. Please try again.",
        );
        setSelectedFileName(null);
      } finally {
        setIsUploading(false);
      }
    },
    [user],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      void uploadFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file !== undefined) {
      void uploadFile(file);
    }
  };

  const clearSelection = () => {
    setDraft(null);
    setEditedData({});
    setSkillsText("");
    setSelectedFileName(null);
    setError(null);
    if (inputRef.current !== null) {
      inputRef.current.value = "";
    }
  };

  const confirmDraft = () => {
    if (draft === null) return;

    const uploadDraft: ResumeUploadDraft = {
      ...draft,
      extractedData: editedData,
      extractedFields: getExtractedFields(editedData),
    };
    void onComplete(uploadDraft);
  };

  const experience = editedData.experience ?? [];
  const education = editedData.education ?? [];

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-4 py-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed bg-white p-6 text-center transition-colors ${
          isDragOver ? "border-black bg-gray-50" : "border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          id="resume-file-upload"
          data-testid="resume-file-input"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <Upload className="mx-auto h-10 w-10 text-gray-500" />
        <div className="mt-3 text-base font-semibold text-black">
          Drop your resume file here
        </div>
        <div className="mt-1 text-sm text-gray-600">PDF, DOCX, or TXT</div>
        <label
          htmlFor="resume-file-upload"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800"
        >
          <FileText className="h-4 w-4" />
          Choose File
        </label>
      </div>

      {selectedFileName !== null && (
        <div className="flex items-center justify-between border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <span className="flex min-w-0 items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" role="status" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="truncate">{selectedFileName}</span>
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 text-gray-500 hover:text-black"
            aria-label="Clear uploaded file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error !== null && (
        <div
          className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft !== null && (
        <div className="border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Review extracted details
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["name", "email", "phone", "location"] as EditableTextField[]).map(
              (field) => (
                <label key={field} className="text-sm font-medium text-gray-700">
                  <span className="capitalize">{field}</span>
                  <input
                    value={editedData[field] ?? ""}
                    onChange={(event) => updateTextField(field, event.target.value)}
                    className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
                  />
                </label>
              ),
            )}
          </div>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            Summary
            <textarea
              value={editedData.summary ?? ""}
              onChange={(event) => updateTextField("summary", event.target.value)}
              className="mt-1 min-h-24 w-full resize-y border border-gray-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            Skills
            <textarea
              value={skillsText}
              onChange={(event) => updateSkills(event.target.value)}
              className="mt-1 min-h-20 w-full resize-y border border-gray-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
            />
          </label>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PreviewList
              title="Experience"
              items={experience.slice(0, 3).map(formatExperience)}
            />
            <PreviewList
              title="Education"
              items={education.slice(0, 3).map(formatEducation)}
            />
          </div>

          {draft.missingFields.length > 0 && (
            <div className="mt-3 text-xs text-amber-700">
              Missing: {draft.missingFields.join(", ")}
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back to Chat
            </button>
            <button
              type="button"
              onClick={confirmDraft}
              className="inline-flex items-center justify-center gap-2 border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              Create Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-3">
      <div className="text-sm font-semibold text-black">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500">None found</p>
      )}
    </div>
  );
}
