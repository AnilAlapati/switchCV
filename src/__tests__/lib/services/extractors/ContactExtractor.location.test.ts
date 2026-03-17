import { ContactExtractor } from "@/lib/services/extractors/ContactExtractor";

describe("ContactExtractor — location false-positive regression", () => {
  const extractor = new ContactExtractor();

  it("should NOT extract location from 'Anil A, email@...' text", () => {
    const text =
      "Hey there , this is Anil A, anilalapati.66@gmail.com and I am looking for Applied AI or Gen AI roles mid to senior level";
    const result = extractor.extract(text);
    expect(result.location).toBeUndefined();
  });

  it("should NOT extract location from company mentions with commas", () => {
    const text =
      "started with IBM, and then Tek Systems and now working with JPMC as SWE3";
    const result = extractor.extract(text);
    expect(result.location).toBeUndefined();
  });

  it("should NOT extract location from 'Team Lead, Handled...'", () => {
    const text =
      "Team Lead, Handled multiple projects which saved good numbers";
    const result = extractor.extract(text);
    expect(result.location).toBeUndefined();
  });

  it("should extract location from 'based in San Francisco, CA'", () => {
    const text = "I am based in San Francisco, CA";
    const result = extractor.extract(text);
    expect(result.location).toBeDefined();
    expect(result.location).toContain("San Francisco");
  });

  it("should extract location from 'located in New York, NY'", () => {
    const text = "I am located in New York, NY";
    const result = extractor.extract(text);
    expect(result.location).toBeDefined();
    expect(result.location).toContain("New York");
  });

  it("should extract location from 'live in Chicago, IL'", () => {
    const text = "I live in Chicago, IL";
    const result = extractor.extract(text);
    expect(result.location).toBeDefined();
    expect(result.location).toContain("Chicago");
  });

  it("should extract location from labeled field 'Location: Austin, TX'", () => {
    const text = "Location: Austin, TX";
    const result = extractor.extract(text);
    expect(result.location).toBeDefined();
    expect(result.location).toContain("Austin");
  });

  it("should NOT extract location from AI assistant response about companies", () => {
    const text = "Got it: SWE3 at JPMC, plus experience at IBM and TEKsystems.";
    const result = extractor.extract(text);
    expect(result.location).toBeUndefined();
  });
});
