/**
 * Template Scoring Functions
 *
 * Scores templates based on content analysis to determine
 * the best fit for a resume.
 */

import type { ContentAnalysis, TemplateProfile, TemplateScore } from "./types";

/**
 * Score a template for a given content analysis
 */
export function scoreTemplate(
    template: TemplateProfile,
    analysis: ContentAnalysis
): TemplateScore {
    const scores = {
        contentFit: scoreContentFit(template, analysis),
        visualBalance: scoreVisualBalance(template, analysis),
        careerMatch: scoreCareerMatch(template, analysis),
        readability: scoreReadability(template, analysis),
    };

    // Weighted total (content fit and career match are most important)
    let totalScore =
        scores.contentFit * 0.3 +
        scores.visualBalance * 0.25 +
        scores.careerMatch * 0.3 +
        scores.readability * 0.15;

    // Tiebreaker: Masonry gets a boost when there are 3+ projects (portfolio showcase)
    if (template.id === "masonry-v1" && analysis.projectsCount >= 3) {
        totalScore += 5; // Small boost to break ties in favor of project showcase
    }

    // Confidence based on how well analysis matches template ideal
    const matchingFactors = [
        template.idealContentDensity.includes(analysis.contentDensity),
        template.idealSeniority.includes(analysis.seniorityLevel),
        template.idealRoleTypes.includes(analysis.roleType),
    ].filter(Boolean).length;

    const confidence: TemplateScore["confidence"] =
        matchingFactors >= 3 ? "high" : matchingFactors >= 2 ? "medium" : "low";

    const reasoning = generateReasoning(template, analysis, scores);

    return {
        templateId: template.id,
        scores,
        totalScore: Math.round(totalScore),
        confidence,
        reasoning,
    };
}

function scoreContentFit(
    template: TemplateProfile,
    analysis: ContentAnalysis
): number {
    let score = 50; // Base score

    // Content density match
    if (template.idealContentDensity.includes(analysis.contentDensity)) {
        score += 25;
    } else {
        // Penalize mismatches
        const densityOrder = [
            "minimal",
            "light",
            "moderate",
            "dense",
            "very-dense",
        ];
        const idealIndex = densityOrder.indexOf(template.idealContentDensity[0]);
        const actualIndex = densityOrder.indexOf(analysis.contentDensity);
        const diff = Math.abs(idealIndex - actualIndex);
        score -= diff * 10;
    }

    // Experience count fit
    if (
        analysis.experienceCount >= template.minExperiences &&
        analysis.experienceCount <= template.maxExperiences
    ) {
        score += 15;
    } else if (analysis.experienceCount > template.maxExperiences) {
        score -= 15; // Too many experiences for this template
    }

    // Skills count fit
    if (analysis.skillsCount >= template.minSkills) {
        score += 10;
    }

    // Project count fit (especially important for masonry)
    if (template.id === "masonry-v1") {
        if (analysis.projectsCount >= 2) score += 15;
        else score -= 20;
    }

    return Math.max(0, Math.min(100, score));
}

function scoreVisualBalance(
    template: TemplateProfile,
    analysis: ContentAnalysis
): number {
    let score = 70; // Base score

    if (template.layout === "two-column" || template.layout === "grid") {
        // Two-column needs balanced content
        const experienceHeavy = analysis.totalExperienceChars > 1500;
        const hasEnoughSkillsProjects =
            analysis.skillsCount >= 6 || analysis.projectsCount >= 2;

        if (experienceHeavy && !hasEnoughSkillsProjects) {
            score -= 30; // Will have empty right column
        } else if (!experienceHeavy && hasEnoughSkillsProjects) {
            score += 20; // Good balance
        }
    } else {
        // Single column handles any content well
        score += 10;
    }

    // Long descriptions work better in single-column
    if (analysis.maxDescriptionLength > 600) {
        if (template.layout === "single-column") {
            score += 15;
        } else {
            score -= 15;
        }
    }

    return Math.max(0, Math.min(100, score));
}

