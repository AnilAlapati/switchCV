/* eslint-disable max-lines */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ParsedJDCard } from "./ParsedJDCard";

export interface ParsedJDPreview {
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperience: number | null;
  location: string | null;
  workMode: string | null;
}

// Progress steps for JD search
export type SearchStep =
  | "idle"
  | "parsing"
  | "extracting"
  | "searching"
  | "ranking"
  | "complete";

const PROGRESS_STEPS: { step: SearchStep; label: string }[] = [
  { step: "parsing", label: "Parsing job description" },
  { step: "extracting", label: "Extracting required skills" },
  { step: "searching", label: "Finding matching candidates" },
  { step: "ranking", label: "Ranking by match quality" },
];

interface JDUploadProps {
  onSearch: (jdText: string, useAI: boolean) => Promise<void>;
  isLoading: boolean;
  parsedJD?: ParsedJDPreview | null;
  error?: string | null;
  searchStep?: SearchStep;
}

export function JDUpload({
  onSearch,
  isLoading,
  parsedJD,
  error,
  searchStep = "idle",
}: JDUploadProps) {
  const [jdText, setJdText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<SearchStep>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate step progress based on isLoading
  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(searchStep === "complete" ? "complete" : "idle");
      return;
    }

    // If a searchStep is provided, use it; otherwise simulate progress
    if (searchStep !== "idle") {
      setCurrentStep(searchStep);
      return;
    }

    // Simulate progress steps
    const steps: SearchStep[] = [
      "parsing",
      "extracting",
      "searching",
      "ranking",
    ];
    let stepIndex = 0;

    setCurrentStep("parsing");
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex]);
      }
    }, 1500); // Advance every 1.5 seconds

    return () => clearInterval(interval);
  }, [isLoading, searchStep]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension !== "txt") {
      // For now, only support text files
      // PDF and DOCX would require server-side parsing
      toast.warning(
        "Currently only .txt files are supported. Please paste the JD text directly.",
      );
      return;
    }

    try {
      const text = await file.text();
      setJdText(text);
      setFileName(file.name);
    } catch {
      toast.error("Failed to read file. Please paste the JD text directly.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files !== null && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jdText.trim().length < 50) {
      return;
    }
    await onSearch(jdText.trim(), useAI);
  };

  const handleClear = () => {
    setJdText("");
    setFileName(null);
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = "";
    }
  };

  const charCount = jdText.length;
  const isValid = charCount >= 50;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        {/* Drag and drop area / Text input */}
        <div
          className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${isDragOver
            ? "border-black bg-gray-50"
            : "border-gray-300 hover:border-gray-400"
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File upload overlay */}
          {jdText.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
              <Upload className="w-10 h-10 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium text-center">
                Drag & drop a job description file here
              </p>
              <p className="text-gray-400 text-sm mt-1">or paste/type below</p>
            </div>
          )}

          {/* Text area */}
          <textarea
            data-testid="jd-textarea"
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              setFileName(null);
            }}
            placeholder="Paste your job description here...

Example:
Senior Software Engineer

Requirements:
- 5+ years experience with Python and Java
- Experience with AWS, Docker, Kubernetes
- Strong background in distributed systems

Nice to have:
- Machine learning experience
- Go or Rust experience

Location: San Francisco (Hybrid)"
            className={`w-full min-h-[250px] p-4 bg-transparent resize-y rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 ${jdText.length === 0 ? "text-transparent" : "text-gray-900"
              }`}
            disabled={isLoading}
          />

          {/* Character count and file name */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs">
            {fileName !== null && (
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-gray-600">
                <FileText className="w-3 h-3" />
                {fileName}
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-1 hover:text-red-500"
                  aria-label="Clear file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <span
              className={charCount >= 50 ? "text-green-600" : "text-gray-400"}
            >
              {charCount}/50 min
            </span>
          </div>
        </div>

        {/* File upload button */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileSelect}
              className="hidden"
              id="jd-file-upload"
            />
            <label
              htmlFor="jd-file-upload"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Upload .txt file
            </label>

            {/* AI toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI-powered parsing
              </span>
            </label>
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            data-testid="jd-search-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Find Candidates
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error display */}
      {error !== undefined && error !== null && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress indicator */}
      {isLoading && currentStep !== "idle" && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing your job description...</span>
          </div>
          <div className="space-y-2">
            {PROGRESS_STEPS.map(({ step, label }) => {
              const stepOrder: SearchStep[] = [
                "parsing",
                "extracting",
                "searching",
                "ranking",
              ];
              const currentIndex = stepOrder.indexOf(currentStep);
              const thisIndex = stepOrder.indexOf(step);
              const isComplete = thisIndex < currentIndex;
              const isCurrent = step === currentStep;

              return (
                <div
                  key={step}
                  className={`flex items-center gap-2 text-sm ${isComplete
                    ? "text-green-600"
                    : isCurrent
                      ? "text-gray-900 font-medium"
                      : "text-gray-400"
                    }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span>{label}</span>
                  {isCurrent && currentStep === "extracting" && parsedJD && (
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                      {parsedJD.requiredSkills.length +
                        parsedJD.preferredSkills.length}{" "}
                      skills found
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Parsed JD Preview */}
      {parsedJD !== undefined && parsedJD !== null && (
        <ParsedJDCard parsedJD={parsedJD} />
      )}
    </div>
  );
}

