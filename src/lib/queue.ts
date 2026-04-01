import { Client } from "@upstash/qstash";

const isQStashConfigured = !!process.env.QSTASH_TOKEN;

let _client: Client | null = null;
function getQStashClient(): Client | null {
  if (!isQStashConfigured) return null;
  if (!_client) {
    _client = new Client({ token: process.env.QSTASH_TOKEN! });
  }
  return _client;
}

export function isAsyncMode(): boolean {
  return isQStashConfigured;
}

export async function publishGenerateJob(jobId: string): Promise<void> {
  const client = getQStashClient();
  if (!client) return; // local dev — caller handles sync execution

  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");

  await client.publishJSON({
    url: `${appUrl}/api/generate-deck/worker`,
    body: { jobId },
    retries: 0,
    headers: {
      "Upstash-Deduplication-Id": jobId,
    },
  });
}
