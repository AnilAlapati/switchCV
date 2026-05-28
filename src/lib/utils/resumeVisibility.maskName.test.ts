import { maskName } from "./resumeVisibility";

describe("resumeVisibility - maskName 1000 variations test suite", () => {
  it("should handle empty or falsy inputs gracefully", () => {
    expect(maskName("")).toBe("");
    expect(maskName(null as any)).toBe("");
    expect(maskName(undefined as any)).toBe("");
    expect(maskName("   ")).toBe("");
  });

  it("should preserve single names without adding initials", () => {
    expect(maskName("Anil")).toBe("Anil");
    expect(maskName("  Anil  ")).toBe("Anil");
    expect(maskName("X")).toBe("X");
  });

  it("should mask two-part names correctly", () => {
    expect(maskName("Anil Alapati")).toBe("Anil A.");
    expect(maskName("John Doe")).toBe("John D.");
    expect(maskName("jean-luc picard")).toBe("jean-luc P.");
  });

  it("should mask multi-part names correctly", () => {
    expect(maskName("Anil Alapati Kumar Naidu")).toBe("Anil A.");
    expect(maskName("First Middle Last Suffix")).toBe("First M.");
    expect(maskName("A B C D E F G")).toBe("A B.");
  });

  it("should handle excessive whitespace cleanly", () => {
    expect(maskName("  Anil     Alapati   Kumar  ")).toBe("Anil A.");
  });

  it("should run 1000 randomized variations and assert expected masking pattern", () => {
    const firstNames = ["Anil", "John", "Jane", "Dr. Bob", "Prof. Alice", "Kumar", "Siri", "Raj", "X-AE-A-XII", "María"];
    const secondNames = ["Alapati", "Doe", "Smith", "naidu", "karan", "Choudhury", "O'Connor", "van der Berg", "A."];
    const middleNames = ["Kumar", "Singh", "Prasad", "L.", "Elizabeth", "Marie", ""];
    const suffixes = ["Jr.", "III", "PhD", "Naidu", ""];

    let count = 0;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        for (let k = 0; k < 5; k++) {
          for (let l = 0; l < 2; l++) {
            const first = firstNames[i % firstNames.length];
            const second = secondNames[j % secondNames.length];
            const middle = middleNames[k % middleNames.length];
            const suffix = suffixes[l % suffixes.length];

            // Build fullName with varied spacing
            const components = [first, second, middle, suffix].filter(Boolean);
            const fullName = components.join("   "); // extra spaces to test robustness

            const masked = maskName(fullName);

            // The expected output should be first component + first char of second component capitalized + "."
            // Since some first components might contain spaces (like "Dr. Bob" or "Prof. Alice"),
            // we split the components to see how maskName will behave.
            const parts = fullName.trim().split(/\s+/);
            const expectedFirst = parts[0];
            const expectedSecond = parts[1];
            const expectedInitial = expectedSecond.charAt(0).toUpperCase();
            const expectedMasked = `${expectedFirst} ${expectedInitial}.`;

            expect(masked).toBe(expectedMasked);
            count++;
          }
        }
      }
    }

    expect(count).toBeGreaterThanOrEqual(1000);
  });
});
