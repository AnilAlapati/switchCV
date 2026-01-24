import { DIVERSE_DEMO_RESUMES } from "../src/lib/data/diverseDemoResumes";
import { selectBestTemplate } from "../src/lib/agents/templateSelector/templateSelectorAgent";

console.log("Template Selector Agent - Recommendations:\n");
console.log("=".repeat(80));

const templateCounts: Record<string, number> = {};

Object.entries(DIVERSE_DEMO_RESUMES).forEach(([id, resume]) => {
  const result = selectBestTemplate(resume);
  templateCounts[result.recommendedTemplate] =
    (templateCounts[result.recommendedTemplate] || 0) + 1;

  const title = resume.personalInfo?.title || resume.title || "Unknown";
  const seniority = result.analysis.seniorityLevel.padEnd(10);
  const role = result.analysis.roleType.padEnd(12);
  const template = result.recommendedTemplate.padEnd(20);

  console.log(
    `#${id.padStart(2)} ${template} | ${seniority} ${role} | ${title.substring(0, 35)}`,
  );
});

console.log("\n" + "=".repeat(80));
console.log("Template Distribution:");
Object.entries(templateCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([t, c]) => {
    console.log(`  ${t}: ${c} resumes`);
  });
