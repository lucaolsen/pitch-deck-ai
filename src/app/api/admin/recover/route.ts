import { NextRequest, NextResponse } from "next/server";
import { getDecksHistory, saveDecksHistory } from "@/lib/redis";

interface RecoverFile {
  fileId: string;
  fileName: string;
  createdAt: number;
}

// Admin endpoint: injects recovered Anthropic file references into Performance & History
export async function POST(req: NextRequest) {
  const { files }: { files: RecoverFile[] } = await req.json();

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const history = await getDecksHistory();

  let added = 0;
  for (const file of files) {
    const id = `recovered_${file.fileId}`;
    if (history.find((h: { id: string }) => h.id === id)) continue; // skip duplicates

    history.push({
      id,
      fileName: file.fileName,
      downloadUrl: `/api/files/${file.fileId}`,
      createdAt: file.createdAt,
      clientName: "",
      rating: 0,
      feedback: "",
      performance: "pending",
    });
    added++;
  }

  // Sort newest first
  history.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);

  await saveDecksHistory(history);

  return NextResponse.json({ success: true, added, total: history.length });
}
