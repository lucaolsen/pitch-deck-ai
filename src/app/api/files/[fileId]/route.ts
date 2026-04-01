import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// Proxy: streams a file from Anthropic Files API using the server-side API key
// Does NOT consume generation credits — file downloads are free
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const upstream = await fetch(`https://api.anthropic.com/v1/files/${fileId}/content`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: "File not found", detail: text },
      { status: upstream.status }
    );
  }

  const buffer = await upstream.arrayBuffer();
  const contentDisposition =
    upstream.headers.get("content-disposition") ||
    `attachment; filename="${fileId}.pptx"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
