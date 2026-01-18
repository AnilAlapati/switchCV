"use client";

import React from "react";
import { TemplateRenderer } from "@/components/resume/TemplateRenderer";
import { DashboardResume } from "@/types";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import Link from "next/link";

// --- Mock Data for "Anil A." - Indian Senior Software Engineer ---

const ANIL_A_RESUME: DashboardResume = {
    id: "demo-anil-a",
    versionId: "v1",
    title: "Senior Software Engineer / Team Lead",
    slug: "anil-a",
    lastUpdatedAt: new Date().toISOString(),
    isPublic: true,
    visibility: "public",

    // Personal Info
    personalInfo: {
        name: "Anil A.",
        title: "Senior Software Engineer / Team Lead",
        email: "anil.a@example.com",
        phone: "+91 90000 00000",
        location: "Hyderabad, India",
        linkedin: "linkedin.com/in/anil-a-dev",
        github: "github.com/anil-a-dev"
    },

    contact: {
        email: { value: "anil.a@example.com", visibility: "public" },
        phone: { value: "+91 90000 00000", visibility: "public" }
    },

    // Summary
    summary: "Accomplished Senior Software Engineer and Team Lead targeting a Staff-level product development role. Proven leader in designing and delivering large-scale automation and reliability platforms. Drove a 40% reduction in manual operational work by building a foundational, event-driven system, shifting the organization from reactive firefighting to proactive, data-driven development.",

    // Experience
    experience: [
        {
            id: "exp-1",
            company: "Company XYZ",
            role: "Senior Software Engineer / Team Lead",
            startDate: "2021-01",
            endDate: "Present",
            description: "Led the end-to-end design and delivery of a reliability and automation platform to reduce operational friction and improve decision-making.\n• Architected a modular, event-driven system with standardized APIs and robust observability into system health and usage patterns.\n• Mentored a team of 5 engineers and drove sprint planning and technical direction.",
            visibility: "public"
        },
        {
            id: "exp-2",
            company: "Tech Solutions Pvt. Ltd.",
            role: "Software Engineer II",
            startDate: "2018-06",
            endDate: "2020-12",
            description: "Developed and maintained microservices for a high-traffic e-commerce platform serving 2M+ users.\n• Reduced API latency by 50% through caching strategies and query optimization.\n• Implemented CI/CD pipelines reducing deployment time from hours to minutes.",
            visibility: "public"
        },
        {
            id: "exp-3",
            company: "StartupHub India",
            role: "Full Stack Developer",
            startDate: "2016-07",
            endDate: "2018-05",
            description: "Built MVPs for multiple fintech products using React and Node.js.\n• Scaled user base from 0 to 50,000 in the first year through rapid feature iteration.\n• Integrated multiple payment gateways including Razorpay and PayU.",
            visibility: "public"
        }
    ],

    // Education
    education: [
        {
            id: "edu-1",
            institution: "Jawaharlal Nehru Technological University (JNTU)",
            degree: "Bachelor of Technology (B.Tech)",
            startDate: "2012",
            endDate: "2016",
            visibility: "public"
        }
    ],

    // Skills
    skills: [
        { id: "s1", name: "System Design", level: "Expert", visibility: "public" },
        { id: "s2", name: "Automation", level: "Expert", visibility: "public" },
        { id: "s3", name: "API Development", level: "Expert", visibility: "public" },
        { id: "s4", name: "Observability", level: "Advanced", visibility: "public" },
        { id: "s5", name: "Team Leadership", level: "Advanced", visibility: "public" },
        { id: "s6", name: "React & Next.js", level: "Expert", visibility: "public" },
        { id: "s7", name: "Node.js & TypeScript", level: "Expert", visibility: "public" },
        { id: "s8", name: "AWS & GCP", level: "Advanced", visibility: "public" }
    ],

    // Projects
    projects: [
        {
            id: "p1",
            name: "Reliability Automation Platform",
            description: "Designed and delivered an enterprise-grade automation platform handling 500K+ events daily. Reduced incident response time by 60%.",
            visibility: "public"
        },
        {
            id: "p2",
            name: "Event-Driven Observability System",
            description: "Built a real-time observability stack with custom dashboards and alerting. Improved system visibility across 50+ microservices.",
            visibility: "public"
        }
    ],

    generatedText: {
        draft: "",
        polished: "",
        lastGeneratedAt: new Date().toISOString()
    }
};


export default function DemoResumePage(): React.ReactElement {
    // Use 'masonry-v1' for the creative Bento-box layout
    const template = RESUME_TEMPLATES.find(t => t.id === "masonry-v1") || RESUME_TEMPLATES[0];

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Floating Demo Notice - Sleek Glass Style */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-black/80 backdrop-blur-xl text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-white/90">
                        <span className="font-medium text-white">Demo Profile</span>
                        <span className="mx-2 text-white/30">•</span>
                        Real resumes require recruiter permission
                    </span>
                    <Link
                        href="/dashboard"
                        className="ml-2 px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-white/90 transition-all hover:scale-105"
                    >
                        Create Yours
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div>
                <TemplateRenderer
                    template={template}
                    data={ANIL_A_RESUME}
                    isAuthenticated={false}
                    onRequestAccess={() => { }}
                />
            </div>
        </div>
    );
}
