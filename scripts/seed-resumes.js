
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc } = require('firebase/firestore');

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_EMAIL = 'anilalapati.66+scvr1@gmail.com';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
  "Professional Actor (Theater/Film)"
];

async function generateResumeContent(profession) {
  const prompt = `Generate a realistic, professional resume for a ${profession} with 5-8 years of experience. 
  Return ONLY a valid JSON object matching this structure (no markdown, no comments):
  {
    "title": "${profession}",
    "summary": "Professional summary...",
    "skills": [
      { "name": "Skill 1", "level": "Expert", "visibility": "public" },
      { "name": "Skill 2", "level": "Intermediate", "visibility": "public" }
    ],
    "experience": [
      {
        "company": "Company Name",
        "role": "Job Title",
        "startDate": "2020-01",
        "endDate": "Present",
        "description": "Detailed description of responsibilities and achievements...",
        "visibility": "public"
      }
    ],
    "education": [
      {
        "institution": "University Name",
        "degree": "Degree Name",
        "startDate": "2015-09",
        "endDate": "2019-05",
        "description": "Major/Minor details",
        "visibility": "public"
      }
    ],
    "contact": {
      "email": { "value": "email@example.com", "visibility": "public" },
      "phone": { "value": "+1-555-0123", "visibility": "public" }
    },
    "projects": [
      {
        "name": "Project Name",
        "description": "Project description",
        "visibility": "public"
      }
    ]
  }`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      }
    );

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error('No text generated');

    // Clean up markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error generating for ${profession}:`, error);
    return null;
  }
}

async function main() {
  console.log(`🔍 Finding user: ${TARGET_EMAIL}`);
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', TARGET_EMAIL));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.error('❌ User not found! Please sign up with this email first.');
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.data().uid || userDoc.id;
  console.log(`✅ Found user ID: ${userId}`);

  console.log(`🚀 Starting generation for ${PROFESSIONS.length} resumes...`);

  for (const profession of PROFESSIONS) {
    console.log(`\n📝 Generating: ${profession}...`);
    const resumeData = await generateResumeContent(profession);

    if (resumeData) {
      // Add required metadata
      const fullResume = {
        ...resumeData,
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        versionId: crypto.randomUUID(),
        slug: `${profession.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        published: true,
        templateId: "modern", // Default template
        generatedText: {
            draft: "",
            polished: "",
            lastGeneratedAt: new Date().toISOString()
        }
      };

      try {
        const docRef = await addDoc(collection(db, 'resumes'), fullResume);
        console.log(`✅ Saved resume: ${docRef.id}`);
      } catch (err) {
        console.error(`❌ Failed to save resume:`, err);
      }
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✨ Done!');
  process.exit(0);
}

main();
