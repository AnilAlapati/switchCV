
import { ResumeDataExtractor } from "@/lib/services/resumeDataExtractor";

describe("ResumeDataExtractor Remaining Gaps", () => {
    // 1. Name Capitalization
    it("should handle mixed case names correctly (Re-verification)", () => {
        const text = "my name is john doe";
        const result = ResumeDataExtractor.extract(text);
        expect(result.data.name).toBe("John Doe");
    });

    // 2. International Location
    it("should handle non-US locations (Re-verification)", () => {
        const text = "I live in Berlin, Germany";
        const result = ResumeDataExtractor.extract(text);
        expect(result.data.location).toBe("Berlin, Germany");
    });

    // 3. Skills Keywords
    it("should extract modern framework skills (Re-verification)", () => {
        const text = "I use Svelte, Vue, and TailwindCSS";
        const result = ResumeDataExtractor.extract(text);
        expect(result.data.skills).toContain("Svelte");
        expect(result.data.skills).toContain("Vue");
        expect(result.data.skills).toContain("TailwindCSS");
    });

    // 4. Experience Patterns (New Gap)
    it("should extract experience from 'Professional Experience' sections", () => {
        const text = `
    Professional Experience
    Senior Developer
    TechCorp
    2020 - Present
    `;
        const result = ResumeDataExtractor.extract(text);
        expect(result.data.experience).toBeDefined();
        expect(result.data.experience?.[0].company).toBe("TechCorp");
        expect(result.data.experience?.[0].title).toBe("Senior Developer");
    });

    it("should extract experience from bullet points", () => {
        const text = "- Software Engineer at StartupInc";
        const result = ResumeDataExtractor.extract(text);

        expect(result.data.experience).toBeDefined();
        expect(result.data.experience?.[0].company).toBe("StartupInc");
        expect(result.data.experience?.[0].title).toBe("Software Engineer");
    });

    // 5. International Phone (New Gap)
    it("should extraction international phone numbers", () => {
        const text = "My number is +44 7911 123456";
        const result = ResumeDataExtractor.extract(text);
        expect(result.data.phone).toBe("+44 7911 123456");

        const text2 = "Call me at 09876 543210";
        const result2 = ResumeDataExtractor.extract(text2);
        expect(result2.data.phone).toBeDefined();
    });
});
