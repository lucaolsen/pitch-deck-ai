"use client";

import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

type Status = "idle" | "generating" | "success" | "error";

interface DeckPreviewProps {
  status: Status;
  progress: number;
  statusMessage: string;
  error?: string;
}

export function DeckPreview({
  status,
  progress,
  statusMessage,
  error,
}: DeckPreviewProps) {
  if (status === "idle") return null;

  return (
    <Card className="p-6 mt-6">
      {status === "generating" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm font-medium text-gray-700">
              {statusMessage}
            </p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500">
            This usually takes 30-90 seconds for a full deck
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center gap-3 text-green-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-medium">
            Deck generated successfully! Download should start automatically.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3 text-red-700">
          <svg className="h-5 w-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div>
            <p className="text-sm font-medium">Failed to generate deck</p>
            {error && <p className="text-xs mt-1">{error}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}
