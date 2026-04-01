import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Receiver } from "@upstash/qstash";
import { getAnthropicClient } from "@/lib/anthropic";
import { buildSystemPrompt, buildUserMessage } from "@/lib/deck-prompt";
import { extractFileIds } from "@/lib/file-extractor";
import { getJob, updateJob } from "@/lib/redis";
import { uploadDeck } from "@/lib/blob-storage";
import { DEFAULT_BRAND_CONFIG } from "@/types/deck";

export const maxDuration = 300;

function loadDefaultDocs(): string[] {
  const docsDir = path.join(process.cwd(), "docs", "sales");
  if (!fs.existsSync(docsDir)) return [];
  return fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => fs.readFileSync(path.join(docsDir, f), "utf-8"));
}

function resolveDocuments(documents: string[]): string[] {
  if (documents.length === 1 && documents[0] === "USE_DEFAULT_DOCS") {
    return loadDefaultDocs();
  }

  if (documents.some((d) => d.startsWith("DEFAULT_DOC:"))) {
    const docsDir = path.join(process.cwd(), "docs", "sales");
    const loadedDefaults = documents
      .filter((d) => d.startsWith("DEFAULT_DOC:"))
      .map((d) => {
        const filePath = path.join(docsDir, path.basename(d.replace("DEFAULT_DOC:", "")));
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
      })
      .filter((d): d is string => d !== null);

    const uploaded = documents.filter((d) => !d.startsWith("DEFAULT_DOC:"));
    return [...loadedDefaults, ...uploaded];
  }

  return documents;
}

