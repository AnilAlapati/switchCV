/* eslint-disable max-lines */
const admin = require('firebase-admin');

// Initialize Firebase Admin with dev project
admin.initializeApp({
  projectId: 'switchcv-dev'
});

const db = admin.firestore();

// 10 different tech resume styles
const TECH_RESUMES = [
  {
    title: "Senior Full Stack Engineer",
    summary: "Experienced full stack engineer with 8+ years building scalable web applications using React, Node.js, and cloud technologies.",
    skills: [
      { name: "React", level: "Expert", visibility: "public" },
      { name: "Node.js", level: "Expert", visibility: "public" },
      { name: "TypeScript", level: "Expert", visibility: "public" },
      { name: "PostgreSQL", level: "Advanced", visibility: "public" },
      { name: "AWS", level: "Advanced", visibility: "public" },
      { name: "Docker", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "Tech Startup Inc",
        role: "Senior Engineer",
        startDate: "2021-06",
        endDate: "present",
        description: "Led development of microservices architecture handling 1M+ daily requests. Mentored team of 5 engineers.",
        visibility: "public"
      },
      {
        company: "Enterprise Corp",
        role: "Full Stack Developer",
        startDate: "2018-01",
        endDate: "2021-05",
        description: "Developed internal tools and customer-facing features. Reduced load time by 40%.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "State University",
        degree: "BS Computer Science",
        startDate: "2014-09",
        endDate: "2018-05",
        description: "Major in Computer Science, GPA 3.8",
        visibility: "public"
      }
    ]
  },
  {
    title: "DevOps Engineer",
    summary: "DevOps specialist with 7+ years experience in cloud infrastructure, CI/CD pipelines, and Kubernetes orchestration.",
    skills: [
      { name: "Kubernetes", level: "Expert", visibility: "public" },
      { name: "Docker", level: "Expert", visibility: "public" },
      { name: "AWS", level: "Expert", visibility: "public" },
      { name: "Terraform", level: "Advanced", visibility: "public" },
      { name: "Jenkins", level: "Advanced", visibility: "public" },
      { name: "Python", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "Cloud Systems Co",
        role: "Senior DevOps Engineer",
        startDate: "2020-03",
        endDate: "present",
        description: "Managed Kubernetes clusters with 200+ nodes. Implemented GitOps workflow reducing deployment time by 60%.",
        visibility: "public"
      },
      {
        company: "Digital Services Ltd",
        role: "DevOps Engineer",
        startDate: "2017-02",
        endDate: "2020-02",
        description: "Designed and maintained CI/CD pipelines for 20+ microservices.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Community College",
        degree: "Associate in Information Technology",
        startDate: "2015-08",
        endDate: "2017-05",
        description: "Focus on systems administration and networking",
        visibility: "public"
      }
    ]
  },
  {
    title: "Machine Learning Engineer",
    summary: "ML engineer with 6+ years building and deploying machine learning models for production systems.",
    skills: [
      { name: "Python", level: "Expert", visibility: "public" },
      { name: "TensorFlow", level: "Expert", visibility: "public" },
      { name: "PyTorch", level: "Advanced", visibility: "public" },
      { name: "Scikit-learn", level: "Advanced", visibility: "public" },
      { name: "SQL", level: "Advanced", visibility: "public" },
      { name: "GCP", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "AI Innovations",
        role: "Senior ML Engineer",
        startDate: "2021-01",
        endDate: "present",
        description: "Developed recommendation engine improving user engagement by 35%. Led model training infrastructure.",
        visibility: "public"
      },
      {
        company: "Data Analytics Inc",
        role: "ML Engineer",
        startDate: "2018-06",
        endDate: "2020-12",
        description: "Built predictive models for customer churn and fraud detection.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Tech University",
        degree: "MS Machine Learning",
        startDate: "2016-08",
        endDate: "2018-05",
        description: "Specialization in deep learning and computer vision",
        visibility: "public"
      }
    ]
  },
  {
    title: "Frontend Engineer",
    summary: "Frontend specialist with 7+ years creating beautiful, performant user interfaces using modern web technologies.",
    skills: [
      { name: "React", level: "Expert", visibility: "public" },
      { name: "TypeScript", level: "Expert", visibility: "public" },
      { name: "CSS/SCSS", level: "Expert", visibility: "public" },
      { name: "Next.js", level: "Advanced", visibility: "public" },
      { name: "Figma", level: "Advanced", visibility: "public" },
      { name: "Accessibility (A11y)", level: "Advanced", visibility: "public" }
    ],
    experience: [
      {
        company: "Design First Company",
        role: "Senior Frontend Engineer",
        startDate: "2020-08",
        endDate: "present",
        description: "Led frontend architecture for redesign improving performance by 50%. Mentored 4 junior engineers.",
        visibility: "public"
      },
      {
        company: "Web Solutions",
        role: "Frontend Developer",
        startDate: "2017-01",
        endDate: "2020-07",
        description: "Built responsive interfaces for SaaS platform serving 100K+ users.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Bootcamp Academy",
        degree: "Full Stack Development Certificate",
        startDate: "2016-06",
        endDate: "2016-12",
        description: "Intensive 6-month full stack development program",
        visibility: "public"
      }
    ]
  },
  {
    title: "Backend Engineer",
    summary: "Backend specialist with 8+ years building robust APIs, databases, and server-side systems.",
    skills: [
      { name: "Go", level: "Expert", visibility: "public" },
      { name: "Java", level: "Expert", visibility: "public" },
      { name: "SQL", level: "Expert", visibility: "public" },
      { name: "PostgreSQL", level: "Advanced", visibility: "public" },
      { name: "Redis", level: "Advanced", visibility: "public" },
      { name: "gRPC", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "High Scale Systems",
        role: "Senior Backend Engineer",
        startDate: "2019-04",
        endDate: "present",
        description: "Architected payment processing system handling $50M+ annually. Reduced latency by 70%.",
        visibility: "public"
      },
      {
        company: "API Services Ltd",
        role: "Backend Developer",
        startDate: "2015-07",
        endDate: "2019-03",
        description: "Developed REST and GraphQL APIs serving millions of requests daily.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Engineering College",
        degree: "BS Software Engineering",
        startDate: "2011-08",
        endDate: "2015-05",
        description: "GPA 3.7, Dean's List all semesters",
        visibility: "public"
      }
    ]
  },
  {
    title: "Security Engineer",
    summary: "Security engineer with 9+ years experience securing applications, infrastructure, and cloud environments.",
    skills: [
      { name: "Cloud Security", level: "Expert", visibility: "public" },
      { name: "Penetration Testing", level: "Expert", visibility: "public" },
      { name: "OWASP", level: "Expert", visibility: "public" },
      { name: "AWS Security", level: "Advanced", visibility: "public" },
      { name: "SSL/TLS", level: "Advanced", visibility: "public" },
      { name: "Python", level: "Advanced", visibility: "public" }
    ],
    experience: [
      {
        company: "CyberDefense Corp",
        role: "Senior Security Engineer",
        startDate: "2020-02",
        endDate: "present",
        description: "Led security architecture review for 15+ enterprise clients. Discovered 200+ vulnerabilities.",
        visibility: "public"
      },
      {
        company: "Security Solutions",
        role: "Security Engineer",
        startDate: "2016-09",
        endDate: "2020-01",
        description: "Conducted security audits and implemented compliance frameworks (SOC2, ISO27001).",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Cybersecurity Institute",
        degree: "Certificate in Information Security",
        startDate: "2014-01",
        endDate: "2015-12",
        description: "CISSP and CEH certified",
        visibility: "public"
      }
    ]
  },
  {
    title: "Data Engineer",
    summary: "Data engineer with 7+ years building data pipelines, data warehouses, and analytics platforms.",
    skills: [
      { name: "Apache Spark", level: "Expert", visibility: "public" },
      { name: "Python", level: "Expert", visibility: "public" },
      { name: "SQL", level: "Expert", visibility: "public" },
      { name: "Airflow", level: "Advanced", visibility: "public" },
      { name: "BigQuery", level: "Advanced", visibility: "public" },
      { name: "Kafka", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "Data Platform Co",
        role: "Senior Data Engineer",
        startDate: "2021-05",
        endDate: "present",
        description: "Built data platform processing 10TB+ daily. Reduced query time by 80%.",
        visibility: "public"
      },
      {
        company: "Analytics Startup",
        role: "Data Engineer",
        startDate: "2017-11",
        endDate: "2021-04",
        description: "Developed ETL pipelines for real-time data ingestion from 50+ sources.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "University",
        degree: "MS Data Science",
        startDate: "2015-08",
        endDate: "2017-05",
        description: "Focus on big data technologies",
        visibility: "public"
      }
    ]
  },
  {
    title: "QA Automation Engineer",
    summary: "QA specialist with 6+ years designing and implementing automated testing frameworks.",
    skills: [
      { name: "Selenium", level: "Expert", visibility: "public" },
      { name: "Python", level: "Expert", visibility: "public" },
      { name: "TestNG", level: "Advanced", visibility: "public" },
      { name: "API Testing", level: "Advanced", visibility: "public" },
      { name: "CI/CD", level: "Advanced", visibility: "public" },
      { name: "Cypress", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "Quality First Tech",
        role: "QA Automation Lead",
        startDate: "2020-09",
        endDate: "present",
        description: "Built test automation framework covering 500+ test cases. Mentored QA team.",
        visibility: "public"
      },
      {
        company: "Software Testing Co",
        role: "QA Engineer",
        startDate: "2017-03",
        endDate: "2020-08",
        description: "Created end-to-end test automation for web and mobile applications.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Technical Institute",
        degree: "Diploma in IT",
        startDate: "2015-06",
        endDate: "2017-06",
        description: "Software testing specialization",
        visibility: "public"
      }
    ]
  },
  {
    title: "Mobile Engineer",
    summary: "Mobile developer with 6+ years building iOS and Android apps using modern frameworks.",
    skills: [
      { name: "React Native", level: "Expert", visibility: "public" },
      { name: "Swift", level: "Advanced", visibility: "public" },
      { name: "Kotlin", level: "Advanced", visibility: "public" },
      { name: "Firebase", level: "Advanced", visibility: "public" },
      { name: "REST APIs", level: "Advanced", visibility: "public" },
      { name: "App Store", level: "Intermediate", visibility: "public" }
    ],
    experience: [
      {
        company: "Mobile First Apps",
        role: "Senior Mobile Engineer",
        startDate: "2020-01",
        endDate: "present",
        description: "Led development of flagship app with 500K+ downloads. 4.8 star rating.",
        visibility: "public"
      },
      {
        company: "App Development Studio",
        role: "Mobile Developer",
        startDate: "2016-08",
        endDate: "2019-12",
        description: "Built and shipped 10+ mobile applications across iOS and Android.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Software Academy",
        degree: "Mobile Development Bootcamp",
        startDate: "2016-01",
        endDate: "2016-07",
        description: "Intensive iOS and Android development program",
        visibility: "public"
      }
    ]
  },
  {
    title: "Solutions Architect",
    summary: "Solutions architect with 10+ years designing and implementing enterprise software solutions.",
    skills: [
      { name: "System Design", level: "Expert", visibility: "public" },
      { name: "AWS", level: "Expert", visibility: "public" },
      { name: "Microservices", level: "Expert", visibility: "public" },
      { name: "Cloud Architecture", level: "Advanced", visibility: "public" },
      { name: "Enterprise Integration", level: "Advanced", visibility: "public" },
      { name: "Java", level: "Advanced", visibility: "public" }
    ],
    experience: [
      {
        company: "Enterprise Solutions",
        role: "Senior Solutions Architect",
        startDate: "2019-06",
        endDate: "present",
        description: "Designed solutions for 20+ Fortune 500 clients. Average project value $2M+.",
        visibility: "public"
      },
      {
        company: "Consulting Group",
        role: "Solutions Architect",
        startDate: "2014-03",
        endDate: "2019-05",
        description: "Architected enterprise-scale systems supporting millions of users.",
        visibility: "public"
      }
    ],
    education: [
      {
        institution: "Top University",
        degree: "BS Computer Science",
        startDate: "2006-08",
        endDate: "2010-05",
        description: "Minor in Business Administration",
        visibility: "public"
      }
    ]
  }
];

