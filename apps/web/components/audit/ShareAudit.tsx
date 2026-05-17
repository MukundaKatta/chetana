"use client";

import { useState, useCallback } from "react";

interface ShareAuditProps {
  auditId: string;
  auditTitle: string;
  score: number;
}

type Expiration = "7d" | "30d" | "permanent";

export function ShareAudit({ auditId, auditTitle, score }: ShareAuditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [includeResponses, setIncludeResponses] = useState(false);
  const [expiration, setExpiration] = useState<Expiration>("30d");
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${auditId}?include=${includeResponses ? "full" : "scores"}&exp=${expiration}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${auditTitle} - Consciousness Score: ${(score * 100).toFixed(1)}%`)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl"
            role="dialog"
            data-modal
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              data-modal-close
              aria-label="Close"
              className="absolute right-4 top-4 rounded p-1 text-gray-500 transition hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-white">Share Audit</h3>
            <p className="mt-1 text-sm text-gray-400">
              Share &ldquo;{auditTitle}&rdquo; with others.
            </p>

            {/* Options */}
            <div className="mt-5 space-y-4">
              {/* Include toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    Include probe responses
                  </div>
                  <div className="text-xs text-gray-500">
                    Share full responses or scores only
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeResponses(!includeResponses)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    includeResponses ? "bg-chetana-600" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      includeResponses ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Expiration */}
              <div>
                <div className="text-sm font-medium text-gray-200">
                  Link expiration
                </div>
                <div className="mt-2 flex gap-2">
                  {([
                    { value: "7d", label: "7 days" },
                    { value: "30d", label: "30 days" },
                    { value: "permanent", label: "Permanent" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExpiration(opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        expiration === opt.value
                          ? "bg-chetana-600/20 text-chetana-300 border border-chetana-500/30"
                          : "border border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copy URL */}
              <div>
                <div className="text-sm font-medium text-gray-200 mb-2">
                  Shareable URL
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-lg bg-chetana-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-chetana-500"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Social share */}
              <div>
                <div className="text-sm font-medium text-gray-200 mb-2">
                  Share on social
                </div>
                <div className="flex gap-2">
                  <a
                    href={twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    X / Twitter
                  </a>
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
