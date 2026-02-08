import { ResumeTemplate } from "@/types";
import { standardV1Template } from "./resumeTemplates/standard-v1";
import { modernCreativeV1Template } from "./resumeTemplates/modern-creative-v1";
import { executiveV1Template } from "./resumeTemplates/executive-v1";
import { masonryV1Template } from "./resumeTemplates/masonry-v1";
import { bentoV1Template } from "./resumeTemplates/bento-v1";
import { terminalV1Template } from "./resumeTemplates/terminal-v1";
import { editorialV1Template } from "./resumeTemplates/editorial-v1";
import { noirV1Template } from "./resumeTemplates/noir-v1";

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  standardV1Template,
  modernCreativeV1Template,
  executiveV1Template,
  masonryV1Template,
  bentoV1Template,
  terminalV1Template,
  editorialV1Template,
  noirV1Template,
];
