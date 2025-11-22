import { db } from "@/lib/firebase";
import { ResumeTemplate } from "@/types";
import { RESUME_TEMPLATES } from "@/lib/templates/resumeTemplates";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

const COLLECTION_NAME = "templates";

export const templateService = {
  /**
   * Fetch all available resume templates.
   * Falls back to local default templates if DB is empty or unreachable.
   */
  async getAllTemplates(): Promise<ResumeTemplate[]> {
    try {
      const templatesRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(templatesRef);

      if (snapshot.empty) {
        console.warn("No templates found in DB, using local defaults.");
        return RESUME_TEMPLATES;
      }

      return snapshot.docs.map((doc) => doc.data() as ResumeTemplate);
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
      const docRef = doc(db, COLLECTION_NAME, templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as ResumeTemplate;
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
    const batch = writeBatch(db);

    for (const template of RESUME_TEMPLATES) {
      const ref = doc(db, COLLECTION_NAME, template.id);
      batch.set(ref, template, { merge: true });
    }

    await batch.commit();
  },
};
