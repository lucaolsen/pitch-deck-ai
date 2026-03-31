"use client";

import { useCallback, useRef, useState } from "react";

interface DocumentUploaderProps {
  documents: string[];
  onDocumentsChange: (docs: string[]) => void;
}

interface UploadedFile {
  name: string;
  content: string;
}

export function DocumentUploader({
  documents,
  onDocumentsChange,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = [];
      for (const file of Array.from(fileList)) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["txt", "md", "csv"].includes(ext || "")) continue;
        const content = await readFile(file);
        newFiles.push({ name: file.name, content });
      }
      const updated = [...files, ...newFiles];
      setFiles(updated);
      onDocumentsChange([...documents, ...newFiles.map((f) => f.content)]);
    },
    [files, documents, onDocumentsChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onDocumentsChange(updatedFiles.map((f) => f.content));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#000E2B] mb-1">Custom Documents</h2>
        <p className="text-sm text-[#5A6880]">
          Upload your own PDFs, CSVs, or markdown files to be analyzed alongside or instead of the base documents.
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[var(--ebanx-blue)] bg-[var(--ebanx-blue)]/5"
            : "border-[rgba(0,14,43,0.15)] bg-[#F4F6FF] hover:border-[var(--ebanx-blue)]/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,.csv"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[rgba(0,14,43,0.06)] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A6880" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#000E2B] mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-[#5A6880]">
            TXT, MD, or CSV (max. 10MB)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,14,43,0.10)] bg-white text-sm animate-fade-in"
            >
              <div className="flex items-center gap-3 min-w-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ebanx-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                <span className="truncate font-medium text-[#000E2B]">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#EEF1FA] text-[#5A6880] hover:text-[#000E2B] transition-colors shrink-0"
                title="Remove document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
