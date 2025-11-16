/**
 * Interview Question Generator
 * Generates role-specific behavioral and technical questions
 */

import { InterviewQuestion } from "./interviewAssistant.types";

/**
 * Generate interview questions based on job role
 */
export function generateInterviewQuestions(
  jobTitle: string,
  numberOfQuestions: number = 5
): InterviewQuestion[] {
  const behavioral = getBehavioralQuestions();
  const technical = getTechnicalQuestions(jobTitle);
  const roleSpecific = getRoleSpecificQuestions(jobTitle);

  // Mix question types
  const mix = [
    ...behavioral.slice(0, 2),
    ...technical.slice(0, 2),
    ...roleSpecific.slice(0, numberOfQuestions - 4),
  ].slice(0, numberOfQuestions);

  return shuffleArray(mix);
}

/**
 * Get behavioral questions (universal)
 */
function getBehavioralQuestions(): InterviewQuestion[] {
  return [
    {
      id: "behavioral-1",
      question:
        "Tell me about a time you faced a difficult challenge at work. How did you overcome it?",
      category: "behavioral",
      difficulty: "medium",
      timeLimit: 180,
      tips: [
        "Use the STAR method",
        "Show problem-solving skills",
        "Quantify results when possible",
        "Explain what you learned",
      ],
    },
    {
      id: "behavioral-2",
      question:
        "Describe a situation where you had to work with someone you didn't get along with.",
      category: "behavioral",
      difficulty: "medium",
      timeLimit: 180,
      tips: [
        "Show maturity and professionalism",
        "Avoid blaming others",
        "Demonstrate empathy and communication",
        "Explain the positive resolution",
      ],
    },
    {
      id: "behavioral-3",
      question: "Tell me about your greatest professional achievement.",
      category: "behavioral",
      difficulty: "easy",
      timeLimit: 180,
      tips: [
        "Pick an achievement with measurable impact",
        "Explain your specific contribution",
        "Highlight key skills demonstrated",
        "Show genuine enthusiasm",
      ],
    },
    {
      id: "behavioral-4",
      question: "How do you handle pressure and tight deadlines?",
      category: "behavioral",
      difficulty: "medium",
      timeLimit: 150,
      tips: [
        "Provide a specific example",
        "Show organizational skills",
        "Demonstrate adaptability",
        "Mention stress management techniques",
      ],
    },
    {
      id: "behavioral-5",
      question: "Describe a time you failed. What did you learn from it?",
      category: "behavioral",
      difficulty: "hard",
      timeLimit: 180,
      tips: [
        "Be honest and take responsibility",
        "Focus on learning and growth",
        "Show resilience and improvement",
        "Avoid excessive negativity",
      ],
    },
  ];
}

/**
 * Get technical questions for the role
 */
function getTechnicalQuestions(jobTitle: string): InterviewQuestion[] {
  const lower = jobTitle.toLowerCase();

  if (lower.includes("engineer") || lower.includes("developer")) {
    return [
      {
        id: "tech-1",
        question: "Explain the difference between REST and GraphQL APIs.",
        category: "technical",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Discuss query efficiency",
          "Explain over/under-fetching",
          "Mention appropriate use cases",
          "Compare performance characteristics",
        ],
      },
      {
        id: "tech-2",
        question: "What are the key principles of clean code?",
        category: "technical",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Readability and maintainability",
          "DRY (Don't Repeat Yourself)",
          "SOLID principles",
          "Real code examples",
        ],
      },
      {
        id: "tech-3",
        question: "How would you optimize a slow database query?",
        category: "technical",
        difficulty: "hard",
        timeLimit: 240,
        tips: [
          "Discuss indexing strategies",
          "Explain query optimization techniques",
          "Mention caching approaches",
          "Measure and validate improvements",
        ],
      },
    ];
  } else if (lower.includes("data")) {
    return [
      {
        id: "tech-1",
        question: "How would you handle missing data in a dataset?",
        category: "technical",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Discuss multiple strategies",
          "Consider business context",
          "Mention tools and libraries",
          "Explain trade-offs",
        ],
      },
      {
        id: "tech-2",
        question: "Explain overfitting in machine learning.",
        category: "technical",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Define the concept clearly",
          "Discuss indicators of overfitting",
          "Explain prevention methods",
          "Provide examples",
        ],
      },
    ];
  } else {
    return [
      {
        id: "tech-1",
        question: "Describe your experience with version control systems.",
        category: "technical",
        difficulty: "easy",
        timeLimit: 180,
        tips: [
          "Discuss Git workflows and commands",
          "Mention branching strategies",
          "Explain collaboration practices",
          "Share real project experience",
        ],
      },
      {
        id: "tech-2",
        question: "How do you stay current with technology trends?",
        category: "technical",
        difficulty: "easy",
        timeLimit: 180,
        tips: [
          "Mention resources and platforms",
          "Show commitment to learning",
          "Give specific examples",
          "Discuss implementation",
        ],
      },
    ];
  }
}

