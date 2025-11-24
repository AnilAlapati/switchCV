import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";
import { ENABLE_SEEDING_AND_DEBUG_LISTS } from "@/lib/config";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function POST(req: NextRequest) {
  if (!ENABLE_SEEDING_AND_DEBUG_LISTS) {
    return handleApiError(
      null,
      "Seeding functionality is currently disabled",
      403
    );
  }

  try {
    const { profession } = await req.json();

    if (!profession) {
      return handleApiError(null, "Profession is required", 400);
    }

    const prompt = `Generate a realistic, professional resume for a ${profession} with 5-8 years of experience. 
    
    IMPORTANT: Vary the structure based on the profession.
    - For Creative roles (Designer, Actor, Chef), emphasize "Projects" or "Portfolio" or "Credits".
    - For Technical roles (Engineer, Analyst), emphasize "Skills" and "Experience".
    - For Executive roles, emphasize "Summary" and "Leadership".

    Return ONLY a valid JSON object matching this structure (no markdown, no comments):
    {
      "title": "${profession}",
      "templateId": "standard-v1", // CHANGE THIS based on role: "modern-creative-v1" for creative, "executive-v1" for leadership, "standard-v1" for others
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

    const result = await generateText(prompt, 2000, 0.7);

    // Clean up markdown if present
    const cleanText = result.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const resumeData = JSON.parse(cleanText);

    return NextResponse.json(resumeData);
  } catch (error) {
    return handleApiError(error, "Failed to generate resume", 500);
  }
}
