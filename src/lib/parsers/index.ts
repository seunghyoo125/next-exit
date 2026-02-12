import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
