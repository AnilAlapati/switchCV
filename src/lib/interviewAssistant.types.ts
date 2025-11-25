/**
 * Interview Preparation Assistant Types
 */

export interface InterviewQuestion {
  id: string;
  question: string;
  category: "behavioral" | "technical" | "situational" | "role-specific";
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number; // seconds
  tips: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  jobTitle: string;
  jobDescription?: string;
  companyName?: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  status: "pending" | "in-progress" | "completed";
  score?: number;
  feedback?: string;
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  duration: number; // seconds
  timestamp: Date;
  feedback?: string;
  score?: number;
}

export interface InterviewFeedback {
  questionId: string;
  question: string;
  userAnswer: string;
  feedback: string;
  score: number; // 0-100
  strengths: string[];
  improvements: string[];
  suggestedAnswer?: string;
}

export interface InterviewTips {
  general: string[];
  technical: string[];
  behavioral: string[];
  roleSpecific: string[];
  communication: string[];
  confidence: string[];
}

export interface MockInterviewerResponse {
  sessionId: string;
  nextQuestion?: InterviewQuestion;
  currentQuestionIndex: number;
  totalQuestions: number;
  sessionStatus: "in-progress" | "completed";
  sessionScore?: number;
  feedback?: InterviewFeedback;
}

export interface InterviewStats {
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  improvementRate: number;
  strongAreas: string[];
  weakAreas: string[];
  recommendedFocus: string[];
}

export interface PracticeSession {
  id: string;
  sessionType: "mock-interview" | "specific-topic" | "speed-round";
  numberOfQuestions: number;
  focusAreas: string[];
  createdAt: Date;
  duration: number; // minutes
}
