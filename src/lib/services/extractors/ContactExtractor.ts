import { ResumeDataRequirements } from "../conversationManager";
import { IExtractor } from "./IExtractor";

export class ContactExtractor implements IExtractor {
  private static readonly ROLE_WORDS = new Set([
    "developer",
    "engineer",
    "manager",
    "founder",
    "intern",
    "consultant",
    "analyst",
    "designer",
    "architect",
    "scientist",
    "specialist",
    "lead",
    "director",
    "officer",
    "president",
    "coordinator",
    "administrator",
    "recruiter",
    "marketer",
    "product",
    "software",
    "fullstack",
    "frontend",
    "backend",
    "devops",
    "qa",
  ]);

  private static readonly SECTION_HEADINGS = new Set([
    "professional summary",
    "work experience",
    "work history",
    "professional experience",
    "employment history",
    "education",
    "academic background",
    "academic history",
    "skills",
    "technical skills",
    "core skills",
    "technologies",
    "projects",
    "project experience",
    "contact",
    "personal info",
    "personal information",
    "profile",
    "summary",
    "objective",
    "about",
    "certifications",
    "references",
    "publications",
    "awards",
    "interests",
    "hobbies",
    "languages",
    "volunteer experience",
  ]);

  extract(text: string): Partial<ResumeDataRequirements> {
    const data: Partial<ResumeDataRequirements> = {};
    const trimmedText = text.trim();

    // 1. Extract Name
    const commonWordsToExclude =
      "and|with|but|starting|going|looking|working|here|just|not|very|really";
    const locationExclusion = "based|located|living|from|moved|moving";
    const namePatterns = [
      // "My name is A Anil and my email is ..." or similar inline contact phrasing
      /(?:[Mm]y name is|[Ii]'m|[Ii] am|[Cc]all me)\s+([A-Za-z](?:[A-Za-z'-]*)(?:\s+[A-Za-z](?:[A-Za-z'-]*)){0,3})(?=\s+(?:and\b|email\b|my\b)|$|[.,])/,
      // "My name is ...", "I'm ...", "I am ...", "Call me ..."
      new RegExp(
        `(?:[Mm]y name is|[Ii]'m|[Ii] am|[Cc]all me)\\s+(?!(?:${commonWordsToExclude}|${locationExclusion})\\b)([a-zA-Z]+(?:\\s+(?!${commonWordsToExclude}|${locationExclusion}\\b)[a-zA-Z]+|[a-zA-Z]\\.?){0,3})(?=\\s|$|[.,])`,
        "i",
      ),
      // "Name: John Smith" labeled field
      /[Nn]ame:\s*([a-zA-Z]+(?:\s+(?!and\b|with\b|but\b)[a-zA-Z]+|[a-zA-Z]\.?){0,3})(?=\s|$|[.,])/i,
      // "Dr./Mr./Ms./Prof. FirstName LastName" with honorific prefix
      /^(?:Dr|Mr|Ms|Mrs|Prof|Ir)\.\s+([A-Z][a-zA-Z-]+(?:\s+[A-Z][a-zA-Z-]+){1,2})(?=\s|$|[.,|])/m,
      // "FirstName LastName | email@..." — pipe-separated contact line
      /^([A-Z][a-zA-Z-]+(?:\s+[A-Z][a-zA-Z-]+){1,2})\s*\|/m,
      // "FirstName LastName, email@..." — comma before email
      /^([A-Z][a-zA-Z-]+(?:\s+[A-Z][a-zA-Z-]+){1,2})\s*,\s*[A-Za-z0-9._%+-]+@/m,
      // Standalone name line: "First Last" or "First Middle Last" (proper case, no email/pipe)
      /^([A-Z][a-z-]+(?:\s+[A-Z][a-z-]+){1,2})$/m,
      /^[A-Z][a-z]+$/i,
      /^([a-z]+(?:\s+[a-z]+){1,2})$/i,
    ];

    for (const pattern of namePatterns) {
      const match = trimmedText.match(pattern);
      if (match && match[1]) {
        const candidate = this.sanitizeCandidateName(match[1]);
        if (this.looksLikeRolePhrase(candidate, trimmedText)) {
          continue;
        }

        data.name = this.toTitleCase(candidate);
        break;
      }
    }

    // 2. Extract Email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = trimmedText.match(emailRegex);
    if (emailMatch) {
      data.email = emailMatch[0];
    }

    // 3. Extract Phone
    const phoneRegex =
      /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const phoneMatch = trimmedText.match(phoneRegex);
    if (phoneMatch) {
      const digits = phoneMatch[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15) {
        data.phone = phoneMatch[0].trim();
      }
    }

    // 4. Extract Location
    const locationPatterns = [
      /(?:located in|based in|live in)\s+([a-zA-Z]+(?: [a-zA-Z]+)?(?:,?\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)?))/i,
      /location:\s*([a-zA-Z]+(?: [a-zA-Z]+)?(?:,?\s+[a-zA-Z]+(?:\s+[a-zA-Z]+)?))/i,
      /from\s+([a-zA-Z]+(?: [a-zA-Z]+)?,\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /([a-zA-Z]+(?: [a-zA-Z]+)?,\s*([a-zA-Z]{2,}))/i,
    ];

    for (const pattern of locationPatterns) {
      const match = trimmedText.match(pattern);
      if (match) {
        if (pattern.source.includes("([a-zA-Z]{2,}))")) {
          data.location = match[1].trim();
          break;
        } else if (match[1]) {
          data.location = match[1].trim();
          break;
        }
      }
    }

    // 5. Extract GitHub URL
    const githubRegex =
      /(?:github\.com\/|(?<![A-Za-z0-9._%+-])@)([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/i;
    const githubUrlRegex =
      /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\/)?/i;
    const githubUrlMatch = trimmedText.match(githubUrlRegex);
    if (githubUrlMatch) {
      data.github = githubUrlMatch[0].replace(/\/$/, ""); // Remove trailing slash
    } else {
      const githubMatch = trimmedText.match(githubRegex);
      if (githubMatch) {
        data.github = `https://github.com/${githubMatch[1]}`;
      }
    }

    // 6. Extract LinkedIn URL
    const linkedinUrlRegex =
      /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+(?:\/)?/i;
    const linkedinUrlMatch = trimmedText.match(linkedinUrlRegex);
    if (linkedinUrlMatch) {
      data.linkedin = linkedinUrlMatch[0].replace(/\/$/, "");
    }

    // 7. Extract X (Twitter) URL
    const twitterUrlRegex =
      /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+(?:\/)?/i;
    const twitterHandleRegex =
      /(?<![A-Za-z0-9._%+-])@([a-zA-Z0-9_]{1,15})\b/;
    const twitterUrlMatch = trimmedText.match(twitterUrlRegex);
    if (twitterUrlMatch) {
      data.twitter = twitterUrlMatch[0].replace(/\/$/, "");
    } else if (!data.github) {
      // Avoid confusing GitHub @username with Twitter
      const twitterHandleMatch = trimmedText.match(twitterHandleRegex);
      if (
        twitterHandleMatch &&
        twitterHandleMatch[1].toLowerCase() !== "gmail" &&
        twitterHandleMatch[1].toLowerCase() !== "email"
      ) {
        data.twitter = `https://x.com/${twitterHandleMatch[1]}`;
      }
    }

    // 8. Extract Summary
    const summaryPatterns = [
      /(?:summary|professional summary|objective|about me):\s*(.+)(?:\n|$)/i,
      /^Summary:\s*(.+)/m,
    ];

    for (const pattern of summaryPatterns) {
      const match = trimmedText.match(pattern);
      if (match && match[1]) {
        data.summary = match[1].trim();
        break;
      }
    }

    return data;
  }

  private sanitizeCandidateName(value: string): string {
    return value
      .trim()
      .replace(/\s+(?:and|email|mail|my)\b.*$/i, "")
      .replace(/\s{2,}/g, " ");
  }

  private toTitleCase(str: string) {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    );
  }

  private looksLikeRolePhrase(candidate: string, fullText: string): boolean {
    const normalized = candidate
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return true;
    const tokens = normalized.split(" ");
    const looksLikeInitialBasedName =
      tokens.length >= 2 &&
      tokens.length <= 4 &&
      tokens[0]?.length === 1 &&
      tokens.slice(1).every((token) => /^[a-z]+$/.test(token));

    if (!looksLikeInitialBasedName && /^(a|an|the)\b/.test(normalized)) {
      return true;
    }
    if (/^(currently|working|looking)\b/.test(normalized)) return true;

    // Reject well-known resume section headings
    if (ContactExtractor.SECTION_HEADINGS.has(normalized)) return true;

    const startsWithSelfIntro = /^(?:i['’]?m|i am)\b/i.test(fullText.trim());
    if (
      startsWithSelfIntro &&
      tokens.some((token) => ContactExtractor.ROLE_WORDS.has(token))
    ) {
      return true;
    }
    // Block location-context phrases like "based in Bangalore"
    if (
      /^based\b/i.test(normalized) ||
      /^located\b/i.test(normalized) ||
      /^living\b/i.test(normalized)
    ) {
      return true;
    }
    return false;
  }
}
