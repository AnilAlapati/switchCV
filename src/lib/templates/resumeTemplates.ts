import { ResumeTemplate } from "@/types";
import { standardV1Template } from "./resumeTemplates/standard-v1";
import { modernCreativeV1Template } from "./resumeTemplates/modern-creative-v1";
import { executiveV1Template } from "./resumeTemplates/executive-v1";
import { masonryV1Template } from "./resumeTemplates/masonry-v1";
import { bentoV1Template } from "./resumeTemplates/bento-v1";
import { terminalV1Template } from "./resumeTemplates/terminal-v1";
import { editorialV1Template } from "./resumeTemplates/editorial-v1";
import { noirV1Template } from "./resumeTemplates/noir-v1";
import { signalV1Template } from "./resumeTemplates/signal-v1";
import { narrativeV1Template } from "./resumeTemplates/narrative-v1";
import { studioV1Template } from "./resumeTemplates/studio-v1";

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  signalV1Template,
  standardV1Template,
  modernCreativeV1Template,
  executiveV1Template,
  masonryV1Template,
  narrativeV1Template,
  studioV1Template,
  bentoV1Template,
  terminalV1Template,
  editorialV1Template,
  noirV1Template,
];
