import zlib from "zlib";

/**
 * Extracts plain text from a PPTX buffer using native zip reading and zlib.
 * PPTX files store slide text in ppt/slides/slide{N}.xml within <a:t>...</a:t> tags.
 */
export function extractTextFromPptx(buffer: Buffer): string {
  try {
    let offset = 0;
    const extractedSlideTexts: string[] = [];

    while (offset < buffer.length - 30) {
      // Look for local file header signature: 0x04034b50 ("PK\x03\x04")
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const fileNameStart = offset + 30;
        const fileNameEnd = fileNameStart + fileNameLength;
        const fileName = buffer.toString("utf8", fileNameStart, fileNameEnd);

        const dataStart = fileNameEnd + extraFieldLength;
        const dataEnd = dataStart + compressedSize;

        if (dataEnd <= buffer.length && fileName.includes("ppt/slides/slide")) {
          const compressedChunk = buffer.subarray(dataStart, dataEnd);
          let xmlContent = "";

          try {
            if (compressionMethod === 8) {
              const decompressed = zlib.inflateRawSync(compressedChunk);
              xmlContent = decompressed.toString("utf8");
            } else if (compressionMethod === 0) {
              xmlContent = compressedChunk.toString("utf8");
            }
          } catch (decompressError) {
            // In case of zip data descriptor format or partial stream
          }

          if (xmlContent) {
            // Extract all <a:t>text</a:t> tags
            const textMatches = xmlContent.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
            const slideWords = textMatches
              .map((t) => t.replace(/<[^>]+>/g, "").trim())
              .filter(Boolean);

            if (slideWords.length > 0) {
              extractedSlideTexts.push(slideWords.join(" "));
            }
          }
        }

        offset = dataEnd;
      } else {
        offset++;
      }
    }

    return extractedSlideTexts.join("\n\n");
  } catch (err: any) {
    console.error("Failed to parse PPTX:", err);
    return "";
  }
}