function scoreCareerMatch(
    template: TemplateProfile,
    analysis: ContentAnalysis
): number {
    let score = 50;

    // Seniority match
    if (template.idealSeniority.includes(analysis.seniorityLevel)) {
        score += 30;
    } else {
        score -= 20;
    }

    // Role type match
    if (template.idealRoleTypes.includes(analysis.roleType)) {
        score += 20;
    }

    // Leadership signals for executive template
    if (template.id === "executive-v1" && analysis.hasLeadershipSignals) {
        score += 15;
    }

    // CRITICAL: Executives should ALWAYS prefer executive template
    if (analysis.seniorityLevel === "executive") {
        if (template.id === "executive-v1") {
            score += 25;
        } else if (template.id === "modern-creative-v1") {
            score -= 30;
        } else if (template.id === "bento-v1") {
            score -= 15;
        }
    }

    // Senior management roles also lean toward executive template
    if (
        analysis.seniorityLevel === "senior" &&
        analysis.roleType === "management"
    ) {
        if (template.id === "executive-v1") {
            score += 15;
        }
    }

    // PREMIUM: Bento template
    if (template.id === "bento-v1") {
        if (analysis.roleType === "product") score += 30;
        if (analysis.roleType === "creative") score += 25;
        if (analysis.skillsCount >= 5 && analysis.projectsCount >= 1) score += 10;
        if (
            analysis.seniorityLevel === "mid" ||
            analysis.seniorityLevel === "senior"
        )
            score += 10;
    }

    // PREMIUM: Terminal for technical roles
    if (template.id === "terminal-v1") {
        if (
            analysis.roleType === "technical" &&
            analysis.seniorityLevel !== "executive"
        ) {
            score += 15;
        }
        if (analysis.hasTechnicalDepth) score += 10;
    }

    // ENTERPRISE: Editorial for thought leaders
    if (template.id === "editorial-v1") {
        if (analysis.seniorityLevel === "executive") score += 25;
        if (analysis.avgDescriptionLength > 150) score += 15;
        if (analysis.roleType === "management" || analysis.roleType === "product")
            score += 10;
        if (
            analysis.contentDensity === "dense" ||
            analysis.contentDensity === "very-dense"
        )
            score += 10;
    }

    // ENTERPRISE: Noir for C-suite
    if (template.id === "noir-v1") {
        if (analysis.seniorityLevel === "executive") score += 30;
        if (analysis.hasLeadershipSignals) score += 20;
        if (
            analysis.contentDensity === "moderate" ||
            analysis.contentDensity === "dense"
        )
            score += 10;
        if (
            analysis.seniorityLevel === "entry" ||
            analysis.seniorityLevel === "junior"
        )
            score -= 40;
    }

    // Metrics are good for any professional template
    if (analysis.hasMetrics) {
        score += 5;
    }

    return Math.max(0, Math.min(100, score));
}

function scoreReadability(
    template: TemplateProfile,
    analysis: ContentAnalysis
): number {
    let score = 70;

    // Dense content + single column = better readability
    if (
        analysis.contentDensity === "dense" ||
        analysis.contentDensity === "very-dense"
    ) {
        if (template.layout === "single-column") {
            score += 20;
        } else {
            score -= 10;
        }
    }

    // Minimal content + creative template = better visual appeal
    if (analysis.contentDensity === "minimal") {
        if (template.id === "modern-creative-v1") {
            score += 25;
        } else if (template.id === "executive-v1") {
            score -= 20;
        }
    }

    return Math.max(0, Math.min(100, score));
}

function generateReasoning(
    template: TemplateProfile,
    analysis: ContentAnalysis,
    scores: TemplateScore["scores"]
): string {
    const reasons: string[] = [];

    if (scores.contentFit >= 70) {
        reasons.push(
            `Content density (${analysis.contentDensity}) fits well with ${template.name}`
        );
    }

    if (scores.careerMatch >= 70) {
        reasons.push(
            `${analysis.seniorityLevel}-level ${analysis.roleType} role matches this template's design`
        );
    }

    if (scores.visualBalance >= 70) {
        reasons.push("Good visual balance between sections");
    }

    if (analysis.hasLeadershipSignals && template.id === "executive-v1") {
        reasons.push("Leadership experience highlighted effectively");
    }

    if (analysis.projectsCount >= 2 && template.id === "masonry-v1") {
        reasons.push("Projects showcased in grid layout");
    }

    return reasons.length > 0
        ? reasons.join(". ") + "."
        : "General fit for this content profile.";
}
