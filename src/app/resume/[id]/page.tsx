"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ResumeView() {
  const { id } = useParams();
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResume = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "resumes", id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setResume(docSnap.data());
        } else {
          console.error("Resume not found");
        }
      } catch (error) {
        console.error("Error fetching resume:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Loading resume...
      </div>
    );
  if (!resume)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Resume not found
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{resume.title}</h1>
            <p className="text-gray-400">
              Resume ID:{" "}
              <span className="font-mono text-blue-400">
                {resume.numericId}
              </span>
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {resume.summary && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 text-blue-400 border-b border-gray-700 pb-2">
              Professional Summary
            </h2>
            <p className="text-gray-300 leading-relaxed">{resume.summary}</p>
          </div>
        )}

        {resume.skills && resume.skills.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3 text-blue-400 border-b border-gray-700 pb-2">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add more sections as needed */}
      </div>
    </div>
  );
}
