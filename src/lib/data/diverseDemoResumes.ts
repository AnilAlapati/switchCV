import { DashboardResume } from "@/types";
import { diverseDemoResumes1 } from "./diverseDemoResumes/part1";
import { diverseDemoResumes2 } from "./diverseDemoResumes/part2";
import { diverseDemoResumes3 } from "./diverseDemoResumes/part3";
import { diverseDemoResumes4 } from "./diverseDemoResumes/part4";
import { diverseDemoResumes5 } from "./diverseDemoResumes/part5";
import { diverseDemoResumes6 } from "./diverseDemoResumes/part6";
import { diverseDemoResumes7 } from "./diverseDemoResumes/part7";
import { diverseDemoResumes8 } from "./diverseDemoResumes/part8";
import { diverseDemoResumes9 } from "./diverseDemoResumes/part9";
import { diverseDemoResumes10 } from "./diverseDemoResumes/part10";
import { diverseDemoResumes11 } from "./diverseDemoResumes/part11";

/**
 * Diverse Demo Resumes - split into smaller modules to keep this entrypoint maintainable.
 */
export const DIVERSE_DEMO_RESUMES: Record<string, DashboardResume> = {
  ...diverseDemoResumes1,
  ...diverseDemoResumes2,
  ...diverseDemoResumes3,
  ...diverseDemoResumes4,
  ...diverseDemoResumes5,
  ...diverseDemoResumes6,
  ...diverseDemoResumes7,
  ...diverseDemoResumes8,
  ...diverseDemoResumes9,
  ...diverseDemoResumes10,
  ...diverseDemoResumes11,
};
