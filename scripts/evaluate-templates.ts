/**
 * Template Selector Agent - Sample Output
 *
 * This shows the agent's recommendations for all 21 demo resumes
 * Run with: npx ts-node src/lib/agents/templateSelector/sampleOutput.ts
 */

import { DIVERSE_DEMO_RESUMES } from "@/lib/data/diverseDemoResumes";
import { selectBestTemplate } from "./templateSelectorAgent";

// Generate recommendations for all demo resumes
function generateSampleOutput() {
  console.log("=".repeat(80));
  console.log("TEMPLATE SELECTOR AGENT - RECOMMENDATIONS FOR ALL DEMO RESUMES");
  console.log("=".repeat(80));
  console.log();

  const results: Array<{
    id: string;
    name: string;
    title: string;
    recommended: string;
    confidence: string;
    scores: string;
    density: string;
    seniority: string;
  }> = [];

  for (const [id, resume] of Object.entries(DIVERSE_DEMO_RESUMES)) {
    const recommendation = selectBestTemplate(resume);
    const analysis = recommendation.analysis;
    const best = recommendation.allScores[0];

    results.push({
      id,
      name: resume.personalInfo?.name || "Unknown",
      title: resume.personalInfo?.title || "N/A",
      recommended: best.templateId,
      confidence: best.confidence,
      scores: `${best.totalScore}`,
      density: analysis.contentDensity,
      seniority: analysis.seniorityLevel,
    });

    console.log(
      `--- Resume #${id}: ${resume.personalInfo?.name || "Unknown"} ---`,
    );
    console.log(`Title: ${resume.personalInfo?.title || "N/A"}`);
    console.log(`Content Density: ${analysis.contentDensity}`);
    console.log(
      `Seniority: ${analysis.seniorityLevel} | Role: ${analysis.roleType}`,
    );
    console.log(
      `Experience: ${analysis.experienceCount} | Skills: ${analysis.skillsCount} | Projects: ${analysis.projectsCount}`,
    );
    console.log();
    console.log("Template Scores:");
    recommendation.allScores.forEach((score, idx) => {
      const marker = idx === 0 ? "→ " : "  ";
      console.log(
        `${marker}${score.templateId.padEnd(20)} Score: ${String(score.totalScore).padStart(2)} | Confidence: ${score.confidence}`,
      );
    });
    console.log();
    console.log(`✓ Recommendation: ${best.templateId}`);
    console.log(`  Reason: ${best.reasoning}`);
    console.log();
    console.log("-".repeat(60));
    console.log();
  }

  // Summary table
  console.log();
  console.log("=".repeat(80));
  console.log("SUMMARY TABLE");
  console.log("=".repeat(80));
  console.log();
  console.log(
    "ID".padEnd(4) +
    "Name".padEnd(20) +
    "Seniority".padEnd(12) +
    "Density".padEnd(12) +
    "Template".padEnd(22) +
    "Score",
  );
  console.log("-".repeat(80));

  results.forEach((r) => {
    console.log(
      r.id.padEnd(4) +
      r.name.substring(0, 18).padEnd(20) +
      r.seniority.padEnd(12) +
      r.density.padEnd(12) +
      r.recommended.padEnd(22) +
      r.scores,
    );
  });

  // Template distribution
  console.log();
  console.log("=".repeat(80));
  console.log("TEMPLATE DISTRIBUTION");
  console.log("=".repeat(80));

  const templateCounts: Record<string, number> = {};
  results.forEach((r) => {
    templateCounts[r.recommended] = (templateCounts[r.recommended] || 0) + 1;
  });

  Object.entries(templateCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([template, count]) => {
      const bar = "█".repeat(count * 2);
      console.log(`${template.padEnd(22)} ${bar} (${count})`);
    });
}

// For direct execution
if (require.main === module) {
  generateSampleOutput();
}

export { generateSampleOutput };
