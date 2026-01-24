/**
 * Template Selector Agent
 *
 * An intelligent agent that analyzes resume content and recommends
 * the optimal template based on:
 *
 * 1. Content Density Analysis
 *    - Total character count
 *    - Description lengths
 *    - Section counts
 *
 * 2. Career Level Detection
 *    - Seniority level (entry → executive)
 *    - Years of experience
 *    - Role type (technical, management, product, creative)
 *
 * 3. Visual Balance Prediction
 *    - Left/right column balance for two-column templates
 *    - Content distribution across sections
 *
 * 4. Industry-Specific Conventions
 *    - Technical roles → clean, skills-forward
 *    - Executive roles → traditional, dense
 *    - Creative roles → visual, portfolio
 *    - Entry-level → personality-forward, minimal
 *
 * Usage:
 * ```typescript
 * import { selectBestTemplate } from '@/lib/agents/templateSelector';
 *
 * const recommendation = selectBestTemplate(resumeData);
 * console.log(recommendation.recommendedTemplate); // e.g., "executive-v1"
 * console.log(recommendation.explanation); // Human-readable reasoning
 * ```
 */

export {
  selectBestTemplate,
  analyzeResumeContent,
  getTemplateRecommendationDebug,
  type ContentAnalysis,
  type TemplateScore,
  type TemplateRecommendation,
} from "./templateSelectorAgent";
