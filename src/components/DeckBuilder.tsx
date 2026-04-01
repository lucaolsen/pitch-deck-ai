"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DEFAULT_BRAND_CONFIG } from "@/types/deck";
import type { BrandConfig } from "@/types/deck";
import { DocumentUploader } from "@/components/DocumentUploader";

type Status = "idle" | "generating" | "success" | "error";
type Tab = "output" | "documents" | "branding" | "history";

export interface DeckHistoryEntry {
  id: string;
  fileName: string;
  downloadUrl: string;
  createdAt: number;
  clientName: string;
  rating: number; // 0-5
  feedback: string;
  performance: "pending" | "won" | "lost" | "ongoing";
}

const COUNTRIES = ["Brazil", "Mexico", "Colombia", "Chile", "Argentina", "Peru", "All LATAM"];
const VERTICALS = ["SaaS", "Retail / E-commerce", "Gaming", "Digital Goods", "Travel", "Financial Services", "Streaming"];
const PERSONAS = [
  "Expansion Driver",
  "Payment Optimizer",
  "CFO / Finance Leader",
  "Product Manager",
  "Head of Growth",
  "General Decision Maker",
];
const OUTPUT_FORMATS = [
  { value: "pitch-5", label: "Pitch deck (5 slides)" },
  { value: "modular", label: "Modular (2–5 slides, AI decides)" },
  { value: "one-pager", label: "One-pager (1 slide)" },
] as const;

const PRELOADED_DOCS = [
  { file: "00_ebanx_visual_guide.md", name: "EBANX Visual Guide", description: "Official color palette, design system and slide template reference" },
  { file: "02_icp_playbook.md", name: "ICP Playbook", description: "Ideal customer profiles and targeting" },
  { file: "03_value_pillars.md", name: "Value Pillars", description: "Core value propositions and differentiators" },
  { file: "04_industries_sales_deck.md", name: "Industries Sales Deck", description: "Industry-specific sales material" },
  { file: "05_latam_sales_deck.md", name: "LATAM Sales Deck", description: "Detailed country-level market data: Brazil, Mexico, Colombia, Chile, Argentina, Peru" },
  { file: "06_latam_modular_sales_deck.md", name: "LATAM Modular Sales Deck", description: "Latin America modular sales deck with market data and country insights" },
];

const PROGRESS_MESSAGES = [
  "Analyzing sales documents...",
  "Identifying key metrics and insights...",
  "Structuring slide content...",
  "Generating presentation layout...",
  "Applying EBANX branding...",
  "Finalizing deck...",
];

const METHODOLOGIES = [
  {
    id: "SPIN Selling",
    label: "SPIN Selling",
    items: [
      { letter: "S", label: "Situation questions", color: "bg-[var(--ebanx-blue)] text-white" },
      { letter: "P", label: "Problem questions", color: "bg-[#1A3FC0] text-white" },
      { letter: "I", label: "Implication questions", color: "bg-[#0F2B8A] text-white" },
      { letter: "N", label: "Need-payoff questions", color: "bg-[#091D5E] text-white" },
    ],
  },
  {
    id: "BANT",
    label: "BANT Qualification",
    items: [
      { letter: "B", label: "Budget", color: "bg-[var(--ebanx-green)] text-[#000E2B]" },
      { letter: "A", label: "Authority", color: "bg-[#38C0A0] text-[#000E2B]" },
      { letter: "N", label: "Need", color: "bg-[#22907A] text-white" },
      { letter: "T", label: "Timeline", color: "bg-[#156050] text-white" },
    ],
  },
  {
    id: "Challenger Sale",
    label: "Challenger Sale",
    items: [
      { letter: "T", label: "Teach (Ensinar)", color: "bg-[var(--ebanx-purple)] text-white" },
      { letter: "T", label: "Tailor (Adaptar)", color: "bg-[#7B3CC0] text-white" },
      { letter: "T", label: "Take Control", color: "bg-[#531DBD] text-white" },
    ],
  },
  {
    id: "MEDDPICC",
    label: "MEDDPICC",
    items: [
      { letter: "M", label: "Metrics", color: "bg-[var(--ebanx-lightblue)] text-[#000E2B]" },
      { letter: "E", label: "Economic Buyer", color: "bg-[#309BE0] text-white" },
      { letter: "D", label: "Decision Criteria", color: "bg-[#1E7AB5] text-white" },
      { letter: "D", label: "Decision Process", color: "bg-[#125A88] text-white" },
      { letter: "P", label: "Paper Process", color: "bg-[#0D4268] text-white" },
      { letter: "I", label: "Identify Pain", color: "bg-[#092E4A] text-white" },
      { letter: "C", label: "Champion", color: "bg-[#061E30] text-white" },
      { letter: "C", label: "Competition", color: "bg-[#040F1A] text-white" },
    ],
  },
];

