import { db } from "@/lib/firebase";
import { ResumeTemplate } from "@/types";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  limit,
  query,
} from "firebase/firestore";
import { logger } from "@/lib/logger";
import { MemoryCache, coalesce } from "@/lib/utils/cache";

const COLLECTION_NAME = "templates";

// Templates change only on deploy — cache for 30 minutes
const templateListCache = new MemoryCache<ResumeTemplate[]>(30 * 60 * 1000);
const templateByIdCache = new MemoryCache<ResumeTemplate>(30 * 60 * 1000);
const TEMPLATE_LIST_CACHE_KEY = "all_templates";

export const templateService = {
  /**
   * Fetch all available resume templates.
   * In-memory cached for 30 minutes. Falls back to local defaults if DB is empty or unreachable.
   */
  async getAllTemplates(): Promise<ResumeTemplate[]> {
    const cached = templateListCache.get(TEMPLATE_LIST_CACHE_KEY);
    if (cached) return cached;

    return coalesce(TEMPLATE_LIST_CACHE_KEY, async () => {
      try {
        const templatesRef = collection(db, COLLECTION_NAME);
        const snapshot = await getDocs(query(templatesRef, limit(50)));

        const templates = snapshot.empty
          ? RESUME_TEMPLATES
          : snapshot.docs.map((d) => d.data() as ResumeTemplate);

        if (snapshot.empty) {
          logger.warn("No templates found in DB, using local defaults");
        }

        templateListCache.set(TEMPLATE_LIST_CACHE_KEY, templates);
        return templates;
      } catch (error) {
        logger.error(
          { err: error },
          "Error fetching templates, falling back to local",
        );
        return RESUME_TEMPLATES;
      }
    });
  },

  /**
   * Get a specific template by ID.
   * Checks local static list first (always up-to-date after deploy), then Firestore.
   */
  async getTemplateById(templateId: string): Promise<ResumeTemplate | null> {
    // Local static list is authoritative — no Firestore read needed in most cases
    const localTemplate = RESUME_TEMPLATES.find((t) => t.id === templateId);
    if (localTemplate) return localTemplate;

    const cached = templateByIdCache.get(templateId);
    if (cached) return cached;

    try {
      const docRef = doc(db, COLLECTION_NAME, templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const tmpl = docSnap.data() as ResumeTemplate;
        templateByIdCache.set(templateId, tmpl);
        return tmpl;
      }

      return null;
    } catch (error) {
      logger.error({ err: error, templateId }, "Error fetching template");
      return null;
    }
  },

  /**
   * Initialize templates in the database if they don't exist.
   * This can be called by an admin endpoint.
   */
  async seedTemplates(): Promise<void> {
    const batch = writeBatch(db);

    for (const template of RESUME_TEMPLATES) {
      const ref = doc(db, COLLECTION_NAME, template.id);
      batch.set(ref, template, { merge: true });
    }

    await batch.commit();
  },
};
