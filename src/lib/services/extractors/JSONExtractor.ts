import {
  ResumeDataRequirements,
  ExperienceEntry,
  EducationEntry,
} from "../conversationManager";
import { IExtractor } from "./IExtractor";

interface ExtractedJSONData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[];
  isComplete?: boolean;
}

export class JSONExtractor implements IExtractor {
  extract(
    text: string
  ): Partial<ResumeDataRequirements> & { isComplete?: boolean } {
    const data: Partial<ResumeDataRequirements> & { isComplete?: boolean } = {};

    try {
      // 1. Look for JSON code blocks
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = text.match(jsonBlockRegex);

      if (jsonMatch && jsonMatch[1]) {
        const parsed = JSON.parse(jsonMatch[1].trim()) as ExtractedJSONData;
        Object.assign(data, parsed);
        return data;
      }

      // 2. Look for RESUME_DATA marker
      const dataMarkerRegex = /RESUME_DATA:\s*({[\s\S]*?})/;
      const dataMatch = text.match(dataMarkerRegex);

      if (dataMatch && dataMatch[1]) {
        const parsed = JSON.parse(dataMatch[1].trim()) as ExtractedJSONData;
        Object.assign(data, parsed);
        return data;
      }

      // 3. Look for any JSON object (risky but useful fallback)
      const jsonObjectRegex = /{[\s\S]*?}/;
      const objectMatch = text.match(jsonObjectRegex);

      if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]) as ExtractedJSONData;
        // Validate it looks like resume data to avoid false positives
        if (parsed.name || parsed.email || parsed.experience) {
          Object.assign(data, parsed);
          return data;
        }
      }
    } catch {
      // Ignore parsing errors
    }

    return data;
  }
}
