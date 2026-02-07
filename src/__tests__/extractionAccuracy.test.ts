 
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";
import { ResumeDataRequirements } from "@/lib/services/conversationManager";

// --- Data Generators ---

const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
];
const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
];
const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA"];
const skillsList = [
  "JavaScript",
  "Python",
  "Java",
  "C++",
  "React",
  "Node.js",
  "AWS",
  "Docker",
  "Kubernetes",
  "SQL",
  "NoSQL",
  "TypeScript",
  "Go",
  "Rust",
  "HTML",
  "CSS",
  "Git",
  "CI/CD",
  "Agile",
  "Scrum",
];
const companies = [
  "TechCorp",
  "DataSystems",
  "CloudNet",
  "SoftSol",
  "WebWorks",
  "Appify",
  "NetSys",
  "CodeLab",
  "DevStudio",
  "SysTech",
];
const titles = [
  "Software Engineer",
  "Developer",
  "Frontend Dev",
  "Backend Dev",
  "Full Stack Engineer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "QA Engineer",
  "System Admin",
];
const degrees = [
  "Bachelor of Science",
  "Master of Science",
  "PhD",
  "Associate Degree",
  "Bachelor of Arts",
];
const majors = [
  "Computer Science",
  "Information Technology",
  "Software Engineering",
  "Data Science",
  "Mathematics",
  "Physics",
  "Electrical Engineering",
];
const universities = [
  "State University",
  "Tech Institute",
  "City College",
  "National University",
  "Global Academy",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomProfile(): ResumeDataRequirements {
  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  const city = getRandomElement(cities);
  const state = getRandomElement(states);
  const location = `${city}, ${state}`;

  const numSkills = 3 + Math.floor(Math.random() * 5);
  const skills = Array.from({ length: numSkills }, () =>
    getRandomElement(skillsList)
  );

  return {
    name,
    email,
    phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
      1000 + Math.random() * 9000
    )}`,
    location,
    summary: `Experienced professional seeking a role in ${getRandomElement(
      titles
    )}.`,
    experience: [
      {
        title: getRandomElement(titles),
        company: getRandomElement(companies),
        duration: "2 years",
        description: "Worked on various projects.",
      },
    ],
    education: [
      {
        degree: getRandomElement(degrees),
        institution: getRandomElement(universities),
        year: "2020",
        major: getRandomElement(majors),
      },
    ],
    skills: [...new Set(skills)], // Deduplicate
  };
}

// --- Conversation Simulators ---

function generateConversation(
  profile: ResumeDataRequirements,
  scenario: "structured" | "conversational" | "messy"
): { content: string; isUser: boolean }[] {
  const history: { content: string; isUser: boolean }[] = [];

  // AI starts
  history.push({
    content: "Hi! I'm here to help you build your resume. What's your name?",
    isUser: false,
  });

  if (scenario === "structured") {
    // User gives clear, direct answers
    history.push({ content: `My name is ${profile.name}.`, isUser: true });
    history.push({
      content: `Great, ${profile.name}. What is your email?`,
      isUser: false,
    });
    history.push({ content: `My email is ${profile.email}.`, isUser: true });
    history.push({ content: `Thanks. Where are you located?`, isUser: false });
    history.push({
      content: `I am located in ${profile.location}.`,
      isUser: true,
    });
    history.push({ content: `What are your skills?`, isUser: false });
    history.push({
      content: `My skills are: ${profile.skills.join(", ")}.`,
      isUser: true,
    });
    history.push({ content: `Tell me about your experience.`, isUser: false });
    history.push({
      content: `I worked as a ${profile.experience[0].title} at ${profile.experience[0].company}.`,
      isUser: true,
    });
    history.push({ content: `And your education?`, isUser: false });
    history.push({
      content: `I have a ${profile.education[0].degree} from ${profile.education[0].institution}.`,
      isUser: true,
    });
  } else if (scenario === "conversational") {
    // User weaves info into sentences
    history.push({
      content: `Hi, I'm ${profile.name} and I'm a developer.`,
      isUser: true,
    });
    history.push({
      content: `Nice to meet you. How can I contact you?`,
      isUser: false,
    });
    history.push({
      content: `You can reach me at ${profile.email} or my phone 555-010-9999.`,
      isUser: true,
    }); // Phone might differ from profile, checking extraction of *an* email
    history.push({ content: `Where are you based?`, isUser: false });
    history.push({
      content: `I live in ${profile.location} currently.`,
      isUser: true,
    });
    history.push({ content: `What tech stack do you know?`, isUser: false });
    history.push({
      content: `I've been working with ${profile.skills.join(" and ")} mostly.`,
      isUser: true,
    });
    history.push({ content: `Any work history?`, isUser: false });
    history.push({
      content: `Yeah, I spent some time at ${profile.experience[0].company} as a ${profile.experience[0].title}.`,
      isUser: true,
    });
    history.push({ content: `Education?`, isUser: false });
    history.push({
      content: `Graduated from ${profile.education[0].institution} with a ${profile.education[0].degree}.`,
      isUser: true,
    });
  } else if (scenario === "messy") {
    // User is brief, lowercase, maybe typos (simulated by simple patterns)
    history.push({ content: `${profile.name.toLowerCase()}`, isUser: true });
    history.push({ content: `Email?`, isUser: false });
    history.push({ content: `${profile.email}`, isUser: true });
    history.push({ content: `Location?`, isUser: false });
    history.push({
      content: `${(profile.location || "").toLowerCase()}`,
      isUser: true,
    });
    history.push({ content: `Skills?`, isUser: false });
    history.push({ content: `${profile.skills.join(" ")}`, isUser: true }); // Space separated
    history.push({ content: `Experience?`, isUser: false });
    history.push({
      content: `${profile.experience[0].title} @ ${profile.experience[0].company}`,
      isUser: true,
    });
    history.push({ content: `Education?`, isUser: false });
    history.push({
      content: `${profile.education[0].degree} ${profile.education[0].institution}`,
      isUser: true,
    });
  }

  return history;
}

