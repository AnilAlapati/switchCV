// src/app/create-resume/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useAIResume } from "@/hooks/useAIResume";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateUniqueSlug } from "@/lib/slugGenerator";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ResumeData {
  jobTarget?: string;
  experience?: string;
  skills?: string;
  education?: string;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
    enhancedDescription: string;
  }>;
  skillSuggestions: string[];
  improvementTips: string[];
}

type ConversationStage =
  | "initial"
  | "job_target"
  | "experience"
  | "skills"
  | "education"
  | "personal"
  | "generating"
  | "complete";

export default function CreateResume() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const {
    generateResumeContent,
    loading: aiLoading,
    error: aiError,
  } = useAIResume();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [stage, setStage] = useState<ConversationStage>("initial");
  const [resumeData, setResumeData] = useState<ResumeData>({});
  const [generatedResume, setGeneratedResume] =
    useState<EnhancedResumeContent | null>(null);
  const [aiModelUsed, setAiModelUsed] = useState<string>("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [aiConnectionStatus, setAiConnectionStatus] = useState<{
    connected: boolean;
    model: string;
    error?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Test AI connection and generate initial greeting
  const initializeAIGreeting = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setIsGeneratingQuestion(true);
    console.log("🚀 Initializing AI connection and generating greeting...");

    const prompt = `You are a professional AI Resume Assistant. Generate a warm, engaging, single-paragraph greeting that:
- Introduces yourself as an AI Resume Assistant
- Explains you'll help create a perfect resume
- Asks what job role or industry they're targeting
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it friendly and conversational, under 3 sentences.

Greeting:`;

    try {
      // Call our server-side API route
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          maxTokens: 150,
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API failed: ${errorData.error || response.statusText}\n${
            errorData.details
              ? Object.entries(errorData.details)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")
              : ""
          }`
        );
      }

      const data = await response.json();
      const greeting = data.text;
      const modelUsed = data.model;

      console.log(`✅ ${modelUsed} API connected successfully!`);

      setAiConnectionStatus({ connected: true, model: modelUsed });
      setAiModelUsed(modelUsed);

      // Success! Add the AI-generated greeting
      setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);

      setStage("job_target");
      console.log(
        `✨ Initial greeting generated successfully using ${modelUsed}!`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ AI initialization failed:", errorMsg);

      const errorMessage = `⚠️ Unable to connect to AI services. Please check your API key configuration in .env.local\n\nError: ${errorMsg}`;

      setAiConnectionStatus({
        connected: false,
        model: "",
        error: errorMsg,
      });

      setMessages([
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Helper function to generate personalized next question using AI
  const generateNextQuestion = async (
    currentStage: ConversationStage,
    collectedData: ResumeData
  ): Promise<string> => {
    setIsGeneratingQuestion(true);
    console.log("🤔 Generating personalized question...", {
      currentStage,
      collectedData,
    });

    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Create a context-aware prompt for the AI
      let prompt = "";
      switch (currentStage) {
        case "experience":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}".
          
Generate ONE specific, engaging question to ask about their work experience that's relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant experience for their specific job target
- Encourage detailed responses about achievements
- Be a single sentence

Question:`;
          break;

        case "skills":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}" and has experience: "${collectedData.experience}".
          
Generate ONE specific question to ask about their technical/professional skills that's relevant to their target role. The question should:
- Be conversational and friendly
- Focus on skills relevant to their job target
- Consider their experience background
- Be a single sentence

Question:`;
          break;

        case "education":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}".
          
Generate ONE specific question about their educational background relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant degrees, certifications, or training
- Be a single sentence

Question:`;
          break;

        case "personal":
          prompt = `You are a professional resume coach. Generate a friendly, single-sentence question asking for their contact information (full name, email, and location). Keep it simple and professional.

Question:`;
          break;

        default:
          return "Tell me more about that.";
      }

      // Call our server-side API route
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          maxTokens: 100,
          temperature: 0.8,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${data.model} API success`);
        return data.text;
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.error("Error generating question:", error);
      // Fallback to default questions
      const fallbacks: Record<string, string> = {
        experience:
          "Great! Now tell me about your work experience. What's your most recent role and what did you accomplish there?",
        skills:
          "Excellent! What are your key skills and technologies? List them out.",
        education:
          "Perfect! What's your educational background? (e.g., 'Bachelor's in Computer Science from MIT, 2018')",
        personal:
          "Almost done! What's your full name, email, and location? (e.g., 'John Smith, john@email.com, San Francisco, CA')",
      };
      return fallbacks[currentStage] || "Tell me more.";
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Initialize AI greeting when component mounts
  useEffect(() => {
    if (user && !loading) {
      initializeAIGreeting();
    }
  }, [user, loading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addAssistantMessage = (content: string, delay: number = 500) => {
    setTimeout(() => {
      const message: Message = {
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, message]);
    }, delay);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userResponse = currentInput;
    setCurrentInput("");

    // Process based on current stage
    switch (stage) {
      case "job_target":
        setResumeData((prev) => ({ ...prev, jobTarget: userResponse }));
        setStage("experience");

        // Generate personalized question based on job target
        const experienceQuestion = await generateNextQuestion("experience", {
          ...resumeData,
          jobTarget: userResponse,
        });
        addAssistantMessage(experienceQuestion);
        break;

      case "experience":
        setResumeData((prev) => ({ ...prev, experience: userResponse }));
        setStage("skills");

        // Generate personalized question based on job target and experience
        const skillsQuestion = await generateNextQuestion("skills", {
          ...resumeData,
          experience: userResponse,
        });
        addAssistantMessage(skillsQuestion);
        break;

      case "skills":
        setResumeData((prev) => ({ ...prev, skills: userResponse }));
        setStage("education");

        // Generate personalized question based on previous answers
        const educationQuestion = await generateNextQuestion("education", {
          ...resumeData,
          skills: userResponse,
        });
        addAssistantMessage(educationQuestion);
        break;

      case "education":
        setResumeData((prev) => ({ ...prev, education: userResponse }));
        setStage("personal");

        // Generate personalized final question
        const personalQuestion = await generateNextQuestion("personal", {
          ...resumeData,
          education: userResponse,
        });
        addAssistantMessage(personalQuestion);
        break;

      case "personal":
        // Parse personal info
        const parts = userResponse.split(",").map((p) => p.trim());
        const personalInfo = {
          name: parts[0] || "",
          email: parts[1] || "",
          location: parts[2] || "",
        };
        setResumeData((prev) => ({
          ...prev,
          personalInfo,
        }));
        setStage("generating");

        addAssistantMessage(
          "Thanks! Now I'm using AI to create a professional resume tailored to your target role. This will take just a moment..."
        );

        // Generate resume using AI and save to database
        setTimeout(async () => {
          try {
            if (!user) {
              throw new Error("User not authenticated");
            }

            // Prepare structured resume data for AI
            const structuredData = {
              personalInfo: {
                name: personalInfo.name,
                email: personalInfo.email,
                location: personalInfo.location,
              },
              summary: `Seeking ${resumeData.jobTarget || "new opportunities"}`,
              experience: [
                {
                  title: "Professional Experience",
                  company: "Previous Company",
                  duration: "Recent",
                  description: resumeData.experience || "",
                  achievements: [],
                },
              ],
              education: [
                {
                  degree: resumeData.education || "",
                  institution: "",
                  year: "",
                },
              ],
              skills: resumeData.skills
                ? resumeData.skills.split(",").map((s) => s.trim())
                : [],
            };

            // Call the AI to generate enhanced content
            console.log("🚀 Starting AI resume generation...");
            const enhancedContent = await generateResumeContent(
              structuredData,
              "modern",
              "professional"
            );

            if (enhancedContent) {
              setGeneratedResume(enhancedContent);

              // Track which model was used
              const modelName = aiConnectionStatus?.model || "AI";
              setAiModelUsed(modelName);
              console.log(`✅ Resume generated using ${modelName}`);

              // Generate unique slug for shareable URL
              const slug = generateUniqueSlug(personalInfo.name || "resume");

              // Prepare resume profile for database
              const resumeProfile = {
                userId: user.uid,
                title: `${personalInfo.name}'s Resume - ${
                  resumeData.jobTarget || "Professional"
                }`,
                summary: enhancedContent.enhancedSummary,
                skills: (resumeData.skills
                  ? resumeData.skills.split(",").map((s) => s.trim())
                  : []
                )
                  .concat(enhancedContent.skillSuggestions || [])
                  .map((skill) => ({
                    name: skill,
                    level: "intermediate",
                    visibility: "public" as const,
                  })),
                experience: enhancedContent.enhancedExperience.map((exp) => ({
                  company: exp.company,
                  role: exp.title,
                  startDate: exp.duration,
                  description: exp.enhancedDescription,
                  visibility: "public" as const,
                })),
                education: [
                  {
                    institution: "",
                    degree: resumeData.education || "",
                    startDate: "",
                    visibility: "public" as const,
                  },
                ],
                contact: {
                  email: {
                    value: personalInfo.email,
                    visibility: "public" as const,
                  },
                  phone: { value: "", visibility: "public" as const },
                },
                projects: [],
                generatedText: {
                  draft: JSON.stringify(structuredData),
                  polished: JSON.stringify(enhancedContent),
                  lastGeneratedAt: new Date().toISOString(),
                },
                slug,
                published: true,
                lastUpdatedAt: new Date().toISOString(),
              };

              // Save to Firestore
              const docRef = await addDoc(collection(db, "resumeProfiles"), {
                ...resumeProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              console.log("Resume saved with ID:", docRef.id);

              setStage("complete");
              addAssistantMessage(
                `🎉 Your resume is ready! You can share it at: ${window.location.origin}/resume/${slug}`,
                1000
              );

              // Redirect to the shareable resume page after a delay
              setTimeout(() => {
                router.push(`/resume/${slug}`);
              }, 3000);
            } else {
              throw new Error(aiError || "Failed to generate resume content");
            }
          } catch (error) {
            console.error("Resume generation error:", error);
            addAssistantMessage(
              `I had trouble generating your resume: ${
                error instanceof Error ? error.message : "Unknown error"
              }. Please try again.`,
              1000
            );
            setStage("personal"); // Reset to allow retry
          }
        }, 2000);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">AI Resume Assistant</h1>
              <p className="text-gray-400">
                Smart, conversational resume creation
              </p>
            </div>
            {aiConnectionStatus && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  aiConnectionStatus.connected
                    ? "bg-green-900/30 text-green-300 border border-green-500/50"
                    : "bg-red-900/30 text-red-300 border border-red-500/50"
                }`}
              >
                {aiConnectionStatus.connected
                  ? `✓ ${aiConnectionStatus.model} Connected`
                  : "⚠️ AI Unavailable"}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Show initial loading state */}
          {messages.length === 0 && isGeneratingQuestion && (
            <div className="flex justify-center items-center py-12 space-y-4 flex-col">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
              <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg px-6 py-3">
                <p className="text-purple-300 text-sm font-medium">
                  🤖 Connecting to AI and preparing your assistant...
                </p>
                <p className="text-purple-400 text-xs mt-1">
                  Testing Gemini and HuggingFace APIs
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Generated Resume Display */}
          {generatedResume && (
            <div className="bg-gray-800 p-6 rounded-lg mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Your Generated Resume Preview
                </h3>
                {aiModelUsed && (
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/50">
                    Generated by {aiModelUsed}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-blue-400">
                    Enhanced Summary
                  </h4>
                  <p className="text-sm text-gray-300">
                    {generatedResume.enhancedSummary}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-400">Experience</h4>
                  <p className="text-sm text-gray-300">
                    {generatedResume.enhancedExperience[0]?.enhancedDescription}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-blue-400">
                    Suggested Skills
                  </h4>
                  <p className="text-sm text-gray-300">
                    {generatedResume.skillSuggestions.join(", ")}
                  </p>
                </div>
                <div className="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded">
                  <p className="text-green-300 text-sm">
                    ✓ Resume saved! Redirecting to your shareable page...
                  </p>
                </div>
              </div>
            </div>
          )}

          {isGeneratingQuestion && (
            <div className="flex justify-start">
              <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                <p className="text-sm text-purple-300">
                  AI is crafting your next question...
                </p>
              </div>
            </div>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg px-4 py-2">
                <p className="text-blue-300 text-sm font-medium">
                  🤖 AI is generating your resume...
                </p>
                <p className="text-blue-400 text-xs mt-1">
                  Check browser console (F12) for live AI call details
                </p>
              </div>
            </div>
          )}

          {aiError && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mt-4">
              <p className="text-red-300 text-sm">⚠️ AI Error: {aiError}</p>
              <p className="text-red-400 text-xs mt-1">
                Check browser console for error details
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-gray-700">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={
                stage === "generating"
                  ? "Generating your resume..."
                  : stage === "complete"
                  ? "Resume ready! Check above."
                  : "Type your response here..."
              }
              className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={stage === "generating" || stage === "complete"}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !currentInput.trim() ||
                stage === "generating" ||
                stage === "complete"
              }
            >
              {stage === "generating" ? "Generating..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
