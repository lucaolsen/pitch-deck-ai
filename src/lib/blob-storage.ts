import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function uploadDeck(
  buffer: Buffer,
  fileName: string
): Promise<{ url: string; size: number }> {
  if (isVercel) {
    const blob = await put(fileName, buffer, {
      access: "public",
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    return { url: blob.url, size: buffer.length };
  }

  // Local dev: save to generated-decks/
  const decksDir = path.join(process.cwd(), "generated-decks");
  if (!fs.existsSync(decksDir)) fs.mkdirSync(decksDir, { recursive: true });

  const id = crypto.randomUUID();
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const localName = `${id}_${safeName}`;
  const filePath = path.join(decksDir, localName);
  fs.writeFileSync(filePath, buffer);

  return {
    url: `/api/download/${localName}`,
    size: buffer.length,
  };
}
