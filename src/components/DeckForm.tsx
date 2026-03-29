"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DocumentUploader } from "./DocumentUploader";
import { DeckPreview } from "./DeckPreview";
import { DEFAULT_BRAND_CONFIG } from "@/types/deck";
import type { BrandConfig } from "@/types/deck";

type Status = "idle" | "generating" | "success" | "error";

const PROGRESS_MESSAGES = [
  "Analyzing sales documents...",
  "Structuring slide content...",
  "Generating presentation...",
  "Applying branding and formatting...",
  "Finalizing deck...",
];

export function DeckForm() {
  const [prompt, setPrompt] = useState("");
  const [deckType, setDeckType] = useState<"one-pager" | "pitch-15">("pitch-15");
  const [documents, setDocuments] = useState<string[]>([]);
  const [showBranding, setShowBranding] = useState(false);
  const [brand, setBrand] = useState<BrandConfig>({ ...DEFAULT_BRAND_CONFIG });
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [useDefaultDocs, setUseDefaultDocs] = useState(true);
  const progressTimer = useRef<ReturnType<typeof setInterval>>(null);

  const startProgressSimulation = useCallback(() => {
    let step = 0;
    setProgress(5);
    setStatusMessage(PROGRESS_MESSAGES[0]);

    progressTimer.current = setInterval(() => {
      step++;
      const pct = Math.min(90, step * 15);
      setProgress(pct);
      const msgIdx = Math.min(step, PROGRESS_MESSAGES.length - 1);
      setStatusMessage(PROGRESS_MESSAGES[msgIdx]);
    }, 12000);
  }, []);

  const stopProgressSimulation = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) return;

    setStatus("generating");
    setError("");
    setProgress(0);
    startProgressSimulation();

    try {
      const response = await fetch("/api/generate-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          deckType,
          documents: useDefaultDocs && documents.length === 0 ? ["USE_DEFAULT_DOCS"] : documents,
          brandConfig: brand,
        }),
      });

      stopProgressSimulation();

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate deck");
      }

      setProgress(100);
      setStatusMessage("Done!");
      setStatus("success");

      // Trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "pitch_deck.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      stopProgressSimulation();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-base font-semibold">
          Describe the pitch deck you want
        </Label>
        <Textarea
          id="prompt"
          placeholder="e.g., Pitch for a fintech company expanding to Latin America, focus on ROI and market opportunity..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
          required
        />
      </div>

      {/* Deck Type */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Deck type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="deckType"
              value="pitch-15"
              checked={deckType === "pitch-15"}
              onChange={() => setDeckType("pitch-15")}
              className="accent-blue-600"
            />
            <span className="text-sm">Full Pitch (15 slides)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="deckType"
              value="one-pager"
              checked={deckType === "one-pager"}
              onChange={() => setDeckType("one-pager")}
              className="accent-blue-600"
            />
            <span className="text-sm">One-Pager (1 slide)</span>
          </label>
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Sales documents</Label>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={useDefaultDocs}
            onChange={(e) => setUseDefaultDocs(e.target.checked)}
            className="accent-blue-600"
          />
          <span className="text-sm text-gray-600">
            Use pre-loaded EBANX sales documents
          </span>
        </label>
        <DocumentUploader
          documents={documents}
          onDocumentsChange={setDocuments}
        />
      </div>

      {/* Branding */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowBranding(!showBranding)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showBranding ? "Hide" : "Customize"} branding options
        </button>

        {showBranding && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                <Input
                  id="companyName"
                  value={brand.companyName}
                  onChange={(e) => setBrand({ ...brand, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="primaryColor" className="text-xs">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brand.primaryColor}
                    onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    id="primaryColor"
                    value={brand.primaryColor}
                    onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="secondaryColor" className="text-xs">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brand.secondaryColor}
                    onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    id="secondaryColor"
                    value={brand.secondaryColor}
                    onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="titleFont" className="text-xs">Title Font</Label>
                <Input
                  id="titleFont"
                  value={brand.titleFont}
                  onChange={(e) => setBrand({ ...brand, titleFont: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bodyFont" className="text-xs">Body Font</Label>
                <Input
                  id="bodyFont"
                  value={brand.bodyFont}
                  onChange={(e) => setBrand({ ...brand, bodyFont: e.target.value })}
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={status === "generating" || !prompt.trim()}
        className="w-full h-12 text-base font-semibold bg-[#002750] hover:bg-[#003a75]"
      >
        {status === "generating" ? "Generating..." : "Generate Pitch Deck"}
      </Button>

      {/* Status */}
      <DeckPreview
        status={status}
        progress={progress}
        statusMessage={statusMessage}
        error={error}
      />
    </form>
  );
}
