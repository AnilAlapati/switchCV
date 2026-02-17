
import { NextRequest, NextResponse } from "next/server";
import { DocumentParser } from "@/lib/services/documentParser";
import { handleApiError, getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export const config = {
    api: {
        bodyParser: false, // Disabling body parser to handle file stream manually if needed, but Next.js App Router uses standard Request
    },
};

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const { userId, error } = await getAuthenticatedUserId(request);
        if (error) return error;

        // 2. Parse Form Data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return handleApiError(null, "No file uploaded", 400);
        }

        // 3. Validation
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            return handleApiError(null, "File size exceeds 5MB limit", 400);
        }

        const validTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain"
        ];

        // Looser check for extensions since mime types can vary
        const name = file.name.toLowerCase();
        const isValidExt = name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".txt");

        if (!isValidExt && !validTypes.includes(file.type)) {
            return handleApiError(null, "Invalid file type. Only PDF, DOCX, and TXT are supported.", 400);
        }

        logger.info({ userId, filename: file.name, size: file.size }, "Parsing JD file");

        // 4. Convert to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 5. Parse
        const text = await DocumentParser.parseFile(buffer, file.name, file.type);

        if (!text || text.trim().length < 50) {
            return handleApiError(null, "Could not extract enough text from the file. Please ensure it contains readable text.", 400);
        }

        return NextResponse.json({ success: true, text });

    } catch (error) {
        return handleApiError(error, "Failed to parse document");
    }
}
