import { Redis } from "@upstash/redis";
import type { DeckRequest } from "@/types/deck";

// In-memory fallback for local dev (no Upstash needed)
const memoryStore = new Map<string, string>();

const isUpstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!isUpstashConfigured) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

export interface JobData {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  progressMessage: string;
  payload: DeckRequest;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  generationTime?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const JOB_TTL = 86400; // 24 hours

export async function createJob(
  jobId: string,
  payload: DeckRequest
): Promise<JobData> {
  const job: JobData = {
    id: jobId,
    status: "queued",
    progress: 0,
    progressMessage: "Queued for processing...",
    payload,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const redis = getRedis();
  if (redis) {
    await redis.set(`job:${jobId}`, JSON.stringify(job), { ex: JOB_TTL });
  } else {
    memoryStore.set(`job:${jobId}`, JSON.stringify(job));
  }

  return job;
}

export async function getJob(jobId: string): Promise<JobData | null> {
  const redis = getRedis();
  let raw: string | null;

  if (redis) {
    raw = await redis.get<string>(`job:${jobId}`);
  } else {
    raw = memoryStore.get(`job:${jobId}`) ?? null;
  }

  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as JobData);
}

export async function updateJob(
  jobId: string,
  updates: Partial<JobData>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  const updated = { ...job, ...updates, updatedAt: Date.now() };
  const redis = getRedis();

  if (redis) {
    await redis.set(`job:${jobId}`, JSON.stringify(updated), { ex: JOB_TTL });
  } else {
    memoryStore.set(`job:${jobId}`, JSON.stringify(updated));
  }
}

// Global DB tracking for history page
export async function getDecksHistory(): Promise<any[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>("app:global_decks_history");
    return typeof raw === "string" ? JSON.parse(raw) : (raw || []);
  } else {
    const raw = memoryStore.get("app:global_decks_history");
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveDecksHistory(history: any[]): Promise<void> {
  const redis = getRedis();
  const serialized = JSON.stringify(history);
  if (redis) {
    await redis.set("app:global_decks_history", serialized);
  } else {
    memoryStore.set("app:global_decks_history", serialized);
  }
}
