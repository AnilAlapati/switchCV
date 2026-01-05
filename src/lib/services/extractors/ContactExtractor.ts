import { ResumeDataRequirements } from "../../conversationManager";
import { IExtractor } from "./IExtractor";

export class ContactExtractor implements IExtractor {
    extract(text: string): Partial<ResumeDataRequirements> {
        const data: Partial<ResumeDataRequirements> = {};
        const trimmedText = text.trim();

        // 1. Extract Name
        const commonWordsToExclude = "and|with|but|starting|going|looking|working|here|just|not|very|really";
        const namePatterns = [
            new RegExp(
                `(?:[Mm]y name is|[Ii]'m|[Ii] am|[Cc]all me)\\s+(?!(?:${commonWordsToExclude})\\b)([a-zA-Z]+(?:\\s+(?!${commonWordsToExclude}\\b)[a-zA-Z]+|[a-zA-Z]\\.?){0,3})(?=\\s|$|[.,])`,
                "i"
            ),
            /[Nn]ame:\s*([a-zA-Z]+(?:\s+(?!and\b|with\b|but\b)[a-zA-Z]+|[a-zA-Z]\.?){0,3})(?=\s|$|[.,])/i,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$/,
        ];

        for (const pattern of namePatterns) {
            const match = trimmedText.match(pattern);
            if (match && match[1]) {
                data.name = this.toTitleCase(match[1].trim());
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
        const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
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

        // 5. Extract Summary
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

    private toTitleCase(str: string) {
        return str.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
}
