"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";

export default function CopyTemplateButton({ text, label = "出品用テンプレをコピー" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition duration-150 ${
        copied
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50"
      }`}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <ClipboardCopy size={16} aria-hidden="true" />}
      <span>{copied ? "コピーしました！" : label}</span>
    </button>
  );
}
