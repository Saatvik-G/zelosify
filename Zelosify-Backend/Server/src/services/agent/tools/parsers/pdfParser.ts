import pdfExtraction from "pdf-extraction";

/**
 * Extracts plain text from a PDF buffer.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfExtraction(buffer);
    return data.text || "";
  } catch (error: any) {
    console.error("Failed to parse PDF:", error);
    return "";
  }
}
