import { db } from "@/lib/firebase";
import { ResumeTemplate } from "@/types";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";

const COLLECTION_NAME = "templates";

export const templateService = {
  /**
   * Fetch all available resume templates.
   * Falls back to local default templates if DB is empty or unreachable.
   */
  async getAllTemplates(): Promise<ResumeTemplate[]> {
    try {
      const snapshot = await db.collection(COLLECTION_NAME).get();

      if (snapshot.empty) {
        console.warn("No templates found in DB, using local defaults.");
        return RESUME_TEMPLATES;
      }

      return snapshot.docs.map((doc: any) => doc.data() as ResumeTemplate);
    } catch (error) {
      console.error("Error fetching templates:", error);
      // Fallback to local templates on error
      return RESUME_TEMPLATES;
    }
  },

  /**
   * Get a specific template by ID.
   */
  async getTemplateById(templateId: string): Promise<ResumeTemplate | null> {
    try {
      const doc = await db.collection(COLLECTION_NAME).doc(templateId).get();

      if (doc.exists) {
        return doc.data() as ResumeTemplate;
      }

      // Check local defaults
      const localTemplate = RESUME_TEMPLATES.find((t) => t.id === templateId);
      return localTemplate || null;
    } catch (error) {
      console.error(`Error fetching template ${templateId}:`, error);
      const localTemplate = RESUME_TEMPLATES.find((t) => t.id === templateId);
      return localTemplate || null;
    }
  },

  /**
   * Initialize templates in the database if they don't exist.
   * This can be called by an admin endpoint.
   */
  async seedTemplates(): Promise<void> {
    const batch = db.batch();

    for (const template of RESUME_TEMPLATES) {
      const ref = db.collection(COLLECTION_NAME).doc(template.id);
      batch.set(ref, template, { merge: true });
    }

    await batch.commit();
  },
};