export async function runGeneration(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.status !== "queued") {
    console.log(`[worker] Job ${jobId} already ${job.status}, skipping`);
    return;
  }

  const startTime = Date.now();
  // Mark job as failed 20s before Vercel kills the function (maxDuration=300s)
  const DEADLINE_MS = 275 * 1000;
  const deadlineTimer = setTimeout(async () => {
    console.error(`[worker] Approaching Vercel timeout — marking job ${jobId} as failed`);
    await updateJob(jobId, {
      status: "failed",
      progress: 0,
      progressMessage: "Failed",
      error: "Generation timed out. Try using Modular or One-pager format, or deselect some base documents.",
    });
  }, DEADLINE_MS);

  console.log(`[worker] === JOB ${jobId} START ===`);

  await updateJob(jobId, {
    status: "processing",
    progress: 5,
    progressMessage: "Analyzing sales documents...",
  });

  try {
    const { prompt, deckType, documents: rawDocs, brandConfig: partialBrand } = job.payload;
    // Cap each document at 15k chars to keep total input under ~90k and stay within Vercel 300s limit
    const MAX_DOC_CHARS = 15_000;
    const documents = resolveDocuments(rawDocs).map((doc) =>
      doc.length > MAX_DOC_CHARS
        ? doc.slice(0, MAX_DOC_CHARS) + "\n\n[... document truncated for processing efficiency ...]"
        : doc
    );

    if (!documents.length) {
      throw new Error("No documents resolved");
    }

    console.log(`[worker] Docs: ${documents.length}, chars: ${documents.reduce((s, d) => s + d.length, 0)}`);

    const anthropic = getAnthropicClient();
    const brandConfig = { ...DEFAULT_BRAND_CONFIG, ...partialBrand };
    const systemPrompt = buildSystemPrompt(brandConfig);
    const userContent = buildUserMessage(prompt, deckType, documents);

    await updateJob(jobId, { progress: 15, progressMessage: "Generating presentation..." });

    // Stream request helper with retry on overload
    async function streamRequest(params: Parameters<typeof anthropic.beta.messages.create>[0]) {
      const MAX_RETRIES = 4;
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = Math.min(10000, 2000 * Math.pow(2, attempt - 1)); // 2s, 4s, 8s, capped at 10s
          console.log(`[worker] Retrying after ${delay}ms (attempt ${attempt + 1})`);
          await new Promise((r) => setTimeout(r, delay));
        }
        try {
          const stream = anthropic.beta.messages.stream({
            ...params,
            stream: true,
          } as Parameters<typeof anthropic.beta.messages.stream>[0]);
          return await stream.finalMessage();
        } catch (err: unknown) {
          const isOverloaded =
            err instanceof Error &&
            (err.message.includes("overloaded") || err.message.includes("529") || (err as { status?: number }).status === 529);
          if (isOverloaded && attempt < MAX_RETRIES - 1) {
            console.warn(`[worker] Anthropic overloaded, will retry (attempt ${attempt + 1})`);
            lastError = err;
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    }

    // Max tokens per deck type — code for slides rarely exceeds 4k tokens per slide
    const maxTokens = deckType === "one-pager" ? 6000 : deckType === "modular" ? 10000 : 12000; // pitch-5

    // Initial Claude request
    let currentResponse = await streamRequest({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      betas: ["code-execution-2025-08-25", "skills-2025-10-02"],
      container: {
        skills: [{ type: "anthropic" as const, skill_id: "pptx", version: "latest" }],
      },
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      tools: [{ type: "code_execution_20250825" as const, name: "code_execution" }],
    });

    console.log(`[worker] Initial response: stop_reason=${currentResponse.stop_reason}, blocks=${currentResponse.content.length}`);

    // Handle continuations
    let continuations = 0;
    const MAX_CONTINUATIONS = 5;
    const allContent = [...currentResponse.content];

    while (
      (currentResponse.stop_reason === "pause_turn" || currentResponse.stop_reason === "max_tokens") &&
      continuations < MAX_CONTINUATIONS
    ) {
      continuations++;
      const progressPct = Math.min(80, 15 + continuations * 10);
      await updateJob(jobId, {
        progress: progressPct,
        progressMessage: `Generating slides (step ${continuations})...`,
      });

      currentResponse = await streamRequest({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        betas: ["code-execution-2025-08-25", "skills-2025-10-02"],
        container: {
          id: (currentResponse as unknown as { container?: { id?: string } }).container?.id,
          skills: [{ type: "anthropic" as const, skill_id: "pptx", version: "latest" }],
        },
        system: systemPrompt,
        messages: [
          { role: "user", content: userContent },
          { role: "assistant", content: allContent },
        ],
        tools: [{ type: "code_execution_20250825" as const, name: "code_execution" }],
      });
      console.log(`[worker] Continuation ${continuations}: stop_reason=${currentResponse.stop_reason}`);
      allContent.push(...currentResponse.content);
    }

    await updateJob(jobId, { progress: 85, progressMessage: "Extracting presentation file..." });

    // Extract files
    const fakeResponse = { ...currentResponse, content: allContent };
    const fileIds = extractFileIds(fakeResponse);
    console.log(`[worker] File IDs: ${JSON.stringify(fileIds)}`);

    if (fileIds.length === 0) {
      throw new Error("No file was generated by the AI");
    }

    // Download from Claude
    const fileId = fileIds[0];
    const fileMetadata = await anthropic.beta.files.retrieveMetadata(fileId, {
      betas: ["files-api-2025-04-14"],
    });
    const fileResponse = await anthropic.beta.files.download(fileId, {
      betas: ["files-api-2025-04-14"],
    });
    const fileBytes = Buffer.from(await fileResponse.arrayBuffer());

    const rawName = fileMetadata.filename || "pitch_deck.pptx";
    const safeName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = safeName.endsWith(".pptx") ? safeName : `${safeName}.pptx`;

    await updateJob(jobId, { progress: 95, progressMessage: "Saving file..." });

    // Upload to storage
    const { url, size } = await uploadDeck(fileBytes, fileName);
    const generationTime = Date.now() - startTime;

    clearTimeout(deadlineTimer);
    await updateJob(jobId, {
      status: "completed",
      progress: 100,
      progressMessage: "Done!",
      downloadUrl: url,
      fileName,
      fileSize: size,
      generationTime,
    });

    console.log(`[worker] === JOB ${jobId} COMPLETE in ${generationTime}ms ===`);
  } catch (error) {
    clearTimeout(deadlineTimer);
    const raw = error instanceof Error ? error.message : "Unknown error";
    const isOverloaded = raw.includes("overloaded") || raw.includes("529");
    const message = isOverloaded
      ? "Anthropic API is overloaded right now. Wait 1–2 minutes and try again."
      : raw;
    console.error(`[worker] === JOB ${jobId} FAILED ===`, error);
    await updateJob(jobId, {
      status: "failed",
      progress: 0,
      progressMessage: "Failed",
      error: message,
    });
    throw error; // Re-throw so QStash retries
  }
}

// QStash webhook endpoint
export async function POST(request: NextRequest) {
  // Verify QStash signature in production
  if (process.env.QSTASH_CURRENT_SIGNING_KEY) {
    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
    });

    const body = await request.text();
    const signature = request.headers.get("upstash-signature") || "";

    try {
      await receiver.verify({ signature, body });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { jobId } = JSON.parse(body);
    await runGeneration(jobId);
    return NextResponse.json({ ok: true });
  }

  // Dev mode — no signature verification
  const { jobId } = await request.json();
  await runGeneration(jobId);
  return NextResponse.json({ ok: true });
}
