"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

export function CopySnippetButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? Check : Clipboard;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copySnippet}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition hover:border-scope-blue hover:text-scope-blue"
      title={copied ? "Copied" : "Copy snippet"}
      aria-label={copied ? "Copied" : "Copy snippet"}
    >
      <Icon size={15} />
    </button>
  );
}
