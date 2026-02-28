jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn(),
}));

jest.mock("mammoth", () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { logger } from "@/lib/logger";
import { DocumentParser } from "@/lib/services/documentParser";

describe("DocumentParser", () => {
  const PDFParseMock = PDFParse as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses PDFs through pdf-parse v2 class API", async () => {
    PDFParseMock.mockImplementation(() => ({
      getText: jest.fn().mockResolvedValue({ text: "parsed pdf text" }),
      destroy: jest.fn().mockResolvedValue(undefined),
    }));

    const result = await DocumentParser.parseFile(
      Buffer.from("pdf-data"),
      "resume.pdf",
      "application/pdf",
    );

    const parserInstance = PDFParseMock.mock.results[0].value;
    expect(result).toBe("parsed pdf text");
    expect(PDFParse).toHaveBeenCalledTimes(1);
    expect(parserInstance.getText).toHaveBeenCalledTimes(1);
    expect(parserInstance.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys PDF parser even when parsing fails", async () => {
    PDFParseMock.mockImplementation(() => ({
      getText: jest.fn().mockRejectedValue(new Error("parse failed")),
      destroy: jest.fn().mockResolvedValue(undefined),
    }));

    await expect(
      DocumentParser.parseFile(Buffer.from("pdf-data"), "resume.pdf"),
    ).rejects.toThrow("Failed to parse PDF file");

    const parserInstance = PDFParseMock.mock.results[0].value;
    expect(parserInstance.destroy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("parses DOCX files with mammoth", async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({
      value: "parsed docx text",
    });

    const result = await DocumentParser.parseFile(
      Buffer.from("docx-data"),
      "resume.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    expect(result).toBe("parsed docx text");
    expect(mammoth.extractRawText).toHaveBeenCalledTimes(1);
  });

  it("parses plain text files directly", async () => {
    const result = await DocumentParser.parseFile(
      Buffer.from("hello world"),
      "resume.txt",
      "text/plain",
    );

    expect(result).toBe("hello world");
  });
});
