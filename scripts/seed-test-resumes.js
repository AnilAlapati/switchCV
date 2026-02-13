/**
 * Seed script for creating 100 test resumes with dummy embeddings
 * 
 * Purpose: Populate dev Firestore with diverse test data for JD search testing
 * Cost: ZERO AI costs - uses pre-computed dummy embeddings
 * 
 * Usage: node scripts/seed-test-resumes.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with dev project
admin.initializeApp({
    projectId: 'switchcv-dev'
});

const db = admin.firestore();

// Generate deterministic dummy embedding (768 dimensions for Gemini embeddings)
function generateDummyEmbedding(seed) {
    const embedding = [];
    let hash = seed;
    for (let i = 0; i < 768; i++) {
        // Simple hash-based pseudo-random number
        hash = (hash * 1103515245 + 12345) % 2147483648;
        // Normalize to [-1, 1] range
        embedding.push((hash / 1073741824) - 1);
    }
    return embedding;
}

// 20 different role templates to create 100 variations
const ROLE_TEMPLATES = [
    { role: "Full Stack Engineer", skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"], experience: 5 },
    { role: "Senior Python Developer", skills: ["Python", "Django", "FastAPI", "PostgreSQL", "Docker"], experience: 7 },
    { role: "DevOps Engineer", skills: ["Kubernetes", "Docker", "AWS", "Terraform", "CI/CD"], experience: 6 },
    { role: "Machine Learning Engineer", skills: ["Python", "TensorFlow", "PyTorch", "ML", "AWS"], experience: 5 },
    { role: "Frontend Developer", skills: ["React", "TypeScript", "CSS", "Next.js", "Tailwind"], experience: 4 },
    { role: "Backend Engineer", skills: ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka"], experience: 6 },
    { role: "Data Engineer", skills: ["Python", "Spark", "SQL", "Airflow", "BigQuery"], experience: 5 },
    { role: "Mobile Developer", skills: ["React Native", "Swift", "Kotlin", "Firebase", "REST APIs"], experience: 4 },
    { role: "Cloud Architect", skills: ["AWS", "GCP", "Azure", "Terraform", "Kubernetes"], experience: 8 },
    { role: "Security Engineer", skills: ["Security", "AWS", "Python", "Penetration Testing", "OWASP"], experience: 6 },
    { role: "Site Reliability Engineer", skills: ["Linux", "Kubernetes", "Prometheus", "Grafana", "Python"], experience: 5 },
    { role: "QA Automation Engineer", skills: ["Selenium", "Python", "Cypress", "Jest", "API Testing"], experience: 4 },
    { role: "Blockchain Developer", skills: ["Solidity", "Ethereum", "Web3.js", "TypeScript", "Node.js"], experience: 3 },
    { role: "iOS Developer", skills: ["Swift", "SwiftUI", "Objective-C", "Xcode", "CoreData"], experience: 5 },
    { role: "Android Developer", skills: ["Kotlin", "Java", "Android SDK", "Jetpack Compose", "Firebase"], experience: 5 },
    { role: "Ruby Developer", skills: ["Ruby", "Rails", "PostgreSQL", "Redis", "Sidekiq"], experience: 6 },
    { role: "Go Developer", skills: ["Go", "gRPC", "PostgreSQL", "Docker", "Kubernetes"], experience: 4 },
    { role: "Rust Developer", skills: ["Rust", "WebAssembly", "Systems Programming", "Linux", "C++"], experience: 4 },
    { role: "PHP Developer", skills: ["PHP", "Laravel", "MySQL", "Redis", "Vue.js"], experience: 5 },
    { role: "Database Administrator", skills: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQL"], experience: 7 }
];

// Location options
const LOCATIONS = [
    "San Francisco, CA",
    "New York, NY",
    "Seattle, WA",
    "Austin, TX",
    "Denver, CO",
    "Boston, MA",
    "Chicago, IL",
    "Los Angeles, CA",
    "Atlanta, GA",
    "Remote"
];

// Name patterns for diversity
const FIRST_NAMES = ["Alex", "Jordan", "Casey", "Taylor", "Morgan", "Riley", "Jamie", "Drew", "Quinn", "Avery"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

// Companies for experience
const COMPANIES = [
    "Tech Innovations Inc", "Cloud Systems Corp", "Digital Solutions LLC",
    "Data Analytics Co", "Software Dynamics", "Web Services Inc",
    "Mobile First Apps", "Enterprise Systems", "Startup Hub", "Dev Corp"
];

// Experience levels
const LEVELS = ["Junior", "Mid-Level", "Senior", "Lead", "Principal"];

function generateResume(index) {
    const template = ROLE_TEMPLATES[index % ROLE_TEMPLATES.length];
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / 10) % LAST_NAMES.length];
    const location = LOCATIONS[index % LOCATIONS.length];
    const baseExperience = template.experience + (index % 5);
    const level = LEVELS[Math.min(Math.floor(baseExperience / 2), LEVELS.length - 1)];

    // Generate unique skills by mixing template skills with variations
    const allSkills = [...template.skills];
    if (index % 3 === 0) allSkills.push("Git");
    if (index % 4 === 0) allSkills.push("Agile");
    if (index % 5 === 0) allSkills.push("Jira");
    if (index % 6 === 0) allSkills.push("AWS");
    if (index % 7 === 0) allSkills.push("Linux");

    return {
        // Core fields
        title: `${level} ${template.role}`,
        summary: `Experienced ${template.role.toLowerCase()} with ${baseExperience}+ years of expertise in ${template.skills.slice(0, 3).join(", ")}. Based in ${location}.`,

        // Skills with search-friendly normalization
        skills: allSkills.map(s => ({ name: s, level: level === "Senior" ? "Expert" : "Advanced", visibility: "public" })),
        skillsNormalized: allSkills.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')),

        // Contact info
        contact: {
            name: { value: `${firstName} ${lastName}`, visibility: "public" },
            email: { value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@example.com`, visibility: "public" },
            phone: { value: `+1-555-${String(1000 + index).slice(-4)}`, visibility: "private" },
            location: { value: location, visibility: "public" }
        },

        // Experience
        experience: [
            {
                company: COMPANIES[index % COMPANIES.length],
                role: `${level} ${template.role}`,
                startDate: `${2024 - baseExperience}-01`,
                endDate: "present",
                description: `Leading ${template.skills[0]} development and mentoring team members.`,
                visibility: "public"
            },
            {
                company: COMPANIES[(index + 3) % COMPANIES.length],
                role: `${template.role}`,
                startDate: `${2024 - baseExperience - 3}-06`,
                endDate: `${2024 - baseExperience - 1}-12`,
                description: `Developed solutions using ${template.skills.slice(1, 3).join(" and ")}.`,
                visibility: "public"
            }
        ],

        // Education
        education: [
            {
                institution: index % 2 === 0 ? "State University" : "Tech Institute",
                degree: index % 3 === 0 ? "MS Computer Science" : "BS Computer Science",
                startDate: "2010-08",
                endDate: "2014-05",
                description: "Focus on software engineering",
                visibility: "public"
            }
        ],

        // Metadata for search
        published: true,
        isPublic: true,
        visibility: "public",
        templateId: "professional-clean",

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),

        // Dummy embedding - NO AI COST
        embedding: generateDummyEmbedding(index * 12345),

        // Projects
        projects: [
            {
                name: `${template.skills[0]} Project`,
                description: `Built a ${template.skills[0]}-based solution`,
                visibility: "public"
            }
        ]
    };
}

async function seedTestResumes() {
    const TOTAL_RESUMES = 100;
    const BATCH_SIZE = 20; // Firestore batch limit is 500, but we'll use smaller batches

    console.log('🌱 Seeding 100 test resumes with dummy embeddings...\n');
    console.log('💰 Cost: $0 (no AI API calls)\n');

    try {
        let created = 0;

        for (let batchStart = 0; batchStart < TOTAL_RESUMES; batchStart += BATCH_SIZE) {
            const batch = db.batch();
            const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_RESUMES);

            for (let i = batchStart; i < batchEnd; i++) {
                const resume = generateResume(i);
                // Use deterministic ID for easy cleanup
                const docId = `test-resume-${String(i).padStart(3, '0')}`;
                const docRef = db.collection('resumes').doc(docId);

                resume.userId = `test-user-${String(i % 20).padStart(3, '0')}`; // 20 different users

                batch.set(docRef, resume);
            }

            await batch.commit();
            created += (batchEnd - batchStart);
            console.log(`✅ Created resumes ${batchStart + 1} to ${batchEnd} (${created}/${TOTAL_RESUMES})`);
        }

        console.log(`\n✨ Successfully seeded ${TOTAL_RESUMES} test resumes!`);
        console.log('\nResume distribution:');
        console.log('  - 20 different role types');
        console.log('  - 10 different locations');
        console.log('  - 5 experience levels (Junior to Principal)');
        console.log('  - All have dummy embeddings for vector search');
        console.log('  - All set to published=true for search visibility');
        console.log('\n🧹 To clean up: node scripts/cleanup-test-resumes.js');

    } catch (error) {
        console.error('❌ Error seeding resumes:', error);
    } finally {
        admin.app().delete();
    }
}

seedTestResumes();
