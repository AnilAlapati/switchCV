import type { LucideIcon } from "lucide-react";

export type UserMode = "jobseeker" | "recruiter";

export type AgentColor =
  | "blue"
  | "amber"
  | "purple"
  | "green"
  | "rose"
  | "indigo";

export interface AgentDefinition {
  id: string;
  name: string;
  nickname: string;
  modelFree: string;
  modelPremium: string;
  icon: LucideIcon;
  color: AgentColor;
  description: string;
  whatItDoes: string[];
}

export interface BeforeAfterExample {
  category: string;
  before: string;
  after: string;
  improvement: string;
}

export interface FlowStepDefinition {
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color?: AgentColor;
  isFirst?: boolean;
  isLast?: boolean;
}

export type DemoResumeColor = "blue" | "indigo" | "purple" | "rose";

export interface DemoResumePreview {
  id: string;
  title: string;
  color: DemoResumeColor;
}
