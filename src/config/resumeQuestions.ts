export interface Question {
  id: string;
  question: string;
  type: "text" | "textarea" | "select" | "multiselect";
  required: boolean;
  placeholder?: string;
  options?: string[];
  category:
  | "personal"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "summary"
  | "preferences";
  followUp?: string[];
  validation?: {
    pattern?: string;
    message?: string;
  };
}

export const resumeQuestions: Question[] = [
  // Personal Information
  {
    id: "personal_name",
    question: "What's your full name?",
    type: "text",
    required: true,
    placeholder: "e.g., John Doe",
    category: "personal",
    validation: {
      pattern: ".+",
      message: "Please enter your full name",
    },
  },
  {
    id: "personal_email",
    question: "What's your email address?",
    type: "text",
    required: true,
    placeholder: "e.g., john.doe@email.com",
    category: "personal",
    validation: {
      pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      message: "Please enter a valid email address",
    },
  },
  {
    id: "personal_phone",
    question: "What's your phone number? (optional)",
    type: "text",
    required: false,
    placeholder: "e.g., +1 (555) 123-4567",
    category: "personal",
  },
  {
    id: "personal_location",
    question: "Where are you located?",
    type: "text",
    required: true,
    placeholder: "e.g., New York, NY or Remote",
    category: "personal",
  },
  {
    id: "personal_linkedin",
    question: "What's your LinkedIn profile URL? (optional)",
    type: "text",
    required: false,
    placeholder: "e.g., https://linkedin.com/in/johndoe",
    category: "personal",
  },
  {
    id: "personal_github",
    question: "What's your GitHub profile URL? (optional)",
    type: "text",
    required: false,
    placeholder: "e.g., https://github.com/johndoe",
    category: "personal",
  },

  // Professional Summary
  {
    id: "summary",
    question:
      "Tell me about your professional background in 2-3 sentences. What makes you unique?",
    type: "textarea",
    required: true,
    placeholder:
      "e.g., I'm a passionate software engineer with 5 years of experience...",
    category: "summary",
    validation: {
      pattern: ".{50,}",
      message: "Please provide at least 50 characters for your summary",
    },
  },

  // Work Experience
  {
    id: "experience_count",
    question: "How many work experiences would you like to include?",
    type: "select",
    required: true,
    options: ["1", "2", "3", "4", "5+"],
    category: "experience",
  },
  {
    id: "experience_1_title",
    question: "What was your most recent job title?",
    type: "text",
    required: true,
    placeholder: "e.g., Senior Software Engineer",
    category: "experience",
  },
  {
    id: "experience_1_company",
    question: "Which company did you work for?",
    type: "text",
    required: true,
    placeholder: "e.g., Google Inc.",
    category: "experience",
  },
  {
    id: "experience_1_duration",
    question: "When did you work there? (start date - end date)",
    type: "text",
    required: true,
    placeholder: "e.g., Jan 2020 - Present",
    category: "experience",
  },
  {
    id: "experience_1_description",
    question:
      "Describe your key responsibilities and achievements in this role.",
    type: "textarea",
    required: true,
    placeholder:
      "e.g., Led development of... Increased performance by... Collaborated with...",
    category: "experience",
  },

  // Education
  {
    id: "education_count",
    question: "How many educational qualifications would you like to include?",
    type: "select",
    required: true,
    options: ["1", "2", "3"],
    category: "education",
  },
  {
    id: "education_1_degree",
    question: "What degree did you earn?",
    type: "text",
    required: true,
    placeholder: "e.g., Bachelor of Science in Computer Science",
    category: "education",
  },
  {
    id: "education_1_institution",
    question: "Which institution did you attend?",
    type: "text",
    required: true,
    placeholder: "e.g., Stanford University",
    category: "education",
  },
  {
    id: "education_1_year",
    question: "What year did you graduate?",
    type: "text",
    required: true,
    placeholder: "e.g., 2018",
    category: "education",
  },
  {
    id: "education_1_gpa",
    question: "What was your GPA? (optional)",
    type: "text",
    required: false,
    placeholder: "e.g., 3.8",
    category: "education",
  },

  // Skills
  {
    id: "skills",
    question:
      "What are your key technical and soft skills? (separate with commas)",
    type: "textarea",
    required: true,
    placeholder:
      "e.g., JavaScript, React, Node.js, Team Leadership, Problem Solving",
    category: "skills",
  },

  // Projects (optional)
  {
    id: "projects_count",
    question: "How many projects would you like to highlight? (optional)",
    type: "select",
    required: false,
    options: ["0", "1", "2", "3"],
    category: "projects",
  },
  {
    id: "project_1_name",
    question: "What's the name of your project?",
    type: "text",
    required: false,
    placeholder: "e.g., E-commerce Platform",
    category: "projects",
  },
  {
    id: "project_1_description",
    question: "Describe this project briefly.",
    type: "textarea",
    required: false,
    placeholder:
      "e.g., Built a full-stack e-commerce platform using React and Node.js...",
    category: "projects",
  },
  {
    id: "project_1_technologies",
    question: "What technologies did you use? (separate with commas)",
    type: "text",
    required: false,
    placeholder: "e.g., React, Node.js, MongoDB, AWS",
    category: "projects",
  },

  // Preferences
  {
    id: "preferences_template",
    question: "Which resume template would you like to use?",
    type: "select",
    required: true,
    options: ["modern", "classic", "technical", "creative"],
    category: "preferences",
  },
  {
    id: "preferences_tone",
    question: "What tone should the resume have?",
    type: "select",
    required: true,
    options: ["professional", "concise", "storytelling", "academic"],
    category: "preferences",
  },
  {
    id: "preferences_mode",
    question: "Choose your AI Workflow Mode:",
    type: "select",
    required: true,
    options: [
      "Standard (Fast, 2-Agent)",
      "Autonomous (Deep, 5-Agent)"
    ],
    placeholder: "Select workflow mode",
    category: "preferences",
  },
];

export const getQuestionById = (id: string): Question | undefined => {
  return resumeQuestions.find((q) => q.id === id);
};

export const getQuestionsByCategory = (
  category: Question["category"]
): Question[] => {
  return resumeQuestions.filter((q) => q.category === category);
};

export const getNextQuestion = (currentQuestionId: string): Question | null => {
  const currentIndex = resumeQuestions.findIndex(
    (q) => q.id === currentQuestionId
  );
  if (currentIndex === -1 || currentIndex === resumeQuestions.length - 1) {
    return null;
  }
  return resumeQuestions[currentIndex + 1];
};

export const getPreviousQuestion = (
  currentQuestionId: string
): Question | null => {
  const currentIndex = resumeQuestions.findIndex(
    (q) => q.id === currentQuestionId
  );
  if (currentIndex <= 0) {
    return null;
  }
  return resumeQuestions[currentIndex - 1];
};