async function seedResumes() {
  try {
    console.log('📋 Getting registered users...\n');

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, email: doc.data().email });
    });

    console.log(`✅ Found ${users.length} users\n`);
    console.log('🌱 Seeding 10 tech resumes...\n');

    let resumeCount = 0;
    let userIndex = 0;

    for (const resumeTemplate of TECH_RESUMES) {
      const user = users[userIndex % users.length];
      
      const resume = {
        ...resumeTemplate,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        isBeingEdited: false,
        embedding: [], // Empty for now, would be populated by AI service
        contact: {
          email: { value: user.email, visibility: "public" },
          phone: { value: "+1-555-0" + String(100 + resumeCount).padStart(3, '0'), visibility: "public" }
        },
        projects: [
          {
            name: "Open Source Contribution",
            description: "Active contributor to several popular open source projects",
            visibility: "public"
          }
        ]
      };

      await db.collection('resumes').add(resume);
      console.log(`✅ [${resumeCount + 1}/10] Seeded "${resumeTemplate.title}" for user: ${user.email}`);
      
      resumeCount++;
      userIndex++;
    }

    console.log(`\n✨ Successfully seeded ${resumeCount} tech resumes!`);
    
  } catch (error) {
    console.error('❌ Error seeding resumes:', error);
  } finally {
    admin.app().delete();
  }
}

seedResumes();
