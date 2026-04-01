import { NextRequest, NextResponse } from "next/server";
import { getDecksHistory, saveDecksHistory } from "@/lib/redis";
import { uploadDeck } from "@/lib/blob-storage";

interface RecoverFile {
  fileId: string;
  fileName: string;
  createdAt: number;
}

// Admin endpoint: downloads files from Anthropic Files API and saves to Vercel Blob,
// then injects permanent entries into Performance & History.
// File downloads do NOT consume Anthropic generation credits.
export async function POST(req: NextRequest) {
  const { files }: { files: RecoverFile[] } = await req.json();

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const history = await getDecksHistory();
  const results: { fileName: string; status: string; url?: string }[] = [];

  for (const file of files) {
    const id = `recovered_${file.fileId}`;
    const existing = history.find((h: { id: string }) => h.id === id);

    // Skip if already saved to Vercel Blob (URL starts with https://...vercel-storage)
    if (existing?.downloadUrl && !existing.downloadUrl.startsWith("/api/files/")) {
      results.push({ fileName: file.fileName, status: "already_in_blob" });
      continue;
    }

    try {
      // Download from Anthropic Files API (does not consume generation credits)
      const upstream = await fetch(`https://api.anthropic.com/v1/files/${file.fileId}/content`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (!upstream.ok) {
        results.push({ fileName: file.fileName, status: `anthropic_error_${upstream.status}` });
        continue;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      const { url } = await uploadDeck(buffer, file.fileName);

      if (existing) {
        existing.downloadUrl = url;
      } else {
        history.push({
          id,
          fileName: file.fileName,
          downloadUrl: url,
          createdAt: file.createdAt,
          clientName: "",
          rating: 0,
          feedback: "",
          performance: "pending",
        });
      }

      results.push({ fileName: file.fileName, status: "saved_to_blob", url });
    } catch (err) {
      results.push({ fileName: file.fileName, status: `error: ${err instanceof Error ? err.message : err}` });
    }
  }

  history.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);
  await saveDecksHistory(history);

  return NextResponse.json({ success: true, results });
}
