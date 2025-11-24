"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";

const PROFESSIONS = [
  "Senior Software Engineer (React/Node)",
  "ICU Registered Nurse",
  "Digital Marketing Manager",
  "Senior Graphic Designer",
  "High School Mathematics Teacher",
  "Financial Analyst (FinTech)",
  "Executive Chef",
  "Enterprise Sales Representative",
  "Civil Engineer (Structural)",
  "Professional Actor (Theater/Film)",
];

export default function SeedPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!ENABLE_SEEDING_AND_DEBUG_LISTS) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Testing Disabled</h1>
          <p className="mt-2 text-gray-600">
            Resume seeding is currently disabled.
          </p>
        </div>
      </div>
    );
  }

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const handleGenerate = async () => {
    if (!user) {
      addLog("❌ Please log in first!");
      return;
    }

    setIsGenerating(true);
    addLog(`🚀 Starting generation for user: ${user.email}`);

    for (const profession of PROFESSIONS) {
      try {
        addLog(`⏳ Generating: ${profession}...`);

        // 1. Generate Content (Server-side)
        const res = await fetch("/api/seed/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profession }),
        });

        if (!res.ok) throw new Error("Generation failed");
        const resumeData = await res.json();

        // 2. Save to Firestore (Client-side)
        const fullResume = {
          ...resumeData,
          userId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          versionId: crypto.randomUUID(),
          slug: `${profession
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
          published: true,
          templateId: resumeData.templateId || "standard-v1",
          generatedText: {
            draft: "",
            polished: "",
            lastGeneratedAt: new Date().toISOString(),
          },
        };

        const docRef = await addDoc(collection(db, "resumes"), fullResume);
        addLog(`✅ Saved resume: ${docRef.id}`);
      } catch (error) {
        addLog(`❌ Error with ${profession}: ${error}`);
      }

      // Delay to be nice to APIs
      await new Promise((r) => setTimeout(r, 1000));
    }

    addLog("✨ All done!");
    setIsGenerating(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Resume Seeder</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p>Current User: {user?.email || "Not logged in"}</p>
        <p>Target: 10 Diverse Resumes</p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !user}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isGenerating ? "Generating..." : "Generate 10 Resumes"}
      </button>

      <div className="mt-8 p-4 bg-black text-green-400 font-mono text-sm rounded h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
