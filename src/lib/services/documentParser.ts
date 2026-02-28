
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { logger } from "@/lib/logger";

/**
 * Service to parse document files (PDF, DOCX) into text.
 */
export class DocumentParser {
    /**
     * Parse a file buffer based on its mime type or extension
     */
    static async parseFile(buffer: Buffer, filename: string, mimeType?: string): Promise<string> {
        const lowerFilename = filename.toLowerCase();

        if (mimeType === "application/pdf" || lowerFilename.endsWith(".pdf")) {
            return this.parsePdf(buffer);
        }

        if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            lowerFilename.endsWith(".docx")
        ) {
            return this.parseDocx(buffer);
        }

        if (mimeType === "text/plain" || lowerFilename.endsWith(".txt")) {
            return buffer.toString("utf-8");
        }

        throw new Error(`Unsupported file type: ${filename}`);
    }

    /**
     * Parse PDF buffer
     */
    private static async parsePdf(buffer: Buffer): Promise<string> {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });

        try {
            const result = await parser.getText();
            return result.text || "";
        } catch (error) {
            logger.error({ err: error }, "Failed to parse PDF");
            throw new Error("Failed to parse PDF file");
        } finally {
            try {
                await parser.destroy();
            } catch (destroyError) {
                logger.warn({ err: destroyError }, "Failed to cleanup PDF parser");
            }
        }
    }

    /**
     * Parse DOCX buffer
     */
    private static async parseDocx(buffer: Buffer): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } catch (error) {
            logger.error({ err: error }, "Failed to parse DOCX");
            throw new Error("Failed to parse DOCX file");
        }
    }
}