/**
 * Get role-specific questions
 */
function getRoleSpecificQuestions(jobTitle: string): InterviewQuestion[] {
  const lower = jobTitle.toLowerCase();

  if (lower.includes("manager") || lower.includes("lead")) {
    return [
      {
        id: "role-1",
        question: "How do you motivate and develop your team members?",
        category: "role-specific",
        difficulty: "hard",
        timeLimit: 240,
        tips: [
          "Discuss your leadership philosophy",
          "Give team development examples",
          "Explain your mentoring approach",
          "Mention growth tracking methods",
        ],
      },
      {
        id: "role-2",
        question: "How do you handle underperforming team members?",
        category: "role-specific",
        difficulty: "hard",
        timeLimit: 240,
        tips: [
          "Show fairness and empathy",
          "Explain documentation process",
          "Discuss improvement plans",
          "Handle professionally",
        ],
      },
    ];
  } else if (lower.includes("design")) {
    return [
      {
        id: "role-1",
        question: "Walk me through your design process for a project.",
        category: "role-specific",
        difficulty: "medium",
        timeLimit: 240,
        tips: [
          "Start with user research",
          "Discuss user testing methods",
          "Mention design iterations",
          "Explain key design decisions",
        ],
      },
      {
        id: "role-2",
        question: "How do you balance aesthetics with functionality?",
        category: "role-specific",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Discuss user-centered approach",
          "Show design thinking",
          "Provide specific examples",
          "Mention feedback integration",
        ],
      },
    ];
  } else if (lower.includes("data")) {
    return [
      {
        id: "role-1",
        question: "How do you approach data cleaning and preprocessing?",
        category: "role-specific",
        difficulty: "medium",
        timeLimit: 180,
        tips: [
          "Discuss handling missing values",
          "Explain outlier detection",
          "Mention data transformation techniques",
          "Show quality assurance methods",
        ],
      },
      {
        id: "role-2",
        question: "Describe your experience with statistical modeling.",
        category: "role-specific",
        difficulty: "hard",
        timeLimit: 240,
        tips: [
          "Explain model selection process",
          "Discuss validation techniques",
          "Mention performance metrics",
          "Show interpretation of results",
        ],
      },
    ];
  } else {
    return [
      {
        id: "role-1",
        question: `What attracts you to this ${jobTitle} position?`,
        category: "role-specific",
        difficulty: "easy",
        timeLimit: 180,
        tips: [
          "Research company thoroughly",
          "Connect your skills to role requirements",
          "Show genuine interest and enthusiasm",
          "Be specific about role aspects",
        ],
      },
      {
        id: "role-2",
        question: `Where do you see yourself in 5 years as a ${jobTitle}?`,
        category: "role-specific",
        difficulty: "easy",
        timeLimit: 180,
        tips: [
          "Show growth mindset",
          "Align with company values",
          "Be realistic and ambitious",
          "Mention skill development goals",
        ],
      },
    ];
  }
}

/**
 * Shuffle array utility
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
