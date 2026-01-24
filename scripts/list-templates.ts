import { DIVERSE_DEMO_RESUMES } from "../src/lib/data/diverseDemoResumes";
import { selectBestTemplate } from "../src/lib/agents/templateSelector/templateSelectorAgent";

const byTemplate: Record<string, number[]> = {};
Object.entries(DIVERSE_DEMO_RESUMES).forEach(([id, r]) => {
  const result = selectBestTemplate(r);
  const best = result.recommendedTemplate;
  if (!byTemplate[best]) byTemplate[best] = [];
  byTemplate[best].push(parseInt(id));
});

console.log("\n📋 DEMO RESUMES BY TEMPLATE:\n");
Object.entries(byTemplate)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([t, ids]) => {
    console.log("  " + t.padEnd(20) + "→ Demo #" + ids.join(", #"));
  });
console.log("\n💡 Pick ONE number from each row to test all 8 templates\n");
