import { CitationTool } from "@/components/research/CitationTool";

/**
 * Citation & export page (issues #628, #629, #633). Generates standardized,
 * citable exports of an audit (BibTeX + JSON-LD) for reproducible research.
 */
export const metadata = {
  title: "Cite & Export — Chetana",
  description: "Generate BibTeX and JSON-LD exports for consciousness audits.",
};

export default function CitePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Cite &amp; Export</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Reproducible-research exports for an audit: a BibTeX entry for citation
          and a standardized JSON-LD document for machine-readable sharing. Every
          audit can also emit a reproducibility manifest and a probe-set dataset card.
        </p>
      </header>
      <CitationTool />
    </div>
  );
}
