/**
 * Mock AI Resume Generator - Fallback when Cloud Function is unavailable
 * Generates realistic resume enhancements using predefined templates and patterns
 */

export interface MockEnhancedResumeContent {
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

const summaryTemplates = [
  "Results-driven {role} with {years} years of proven experience in {industry}. Demonstrated expertise in {skill1} and {skill2} with a track record of delivering measurable impact.",
  "Innovative {role} skilled in {skill1}, {skill2}, and {skill3}. {years} years of experience driving digital transformation and improving operational efficiency.",
  "Strategic-minded {role} combining technical expertise with business acumen. Specialized in {skill1} and {skill2} with consistent success delivering high-impact solutions.",
];

const achievementVerbs = [
  "Increased",
  "Improved",
  "Reduced",
  "Optimized",
  "Streamlined",
  "Enhanced",
  "Pioneered",
  "Spearheaded",
  "Accelerated",
  "Transformed",
  "Delivered",
  "Architected",
  "Scaled",
  "Launched",
  "Implemented",
];

const metrics = [
  "by 25%",
  "by 40%",
  "by 35%",
  "to 90%",
  "by 50%",
  "from 2 to 8",
  "saving $100K+",
  "reducing costs 30%",
  "improving efficiency 45%",
];

const recommendedSkills = [
  "Project Management",
  "Strategic Planning",
  "Data Analysis",
  "Cross-functional Leadership",
  "Agile Methodology",
  "Risk Management",
  "Stakeholder Communication",
  "Process Optimization",
  "Business Intelligence",
  "Cloud Architecture",
  "System Design",
  "Performance Optimization",
];

/**
 * Generate mock enhanced resume content
 */
export function generateMockEnhancedResume(
  name: string,
  currentRole: string,
  currentCompany: string,
  skills: string[]
): MockEnhancedResumeContent {
  // Generate enhanced summary
  const template =
    summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];
  const enhancedSummary = template
    .replace("{role}", currentRole || "Professional")
    .replace("{years}", "7+")
    .replace("{industry}", "technology and innovation")
    .replace("{skill1}", skills[0] || "leadership")
    .replace("{skill2}", skills[1] || "problem-solving");

  // Generate enhanced experience
  const enhancedExperience = [
    {
      title: currentRole || "Senior Professional",
      company: currentCompany || "Leading Organization",
      duration: "2020 - Present",
      description: `Drove key initiatives and managed cross-functional teams in ${
        currentRole || "professional"
      } capacity.`,
      achievements: [
        `${
          achievementVerbs[Math.floor(Math.random() * achievementVerbs.length)]
        } operational efficiency ${
          metrics[Math.floor(Math.random() * metrics.length)]
        }`,
        `Led implementation of new ${
          skills[0] || "technical"
        } solutions resulting in improved outcomes`,
        "Mentored junior team members and contributed to professional growth",
      ],
      enhancedDescription: `Strategic ${currentRole || "professional"} at ${
        currentCompany || "organization"
      } focused on ${
        skills[0] || "innovation"
      }. Demonstrated strong leadership in managing multiple initiatives simultaneously, with consistent delivery of results-driven outcomes. Expertise in leveraging ${
        skills[1] || "technology"
      } to solve complex business challenges.`,
    },
  ];

  // Suggest additional skills
  const skillSuggestions = recommendedSkills
    .filter((s) => !skills.includes(s))
    .slice(0, 5);

  // Generate improvement tips
  const improvementTips = [
    "Add quantifiable metrics to all role descriptions (e.g., 'Increased sales by 25%')",
    "Include 3-4 bullet points per role with specific achievements",
    "Highlight technical skills relevant to target positions",
    "Use active voice and strong action verbs to describe accomplishments",
    "Group related skills together for better organization",
    "Add certifications and continuous learning initiatives",
  ];

  return {
    enhancedSummary,
    enhancedExperience,
    skillSuggestions,
    improvementTips,
  };
}
