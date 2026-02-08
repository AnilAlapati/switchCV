import type { RankedCandidate } from "./types";

/**
 * Calculate overall match score
 */
export function calculateMatchScore(
    skillMatches: number,
    totalSkillsQueried: number,
    semanticScore: number,
): number {
    if (totalSkillsQueried === 0) return Math.round(semanticScore * 100);

    const skillScore = (skillMatches / totalSkillsQueried) * 100;
    // Weight skill matches slightly higher than semantic score for hybrid
    return Math.round(skillScore * 0.6 + semanticScore * 40);
}

/**
 * Generate human-readable match reason for skill searches
 */
export function generateMatchReason(
    matchedSkills: string[],
    queriedSkills: string[],
): string {
    if (queriedSkills.length === 0) return "Matched general query criteria";

    const count = matchedSkills.length;
    const total = queriedSkills.length;

    if (count === total) return "Perfect match for all required skills";
    if (count === 0) return "Matched other criteria but missing key skills";

    return `Matched ${count}/${total} skills: ${matchedSkills.slice(0, 3).join(", ")}${count > 3 ? "..." : ""}`;
}

/**
 * Generate match reason for semantic searches
 */
export function generateSemanticMatchReason(
    semanticScore: number,
    matchedSkills: string[],
): string {
    if (semanticScore > 0.85) return "Strong semantic match for your requirements";
    if (semanticScore > 0.75) return "Good match for query content and intent";

    if (matchedSkills.length > 0) {
        return `Potential match based on context and ${matchedSkills[0]} skills`;
    }

    return "Semantic match for query context";
}

/**
 * Re-rank candidates based on how well they match JD requirements
 */
export function rerankByJDMatch(
    candidates: RankedCandidate[],
    requiredSkills: string[],
    preferredSkills: string[],
): RankedCandidate[] {
    const reqSet = new Set(requiredSkills.map((s) => s.toLowerCase()));
    const prefSet = new Set(preferredSkills.map((s) => s.toLowerCase()));

    return candidates
        .map((candidate) => {
            const candidateSkills = new Set(
                candidate.skills.map((s) => s.toLowerCase()),
            );

            let reqMatches = 0;
            let prefMatches = 0;

            reqSet.forEach((skill) => {
                if (candidateSkillMatches(candidateSkills, skill)) reqMatches++;
            });

            prefSet.forEach((skill) => {
                if (candidateSkillMatches(candidateSkills, skill)) prefMatches++;
            });

            // Calculate a secondary score specifically for JD relevance
            const jdScore =
                (requiredSkills.length > 0
                    ? (reqMatches / requiredSkills.length) * 70
                    : 50) +
                (preferredSkills.length > 0
                    ? (prefMatches / preferredSkills.length) * 30
                    : 0);

            // Blend with the existing matchScore from initial search
            const finalScore = Math.round(candidate.matchScore * 0.4 + jdScore * 0.6);

            return {
                ...candidate,
                matchScore: finalScore,
                matchReason: generateJDMatchReason(
                    Array.from(reqSet).filter((s) =>
                        candidateSkillMatches(candidateSkills, s),
                    ),
                    requiredSkills.length,
                    Array.from(prefSet).filter((s) =>
                        candidateSkillMatches(candidateSkills, s),
                    ),
                    preferredSkills.length,
                ),
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Check if candidate has a skill (with fuzzy matching)
 */
export function candidateSkillMatches(
    candidateSkills: Set<string>,
    skill: string,
): boolean {
    const s = skill.toLowerCase();
    if (candidateSkills.has(s)) return true;

    // Partial match check for common skills
    for (const candSkill of candidateSkills) {
        if (candSkill.includes(s) || s.includes(candSkill)) {
            // Basic safeguard for very short strings
            if (s.length > 3 && candSkill.length > 3) return true;
        }
    }

    return false;
}

/**
 * Generate human-readable match reason for JD-based search
 */
export function generateJDMatchReason(
    matchedRequired: string[],
    totalRequired: number,
    matchedPreferred: string[],
    totalPreferred: number,
): string {
    if (totalRequired === 0) return "Semantic match for job criteria";

    const reqPart =
        matchedRequired.length === totalRequired
            ? "all required skills"
            : `${matchedRequired.length}/${totalRequired} required skills`;

    const prefPart =
        matchedPreferred.length > 0
            ? ` and ${matchedPreferred.length} preferred skills`
            : "";

    return `Matched ${reqPart}${prefPart}.`;
}
