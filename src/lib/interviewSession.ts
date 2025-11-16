/**
 * Interview Session Manager
 * Manages interview sessions, scoring, and progress
 */

import {
  InterviewSession,
  InterviewAnswer,
  InterviewTips,
  MockInterviewerResponse,
} from "./interviewAssistant.types";
import { generateInterviewQuestions } from "./interviewQuestions";

/**
 * Create a new interview session
 */
export function createInterviewSession(
  userId: string,
  jobTitle: string,
  jobDescription?: string,
  companyName?: string,
  numberOfQuestions: number = 5
): InterviewSession {
  const questions = generateInterviewQuestions(jobTitle, numberOfQuestions);

  return {
    id: generateSessionId(),
    userId,
    jobTitle,
    jobDescription,
    companyName,
    startTime: new Date(),
    duration: numberOfQuestions * 3,
    questions,
    answers: [],
    status: "pending",
  };
}

/**
 * Submit answer to a question
 */
export function submitAnswer(
  session: InterviewSession,
  questionIndex: number,
  answer: string,
  duration: number
): InterviewAnswer {
  if (questionIndex < 0 || questionIndex >= session.questions.length) {
    throw new Error("Invalid question index");
  }

  const question = session.questions[questionIndex];

  return {
    questionId: question.id,
    answer,
    duration,
    timestamp: new Date(),
    score: scoreAnswer(answer, duration, question.timeLimit),
  };
}

/**
 * Calculate score for individual answer
 */
function scoreAnswer(
  answer: string,
  duration: number,
  timeLimit: number
): number {
  let score = 50; // Base score

  // Completeness (max 30 points)
  const wordCount = answer.trim().split(/\s+/).length;
  if (wordCount >= 50) score += 30;
  else if (wordCount >= 30) score += 20;
  else if (wordCount >= 15) score += 10;

  // Time usage (max 20 points)
  const timeRatio = duration / timeLimit;
  if (timeRatio >= 0.7 && timeRatio <= 1.2) score += 20;
  else if (timeRatio > 0.5 && timeRatio < 1.5) score += 15;
  else if (timeRatio > 0.3) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate overall session score
 */
export function calculateSessionScore(answers: InterviewAnswer[]): number {
  if (answers.length === 0) return 0;

  const scores = answers.map((a) => a.score || 50);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Get next question in interview
 */
export function getNextQuestion(
  session: InterviewSession,
  currentIndex: number
): MockInterviewerResponse {
  const nextIndex = currentIndex + 1;
  const nextQuestion =
    nextIndex < session.questions.length
      ? session.questions[nextIndex]
      : undefined;

  const isComplete = nextIndex >= session.questions.length;

  return {
    sessionId: session.id,
    nextQuestion,
    currentQuestionIndex: nextIndex,
    totalQuestions: session.questions.length,
    sessionStatus: isComplete ? "completed" : "in-progress",
  };
}

/**
 * Complete interview session
 */
export function completeSession(
  session: InterviewSession,
  answers: InterviewAnswer[]
): InterviewSession {
  const score = calculateSessionScore(answers);

  return {
    ...session,
    endTime: new Date(),
    status: "completed",
    answers,
    score,
    feedback: generateSessionFeedback(score),
  };
}

/**
 * Generate feedback based on score
 */
function generateSessionFeedback(score: number): string {
  if (score >= 85)
    return "Excellent! You demonstrated strong communication and prepared answers. Keep this up!";
  if (score >= 75)
    return "Very good! Your answers were well-structured. Focus on adding more specific examples.";
  if (score >= 65)
    return "Good effort! Work on expanding your answers with more details and examples.";
  if (score >= 50)
    return "You covered the basics. Practice longer, more detailed responses to improve.";
  return "Keep practicing! Work on answer completeness and speaking at a steady pace.";
}

/**
 * Get interview preparation tips
 */
export function getInterviewTips(jobTitle?: string): InterviewTips {
  return {
    general: [
      "Research the company and its culture thoroughly",
      "Practice active listening and take mental notes",
      "Use the STAR method for behavioral questions",
      "Prepare 2-3 specific examples from your experience",
      "Arrive early and settle in before the interview",
      "Maintain good posture and eye contact",
      "Turn off phone and eliminate distractions",
      "Bring extra copies of your resume",
    ],
    technical: [
      "Review key concepts and frameworks for your role",
      "Practice problem-solving with actual tools",
      "Walk through your technical approach step-by-step",
      "Admit when you don't know something",
      "Ask clarifying questions before diving in",
      "Discuss trade-offs in your technical solutions",
      "Explain your reasoning as you work",
      "Show your work and thinking process",
    ],
    behavioral: [
      "Tell compelling stories that highlight achievements",
      "Use specific metrics and measurable outcomes",
      "Show self-awareness about strengths and growth",
      "Explain what you learned from failures",
      "Demonstrate teamwork and leadership examples",
      "Connect your experiences to job requirements",
      "Avoid negative comments about past employers",
      "Show enthusiasm for the role and company",
    ],
    roleSpecific:
      jobTitle && jobTitle.toLowerCase().includes("engineer")
        ? [
            "Discuss your preferred tech stack",
            "Be ready to explain architecture decisions",
            "Understand the company's technology choices",
            "Discuss your approach to code quality",
            "Prepare examples of scaling challenges",
          ]
        : jobTitle && jobTitle.toLowerCase().includes("manager")
        ? [
            "Describe your leadership philosophy",
            "Prepare team management examples",
            "Discuss conflict resolution approach",
            "Share employee development experiences",
            "Explain your communication style",
          ]
        : [
            `Research what ${jobTitle} typically involves`,
            "Understand key responsibilities",
            "Prepare relevant experience examples",
            "Know success metrics for the role",
            "Think about your career trajectory",
          ],
    communication: [
      "Speak clearly and at a moderate pace",
      "Avoid filler words (um, uh, like)",
      "Use confident and positive language",
      "Ask clarifying questions to show engagement",
      "Summarize key points in your answers",
      "Make answers concise yet complete",
      "Use concrete examples instead of vague statements",
      "Pause briefly to think before answering",
    ],
    confidence: [
      "Remember your qualifications and value",
      "Practice answers until they feel natural",
      "Focus on your accomplishments",
      "View interview as mutual evaluation",
      "Prepare thoughtful questions for interviewer",
      "Be authentic - authenticity matters",
      "Take deep breaths and stay calm",
      "Smile and maintain positive energy",
    ],
  };
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
