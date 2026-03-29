import { NextRequest } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Sanitize the id to prevent directory traversal
  const safeId = path.basename(id);
  const decksDir = path.join(process.cwd(), "generated-decks");
  const filePath = path.join(decksDir, safeId);

  if (!fs.existsSync(filePath)) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fileBytes = fs.readFileSync(filePath);
  const fileName = safeId.replace(/^[a-f0-9-]+_/, ""); // Remove UUID prefix

  return new Response(fileBytes, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(fileBytes.length),
    },
  });
}
