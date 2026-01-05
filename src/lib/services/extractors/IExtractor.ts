import { ResumeDataRequirements } from "../conversationManager";

export interface IExtractor {
    extract(
        text: string,
        context?: "education" | "experience" | "skills" | "contact" | null
    ): Partial<ResumeDataRequirements>;
}
