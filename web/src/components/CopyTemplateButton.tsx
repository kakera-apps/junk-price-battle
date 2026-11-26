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
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition ${
        copied ? "border-green-600 bg-green-50 text-green-700" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
      }`}
    >
      {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
      {copied ? "コピーしました！" : label}
    </button>
  );
}
