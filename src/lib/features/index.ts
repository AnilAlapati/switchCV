/**
 * Features Index
 *
 * Central export for all feature flags and configurations
 */

export {
  CREATIVE_TEMPLATES_ENABLED,
  TEMPLATE_TIERS,
  getAvailableTemplates,
  canAccessTemplate,
  getUpgradeMessage,
  PREMIUM_TEMPLATE_INFO,
} from "./creativeTemplates";

export type { TemplateTier, TemplateTierConfig } from "./creativeTemplates";
