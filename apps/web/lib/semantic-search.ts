import type { ProbeDefinition, Theory, EvidenceType, IndicatorId } from "@chetana/shared";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  probe: ProbeDefinition;
  relevanceScore: number;
  matchedTerms: string[];
  snippet: string;
}

export interface SearchFilters {
  theory?: Theory;
  indicatorId?: IndicatorId;
  evidenceType?: EvidenceType;
  minRelevance?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
  fuzzyTolerance?: number;
}

export interface SavedSearch {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: string;
}

export interface SearchIndex {
  probeId: string;
  terms: Map<string, number>; // term -> TF-IDF weight
  totalTerms: number;
}

/* ------------------------------------------------------------------ */
/*  Text processing                                                   */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare",
  "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "and", "but", "or", "nor", "if", "that", "this", "it", "its", "your",
  "you", "we", "they", "them", "their", "what", "which", "who", "whom",
]);

function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function extractSnippet(text: string, matchedTerms: string[], maxLength: number = 150): string {
  const lower = text.toLowerCase();
  let bestPos = 0;
  let bestScore = 0;

  for (let i = 0; i < lower.length - 50; i += 10) {
    const window = lower.slice(i, i + maxLength);
    const score = matchedTerms.filter((t) => window.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestPos = i;
    }
  }

  const start = Math.max(0, bestPos);
  const end = Math.min(text.length, start + maxLength);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/* ------------------------------------------------------------------ */
/*  TF-IDF scoring                                                    */
/* ------------------------------------------------------------------ */

export function buildSearchIndex(probes: ProbeDefinition[]): SearchIndex[] {
  // Document frequency: how many probes contain each term
  const df = new Map<string, number>();
  const probeTerms: { probeId: string; terms: Map<string, number>; totalTerms: number }[] = [];

  for (const probe of probes) {
    const text = `${probe.name} ${probe.prompt} ${probe.scoringCriteria} ${probe.theory} ${probe.indicatorId}`;
    const tokens = tokenizeText(text);
    const tf = new Map<string, number>();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    // Update document frequency
    for (const term of tf.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }

    probeTerms.push({ probeId: probe.id, terms: tf, totalTerms: tokens.length });
  }

  // Compute TF-IDF
  const N = probes.length;
  return probeTerms.map(({ probeId, terms, totalTerms }) => {
    const tfidfTerms = new Map<string, number>();

    for (const [term, count] of terms) {
      const tf = count / Math.max(1, totalTerms);
      const idf = Math.log((N + 1) / ((df.get(term) ?? 0) + 1)) + 1;
      tfidfTerms.set(term, tf * idf);
    }

    return { probeId, terms: tfidfTerms, totalTerms };
  });
}

/* ------------------------------------------------------------------ */
/*  Fuzzy matching (Levenshtein)                                      */
/* ------------------------------------------------------------------ */

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function fuzzyMatch(query: string, target: string, tolerance: number): boolean {
  if (target.includes(query)) return true;
  if (query.length <= 2) return query === target;
  const maxDist = Math.floor(query.length * tolerance);
  return levenshteinDistance(query, target) <= maxDist;
}

/* ------------------------------------------------------------------ */
/*  Search engine                                                     */
/* ------------------------------------------------------------------ */

export class ProbeSearchEngine {
  private probes: ProbeDefinition[];
  private index: SearchIndex[];
  private recentSearches: SavedSearch[] = [];
  private savedSearches: SavedSearch[] = [];

  constructor(probes: ProbeDefinition[]) {
    this.probes = probes;
    this.index = buildSearchIndex(probes);
  }

  search(options: SearchOptions): SearchResult[] {
    const { query, filters, maxResults = 20, fuzzyTolerance = 0.3 } = options;
    const queryTerms = tokenizeText(query);

    if (queryTerms.length === 0 && !filters) return [];

    // Track as recent search
    this.recentSearches.unshift({
      id: `search-${Date.now()}`,
      query,
      filters: filters ?? {},
      timestamp: new Date().toISOString(),
    });
    if (this.recentSearches.length > 50) this.recentSearches.pop();

    // Apply filters first
    let candidates = this.probes;
    if (filters?.theory) {
      candidates = candidates.filter((p) => p.theory === filters.theory);
    }
    if (filters?.indicatorId) {
      candidates = candidates.filter((p) => p.indicatorId === filters.indicatorId);
    }
    if (filters?.evidenceType) {
      candidates = candidates.filter((p) => p.evidenceType === filters.evidenceType);
    }

    const candidateIds = new Set(candidates.map((p) => p.id));

    // Score each candidate
    const results: SearchResult[] = [];

    for (const idx of this.index) {
      if (!candidateIds.has(idx.probeId)) continue;

      const probe = this.probes.find((p) => p.id === idx.probeId);
      if (!probe) continue;

      let score = 0;
      const matchedTerms: string[] = [];

      for (const queryTerm of queryTerms) {
        // Exact match in index
        const tfidf = idx.terms.get(queryTerm);
        if (tfidf !== undefined) {
          score += tfidf;
          matchedTerms.push(queryTerm);
          continue;
        }

        // Fuzzy match
        for (const [indexTerm, weight] of idx.terms) {
          if (fuzzyMatch(queryTerm, indexTerm, fuzzyTolerance)) {
            score += weight * 0.7; // Discount for fuzzy match
            matchedTerms.push(indexTerm);
            break;
          }
        }
      }

      // Name boost
      const nameLower = probe.name.toLowerCase();
      for (const qt of queryTerms) {
        if (nameLower.includes(qt)) score *= 1.5;
      }

      if (score > 0 || (queryTerms.length === 0 && candidateIds.has(probe.id))) {
        const relevanceScore = queryTerms.length > 0 ? score : 1;

        if (filters?.minRelevance === undefined || relevanceScore >= filters.minRelevance) {
          const probeText = `${probe.name} — ${probe.prompt}`;
          results.push({
            probe,
            relevanceScore,
            matchedTerms: [...new Set(matchedTerms)],
            snippet: extractSnippet(probeText, matchedTerms),
          });
        }
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, maxResults);
  }

  /* ---- Saved / recent searches ---- */

  saveSearch(query: string, filters: SearchFilters): SavedSearch {
    const saved: SavedSearch = {
      id: `saved-${Date.now()}`,
      query,
      filters,
      timestamp: new Date().toISOString(),
    };
    this.savedSearches.push(saved);
    return saved;
  }

  removeSavedSearch(id: string): void {
    this.savedSearches = this.savedSearches.filter((s) => s.id !== id);
  }

  getRecentSearches(): readonly SavedSearch[] {
    return this.recentSearches;
  }

  getSavedSearches(): readonly SavedSearch[] {
    return this.savedSearches;
  }

  /* ---- Rebuild index ---- */

  rebuildIndex(probes: ProbeDefinition[]): void {
    this.probes = probes;
    this.index = buildSearchIndex(probes);
  }
}