const FONTS = [
  "Inter",
  "Roboto",
  "Outfit",
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
];

export function DeckBuilder() {
  // Form state
  const [sidebarTab, setSidebarTab] = useState<"guided" | "free-text">("guided");
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptHistory, setPromptHistory] = useState<{role: "user" | "assistant", content: string}[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [country, setCountry] = useState("Brazil");
  const [vertical, setVertical] = useState("SaaS");
  const [persona, setPersona] = useState("Expansion Driver");
  const [methodology, setMethodology] = useState(METHODOLOGIES[0].id);
  const [deckType, setDeckType] = useState<"one-pager" | "pitch-5" | "modular">("pitch-5");
  const [additionalContext, setAdditionalContext] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    new Set(PRELOADED_DOCS.map((d) => d.file))
  );
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [brand, setBrand] = useState<BrandConfig>({ ...DEFAULT_BRAND_CONFIG });

  const toggleDoc = (file: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  // Status state
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [genTime, setGenTime] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval>>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("output");
  const [history, setHistory] = useState<DeckHistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.history) setHistory(data.history);
      })
      .catch(() => {});
  }, []);

  const addDeckToHistory = (entry: DeckHistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev];
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: next }),
      }).catch(() => {});
      return next;
    });
  };

  const updateDeckHistory = (id: string, updates: Partial<DeckHistoryEntry>) => {
    setHistory((prev) => {
      const next = prev.map((deck) => (deck.id === id ? { ...deck, ...updates } : deck));
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: next }),
      }).catch(() => {});
      return next;
    });
  };

  const startProgressSimulation = useCallback(() => {
    let step = 0;
    setProgress(5);
    setStatusMessage(PROGRESS_MESSAGES[0]);

    progressTimer.current = setInterval(() => {
      step++;
      const pct = Math.min(92, 5 + step * 12);
      setProgress(pct);
      const msgIdx = Math.min(step, PROGRESS_MESSAGES.length - 1);
      setStatusMessage(PROGRESS_MESSAGES[msgIdx]);
    }, 15000);
  }, []);

  const stopProgressSimulation = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const buildPrompt = () => {
    if (sidebarTab === "free-text") {
      return customPrompt || "Create a general EBANX sales pitch deck based on the provided documents.";
    }

    return `Create a sales pitch deck for ${country} market, targeting the ${vertical} vertical.
The audience persona is: ${persona}.
Apply the ${methodology} sales methodology to structure the argumentation and flow of the presentation.
${additionalContext ? `\nAdditional context: ${additionalContext}` : ""}
Focus on relevant metrics, case studies, and value propositions for this specific market and vertical.`;
  };

  const handleGenerate = async () => {
    let finalPrompt = buildPrompt();
    let finalDocs = selectedDocs;

    if (sidebarTab === "free-text") {
      if (!customPrompt.trim() && promptHistory.length === 0) return;
      
      setStatus("generating");
      setError("");
      setStatusMessage("Evaluating prompt needs...");
      setActiveTab("output");
      setIsOptimizing(true);
      
      try {
        const newHistory = [...promptHistory];
        if (customPrompt.trim()) {
          newHistory.push({ role: "user", content: customPrompt });
        }
        
        const response = await fetch("/api/optimize-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newHistory }),
        });
        
        if (!response.ok) throw new Error("Prompt optimization failed");
        
        const result = await response.json();
        
        if (result.status === "needs_info") {
          setIsOptimizing(false);
          setPromptHistory([...newHistory, { role: "assistant", content: result.message }]);
          setCustomPrompt("");
          setStatus("idle");
          setSidebarTab("free-text");
          return;
        }
        
        if (result.status === "ready") {
          finalPrompt = result.optimizedPrompt;
          if (Array.isArray(result.selectedDocs)) {
            finalDocs = new Set(result.selectedDocs);
            setSelectedDocs(finalDocs);
          }
          setPromptHistory([]);
          setCustomPrompt(finalPrompt);
          setIsOptimizing(false);
        }
      } catch (err) {
        setIsOptimizing(false);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to parse intent");
        return;
      }
    }

    setStatus("generating");
    setError("");
    setProgress(0);
    setDownloadUrl(null);
    setFileName(null);
    setFileSize(null);
    setGenTime(null);
    setActiveTab("output");
    startProgressSimulation();

    try {
      const response = await fetch("/api/generate-deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          deckType,
          documents: [
            ...(finalDocs.size > 0
              ? Array.from(finalDocs).map((f) => `DEFAULT_DOC:${f}`)
              : []),
            ...uploadedDocs,
          ],
          brandConfig: brand,
        }),
      });

      let result = await response.json();

      if (response.status === 202 && result.jobId) {
        setStatusMessage("Queued for compilation...");

        // Polling loop — 5s interval, max 6 min
        let pollCount = 0;
        const maxPolls = 72; // 6 minutes (72 * 5s)
        const MESSAGES = [
          "Analyzing documents...",
          "Structuring slides...",
          "Generating presentation...",
          "Applying EBANX branding...",
          "Running code execution...",
          "Finalizing deck...",
        ];

        while (pollCount < maxPolls) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          pollCount++;

          const msgIdx = Math.min(Math.floor(pollCount / 4), MESSAGES.length - 1);
          setStatusMessage(`${MESSAGES[msgIdx]} (${Math.round(pollCount * 5 / 60)}m${(pollCount * 5) % 60}s)`);

          let job: { status: string; error?: string; downloadUrl?: string; fileName?: string; fileSize?: number; generationTime?: number };
          try {
            const statusRes = await fetch(`/api/generate-deck/status/${result.jobId}`);
            if (!statusRes.ok) continue; // transient error — keep polling
            job = await statusRes.json();
          } catch {
            continue; // network hiccup — keep polling
          }

          if (job.status === "failed") {
            throw new Error(job.error || "Generation failed during processing");
          }

          if (job.status === "completed") {
            result = job;
            break;
          }
        }

        if (pollCount >= maxPolls) {
          throw new Error("Generation timed out. Try using Modular or One-pager format, or deselect some base documents.");
        }
      } else if (!response.ok) {
        throw new Error(result.error || "Failed to generate deck");
      }

      stopProgressSimulation();

      if (!result.downloadUrl) {
        throw new Error(result.error || "Generation failed");
      }

      setProgress(100);
      setStatusMessage("Done!");
      setStatus("success");
      setDownloadUrl(result.downloadUrl);
      setFileName(result.fileName);
      setFileSize(result.fileSize);
      setGenTime(result.generationTime);

      const newEntry: DeckHistoryEntry = {
        id: Date.now().toString(),
        fileName: result.fileName || "unknown.pptx",
        downloadUrl: result.downloadUrl || "",
        createdAt: Date.now(),
        clientName: "",
        rating: 0,
        feedback: "",
        performance: "pending"
      };
      addDeckToHistory(newEntry);
    } catch (err) {
      stopProgressSimulation();
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fileName || "pitch_deck.pptx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-[380px] shrink-0 border-r border-[rgba(0,14,43,0.10)] flex flex-col bg-white">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[rgba(0,14,43,0.10)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #2752FE 0%, #1A3FC0 100%)" }}>
              <span className="text-white text-[11px] font-black tracking-widest">EB</span>
            </div>
            <div>
              <h1 className="text-[16px] font-black text-[#000E2B] leading-tight tracking-wide uppercase">
                EBANX
              </h1>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--ebanx-blue)" }}>
                Sales AI
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="px-6 py-3 border-b border-[rgba(0,14,43,0.10)] flex gap-2">
          <button
            onClick={() => setSidebarTab("guided")}
            className={`flex-1 h-8 rounded-md text-[11px] font-semibold tracking-wider uppercase transition-colors ${
              sidebarTab === "guided"
                ? "bg-[#2752FE] text-white shadow-sm"
                : "bg-transparent text-[#5A6880] hover:text-[#000E2B] hover:bg-[#EEF1FA] border border-transparent"
            }`}
          >
            Guided
          </button>
          <button
            onClick={() => setSidebarTab("free-text")}
            className={`flex-1 h-8 rounded-md text-[11px] font-semibold tracking-wider uppercase transition-colors ${
              sidebarTab === "free-text"
                ? "bg-[#2752FE] text-white shadow-sm"
                : "bg-transparent text-[#5A6880] hover:text-[#000E2B] hover:bg-[#EEF1FA] border border-transparent"
            }`}
          >
            Free Text
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {sidebarTab === "guided" && (
            <>
          {/* Country */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Vertical */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Vertical
            </label>
            <select
              value={vertical}
              onChange={(e) => setVertical(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            >
              {VERTICALS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Persona */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Persona
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            >
              {PERSONAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Output Format */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Output Format
            </label>
            <select
              value={deckType}
              onChange={(e) => setDeckType(e.target.value as "one-pager" | "pitch-5" | "modular")}
              className="w-full h-11 px-3 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            >
              {OUTPUT_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Sales Methodology */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Sales Methodology
            </label>
            <select
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            >
              {METHODOLOGIES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Additional Context */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
              Additional Context
              <span className="text-[#5A6880]/60 ml-1 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="e.g., Focus on ROI metrics, mention competitor X..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] placeholder:text-[#000E2B]/30 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors hover:bg-[#EEF1FA]"
            />
          </div>

          {/* Dynamic Methodology Engine */}
          <div className="rounded-lg border border-[rgba(0,14,43,0.10)] bg-[#F4F6FF] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#5A6880]">
              {METHODOLOGIES.find(m => m.id === methodology)?.label} engine
            </p>
            <div className="space-y-2">
              {METHODOLOGIES.find(m => m.id === methodology)?.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-md ${item.color} flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border border-white/20`}>
                    {item.letter}
                  </div>
                  <span className="text-[13px] text-[#000E2B]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
            </>
          )}

          {sidebarTab === "free-text" && (
            <div className="h-full flex flex-col space-y-3 pb-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
                Custom Prompt Builder
              </label>

              {promptHistory.length > 0 && (
                <div className="flex-1 overflow-y-auto space-y-3 mb-2 p-3 bg-[#F4F6FF] rounded-lg border border-[rgba(0,14,43,0.10)]">
                  {promptHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-semibold text-[#5A6880] mb-1 uppercase tracking-wider">
                        {msg.role === "user" ? "You" : "AI Optimizer"}
                      </span>
                      <div className={`p-3 rounded-xl max-w-[90%] text-sm ${
                        msg.role === "user"
                          ? "bg-[var(--ebanx-blue)] text-white rounded-br-none"
                          : "bg-white text-[#000E2B] rounded-bl-none border border-[rgba(0,14,43,0.10)]"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={promptHistory.length > 0 ? "Answer the AI's question to continue..." : "Describe exactly what kind of pitch deck you want. e.g., 'Make a 5-slide deck focusing on the pain points of a CFO in the gaming industry in Mexico.'"}
                className={`w-full p-4 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] placeholder:text-[#000E2B]/30 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors ${promptHistory.length > 0 ? "min-h-[120px]" : "min-h-[400px]"}`}
                style={promptHistory.length > 0 ? undefined : { height: "400px" }}
              />
              {promptHistory.length === 0 && (
                <p className="text-xs text-[#5A6880] leading-relaxed pt-2">
                  This prompt replaces the Guided parameters. The AI may ask you follow-up questions to gather necessary context before generating.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="px-6 py-4 border-t border-[rgba(0,14,43,0.10)]">
          <button
            onClick={handleGenerate}
            disabled={status === "generating"}
            className="w-full h-12 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] uppercase tracking-wider"
            style={{ background: "linear-gradient(90deg, #2752FE 0%, #1A3FC0 100%)" }}
          >
            {status === "generating" ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isOptimizing ? "Evaluating..." : "Generating..."}
              </>
            ) : (
              <>
                {sidebarTab === "free-text" && promptHistory.length > 0 ? "Answer & Continue" : "Generate content"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ─── RIGHT PANEL ─── */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Tab Bar */}
        <div className="border-b border-[rgba(0,14,43,0.10)] px-6 bg-white">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "output" as Tab, label: "Output" },
                { id: "documents" as Tab, label: "Documents" },
                { id: "branding" as Tab, label: "Branding" },
                { id: "history" as Tab, label: "Performance & History" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? "text-[#000E2B]"
                    : "text-[#8494BC] hover:text-[#000E2B]"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--ebanx-blue)] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── OUTPUT TAB ─── */}
          {activeTab === "output" && (
            <div className="h-full flex items-center justify-center p-8">
              {/* Idle state */}
              {status === "idle" && (
                <div className="text-center animate-fade-in max-w-md">
                  <div className="w-14 h-14 rounded-xl bg-[#EEF1FA] border border-[rgba(0,14,43,0.08)] flex items-center justify-center mx-auto mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ebanx-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                      <path d="M7 8h2M7 12h5" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-[#000E2B] mb-2">
                    Ready to generate
                  </h2>
                  <p className="text-sm text-[#5A6880] leading-relaxed">
                    Select your parameters on the left and click
                    &ldquo;Generate content&rdquo; to produce a tailored sales
                    piece.
                  </p>
                </div>
              )}

              {/* Generating state */}
              {status === "generating" && (
                <div className="w-full max-w-lg animate-fade-in space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#EEF1FA] border border-[rgba(0,14,43,0.08)] flex items-center justify-center mx-auto mb-5 animate-pulse-glow">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="animate-spin" style={{ animationDuration: "3s" }}>
                        <circle cx="12" cy="12" r="10" stroke="#E0E8FF" strokeWidth="2" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--ebanx-blue)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-[#000E2B] mb-1">
                      {statusMessage}
                    </h2>
                    <p className="text-xs text-[#5A6880]">
                      This usually takes 2–8 minutes for a full deck
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="w-full h-1.5 rounded-full bg-[#E0E8FF] overflow-hidden">
                      <div
                        className="h-full rounded-full progress-bar-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#5A6880]">
                      <span>{statusMessage}</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success state */}
              {status === "success" && downloadUrl && (
                <div className="w-full max-w-lg animate-slide-up">
                  <div className="rounded-xl border border-[rgba(0,14,43,0.10)] bg-white shadow-sm overflow-hidden">
                    {/* Success header */}
                    <div className="px-6 py-5 border-b border-[rgba(0,14,43,0.08)] flex items-center gap-3 bg-[#F4F6FF]">
                      <div className="w-10 h-10 rounded-lg bg-[var(--ebanx-green)]/15 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ebanx-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#000E2B]">Deck generated successfully</h3>
                        <p className="text-xs text-[#5A6880]">
                          {genTime ? `Completed in ${formatTime(genTime)}` : "Ready to download"}
                        </p>
                      </div>
                    </div>

                    {/* File card */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-[#F4F6FF] border border-[rgba(0,14,43,0.08)]">
                        <div className="w-12 h-12 rounded-lg bg-[var(--ebanx-blue)]/10 flex items-center justify-center shrink-0">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ebanx-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#000E2B] truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-[#5A6880]">
                            PPTX • {fileSize ? formatFileSize(fileSize) : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleDownload}
                        className="w-full mt-4 h-11 rounded-lg bg-[var(--ebanx-blue)] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download deck
                      </button>

                      <button
                        onClick={() => {
                          setStatus("idle");
                          setDownloadUrl(null);
                        }}
                        className="w-full mt-2 h-9 rounded-lg text-[#5A6880] text-xs font-medium cursor-pointer transition-colors hover:text-[#000E2B] hover:bg-[#EEF1FA]"
                      >
                        Generate another
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {status === "error" && (
                <div className="w-full max-w-lg animate-fade-in">
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-red-400">
                          Failed to generate deck
                        </h3>
                        {error && (
                          <p className="text-xs text-red-400/70 mt-1 leading-relaxed">
                            {error}
                          </p>
                        )}
                        <button
                          onClick={() => { setStatus("idle"); setError(""); }}
                          className="mt-3 text-xs font-medium text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                        >
                          Try again →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── DOCUMENTS TAB ─── */}
          {activeTab === "documents" && (
            <div className="p-6 space-y-6 animate-fade-in">
              {/* Document Uploader Header & Component */}
              <DocumentUploader
                documents={uploadedDocs}
                onDocumentsChange={setUploadedDocs}
              />

              <div className="h-px bg-border my-8" />

              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#000E2B] mb-1">Base Documents</h2>
                  <p className="text-sm text-[#5A6880]">
                    Select which EBANX documents to include when generating your pitch deck.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-1">
                  <button
                    onClick={() => setSelectedDocs(new Set(PRELOADED_DOCS.map((d) => d.file)))}
                    className="text-[11px] font-medium text-[var(--ebanx-blue)] hover:brightness-125 cursor-pointer transition-all"
                  >
                    Select all
                  </button>
                  <span className="text-[#5A6880]">/</span>
                  <button
                    onClick={() => setSelectedDocs(new Set())}
                    className="text-[11px] font-medium text-[#5A6880] hover:text-[#000E2B] cursor-pointer transition-colors"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Selected count */}
              <p className="text-xs text-[#5A6880]">
                {selectedDocs.size} of {PRELOADED_DOCS.length} documents selected
              </p>

              {/* Document list with checkboxes */}
              <div className="space-y-3">
                {PRELOADED_DOCS.map((doc, i) => {
                  const isSelected = selectedDocs.has(doc.file);
                  return (
                    <button
                      type="button"
                      key={doc.file}
                      onClick={() => toggleDoc(doc.file)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left cursor-pointer transition-all animate-fade-in ${
                        isSelected
                          ? "border-[var(--ebanx-blue)]/40 bg-[var(--ebanx-blue)]/5"
                          : "border-[rgba(0,14,43,0.10)] bg-[#F4F6FF] opacity-60 hover:opacity-80"
                      }`}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? "bg-[var(--ebanx-blue)] border-[var(--ebanx-blue)]"
                          : "border-[rgba(0,14,43,0.25)] bg-transparent"
                      }`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-[var(--ebanx-blue)]/15" : "bg-[rgba(0,14,43,0.06)]"
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected ? "var(--ebanx-blue)" : "#5A6880"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium transition-colors ${isSelected ? "text-[#000E2B]" : "text-[#5A6880]"}`}>
                          {doc.name}
                        </p>
                        <p className="text-xs text-[#5A6880]">{doc.description}</p>
                      </div>

                      {/* File label */}
                      <span className="text-[10px] font-mono text-[#000E2B]/30 shrink-0">
                        {doc.file}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-[#5A6880] pt-2 pb-2">
                These base documents contain real EBANX sales data, case studies, and value propositions
                that the AI uses to generate data-driven pitch decks.
              </p>
            </div>
          )}

          {/* ─── BRANDING TAB ─── */}
          {activeTab === "branding" && (
            <div className="p-6 space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[#000E2B] mb-1">Brand Configuration</h2>
                <p className="text-sm text-[#5A6880]">
                  Colors and fonts used in generated presentations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Primary Color", key: "primaryColor" as keyof BrandConfig, value: brand.primaryColor },
                  { label: "Secondary Color", key: "secondaryColor" as keyof BrandConfig, value: brand.secondaryColor },
                  { label: "Background", key: "backgroundColor" as keyof BrandConfig, value: brand.backgroundColor },
                  { label: "Text Color", key: "textColor" as keyof BrandConfig, value: brand.textColor },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-lg border border-[rgba(0,14,43,0.10)] bg-[#F4F6FF] space-y-2 group focus-within:border-[var(--ebanx-blue)] transition-colors">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
                      {item.label}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-md border border-[rgba(0,14,43,0.15)] shrink-0 overflow-hidden cursor-pointer">
                        <input
                          type="color"
                          value={item.value}
                          onChange={(e) => setBrand({ ...brand, [item.key]: e.target.value })}
                          className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => setBrand({ ...brand, [item.key]: e.target.value })}
                        className="flex-1 w-full text-sm font-mono text-[#000E2B] bg-transparent border-none focus:outline-none placeholder:text-[#000E2B]/30 uppercase"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-[rgba(0,14,43,0.10)] bg-[#F4F6FF] space-y-2 focus-within:border-[var(--ebanx-blue)] transition-colors">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
                    Title Font
                  </label>
                  <select
                    value={brand.titleFont}
                    onChange={(e) => setBrand({ ...brand, titleFont: e.target.value })}
                    className="w-full text-sm text-[#000E2B] bg-transparent border-none appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] -ml-1 px-1 rounded"
                    style={{ fontFamily: brand.titleFont }}
                  >
                    {FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 rounded-lg border border-[rgba(0,14,43,0.10)] bg-[#F4F6FF] space-y-2 focus-within:border-[var(--ebanx-blue)] transition-colors">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6880]">
                    Body Font
                  </label>
                  <select
                    value={brand.bodyFont}
                    onChange={(e) => setBrand({ ...brand, bodyFont: e.target.value })}
                    className="w-full text-sm text-[#000E2B] bg-transparent border-none appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] -ml-1 px-1 rounded"
                    style={{ fontFamily: brand.bodyFont }}
                  >
                    {FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ─── HISTORY & PERFORMANCE TAB ─── */}
          {activeTab === "history" && (
            <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
              <div>
                <h2 className="text-lg font-semibold text-[#000E2B] mb-1">Performance & History</h2>
                <p className="text-sm text-[#5A6880]">
                  Track the decks you've generated, provide qualitative feedback, and measure long-term client outcomes to help the AI learn what converts.
                </p>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[rgba(0,14,43,0.15)] rounded-xl bg-[#F4F6FF]">
                  <p className="text-[#5A6880] text-sm">No decks generated yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((deck) => (
                    <div key={deck.id} className="p-5 rounded-xl border border-[rgba(0,14,43,0.10)] bg-white shadow-sm space-y-4">
                      {/* File Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--ebanx-blue)]/10 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ebanx-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div>
                            <a href={deck.downloadUrl} download={deck.fileName} className="text-sm font-semibold text-[#000E2B] hover:text-[var(--ebanx-blue)] hover:underline transition-colors block">
                              {deck.fileName}
                            </a>
                            <p className="text-xs text-[#5A6880] mt-0.5">
                              Generated {new Date(deck.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          deck.performance === "won" ? "bg-green-500/15 text-green-600 border border-green-500/30" :
                          deck.performance === "lost" ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                          deck.performance === "ongoing" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                          "bg-[#F4F6FF] text-[#5A6880] border border-[rgba(0,14,43,0.10)]"
                        }`}>
                          {deck.performance === "won" ? "Closed Won" : deck.performance}
                        </span>
                      </div>

                      <div className="h-px bg-[rgba(0,14,43,0.08)]" />

                      {/* Analytics Form */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6880]">
                              Target Client
                            </label>
                            <input
                              type="text"
                              value={deck.clientName}
                              onChange={(e) => updateDeckHistory(deck.id, { clientName: e.target.value })}
                              placeholder="e.g., Netflix, Spotify..."
                              className="w-full h-9 px-3 rounded-md bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] placeholder:text-[#000E2B]/30 focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6880]">
                              Generation Output Quality (1-5)
                            </label>
                            <div className="flex items-center gap-1.5 pt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => updateDeckHistory(deck.id, { rating: star })}
                                  className="focus:outline-none transition-transform hover:scale-110"
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill={deck.rating >= star ? "var(--ebanx-blue)" : "none"} stroke={deck.rating >= star ? "var(--ebanx-blue)" : "rgba(0,14,43,0.25)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6880]">
                              Long-term Deal Performance
                            </label>
                            <select
                              value={deck.performance}
                              onChange={(e) => updateDeckHistory(deck.id, { performance: e.target.value as DeckHistoryEntry["performance"] })}
                              className="w-full h-9 px-3 rounded-md bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-sm text-[#000E2B] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors"
                            >
                              <option value="pending">Pending</option>
                              <option value="ongoing">Active / Ongoing Validation</option>
                              <option value="won">Closed Won 🏆</option>
                              <option value="lost">Lost</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1 h-full flex flex-col">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6880]">
                            Qualitative Feedback / Deal Context
                          </label>
                          <textarea
                            value={deck.feedback}
                            onChange={(e) => updateDeckHistory(deck.id, { feedback: e.target.value })}
                            placeholder="How did the client react? What worked and what failed in this presentation? This text will be used to automatically train future AI models."
                            className="flex-1 w-full min-h-[100px] p-3 rounded-md bg-[#F4F6FF] border border-[rgba(0,14,43,0.12)] text-xs text-[#000E2B] placeholder:text-[#000E2B]/30 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ebanx-blue)] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