// --- Test Suite ---

describe("Resume Extraction Accuracy Test (Large Scale)", () => {
  // Increase timeout for large scale test
  jest.setTimeout(60000);

  const NUM_USERS = 1000;
  const SCENARIOS: ("structured" | "conversational" | "messy")[] = [
    "structured",
    "conversational",
    "messy",
  ];

  test(`Should measure extraction accuracy across ${NUM_USERS} simulated users`, () => {
    let totalFields = 0;
    let correctlyExtractedFields = 0;

    const fieldStats = {
      name: { total: 0, correct: 0 },
      email: { total: 0, correct: 0 },
      location: { total: 0, correct: 0 },
      skills: { total: 0, correct: 0 },
      experience: { total: 0, correct: 0 },
      education: { total: 0, correct: 0 },
    };

    console.log(`\n🚀 Starting extraction test for ${NUM_USERS} users...`);

    for (let i = 0; i < NUM_USERS; i++) {
      const profile = generateRandomProfile();
      const scenario = SCENARIOS[i % SCENARIOS.length];
      const conversation = generateConversation(profile, scenario);

      const result = ResumeDataExtractor.extractFromConversation(conversation);
      const extracted = result.data;

      // Check Name
      fieldStats.name.total++;
      if (
        extracted.name &&
        extracted.name
          .toLowerCase()
          .includes(profile.name.split(" ")[0].toLowerCase())
      ) {
        // Loose match for first name at least
        fieldStats.name.correct++;
        correctlyExtractedFields++;
      }
      totalFields++;

      // Check Email
      fieldStats.email.total++;
      if (extracted.email === profile.email) {
        fieldStats.email.correct++;
        correctlyExtractedFields++;
      }
      totalFields++;

      // Check Location
      fieldStats.location.total++;
      // Location matching is tricky with regex, check if city is present
      if (
        extracted.location &&
        profile.location &&
        extracted.location
          .toLowerCase()
          .includes(profile.location.split(",")[0].toLowerCase())
      ) {
        fieldStats.location.correct++;
        correctlyExtractedFields++;
      }
      totalFields++;

      // Check Skills
      fieldStats.skills.total++;
      if (extracted.skills && extracted.skills.length > 0) {
        // Check if at least 50% of skills were captured
        const capturedCount = profile.skills.filter((s) =>
          extracted.skills?.some((es) =>
            es.toLowerCase().includes(s.toLowerCase())
          )
        ).length;
        if (capturedCount / profile.skills.length >= 0.5) {
          fieldStats.skills.correct++;
          correctlyExtractedFields++;
        }
      }
      totalFields++;

      // Check Experience
      fieldStats.experience.total++;
      if (extracted.experience && extracted.experience.length > 0) {
        // Check if company or title matches
        const match = extracted.experience.some(
          (e) =>
            e.company
              .toLowerCase()
              .includes(profile.experience[0].company.toLowerCase()) ||
            e.title
              .toLowerCase()
              .includes(profile.experience[0].title.toLowerCase())
        );
        if (match) {
          fieldStats.experience.correct++;
          correctlyExtractedFields++;
        }
      }
      totalFields++;

      // Check Education
      fieldStats.education.total++;
      if (extracted.education && extracted.education.length > 0) {
        const match = extracted.education.some(
          (e) =>
            e.institution
              .toLowerCase()
              .includes(profile.education[0].institution.toLowerCase()) ||
            e.degree
              .toLowerCase()
              .includes(profile.education[0].degree.toLowerCase())
        );
        if (match) {
          fieldStats.education.correct++;
          correctlyExtractedFields++;
        }
      }
      totalFields++;
    }

    const overallAccuracy = (correctlyExtractedFields / totalFields) * 100;

    console.log(`\n📊 Extraction Accuracy Report (${NUM_USERS} users)`);
    console.log(`================================================`);
    console.log(`Overall Accuracy: ${overallAccuracy.toFixed(2)}%`);
    console.log(`------------------------------------------------`);
    console.log(
      `Name Extraction:      ${(
        (fieldStats.name.correct / fieldStats.name.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Email Extraction:     ${(
        (fieldStats.email.correct / fieldStats.email.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Location Extraction:  ${(
        (fieldStats.location.correct / fieldStats.location.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Skills Extraction:    ${(
        (fieldStats.skills.correct / fieldStats.skills.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Experience Extraction:${(
        (fieldStats.experience.correct / fieldStats.experience.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(
      `Education Extraction: ${(
        (fieldStats.education.correct / fieldStats.education.total) *
        100
      ).toFixed(2)}%`
    );
    console.log(`================================================\n`);

    // Assertions - these are baseline expectations. If they fail, the algorithm needs improvement.
    // We expect high accuracy for structured data like Email.
    expect(fieldStats.email.correct / fieldStats.email.total).toBeGreaterThan(
      0.9
    );

    // We expect decent accuracy for Name (it's hard with regex only)
    expect(fieldStats.name.correct / fieldStats.name.total).toBeGreaterThan(
      0.5
    );
  });
});
