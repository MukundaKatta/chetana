/**
 * Custom metric builder (issue #733).
 *
 * Safely evaluates a user-defined arithmetic expression over named indicator/
 * theory scores. Supports + - * / ( ), numbers, and identifiers bound from the
 * provided scope, plus min()/max()/avg() helpers — no arbitrary code execution.
 */

type Token = { type: "num" | "id" | "op" | "paren" | "comma"; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*([A-Za-z_][A-Za-z0-9_.]*|\d+\.?\d*|[-+*/(),])/g;
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = re.exec(expr)) !== null) {
    if (m.index !== lastIndex) throw new Error(`Unexpected token near "${expr.slice(lastIndex, m.index)}"`);
    lastIndex = re.lastIndex;
    const v = m[1];
    if (/^\d/.test(v)) tokens.push({ type: "num", value: v });
    else if (/^[A-Za-z_]/.test(v)) tokens.push({ type: "id", value: v });
    else if (v === "(" || v === ")") tokens.push({ type: "paren", value: v });
    else if (v === ",") tokens.push({ type: "comma", value: v });
    else tokens.push({ type: "op", value: v });
  }
  if (lastIndex !== expr.length) throw new Error(`Unexpected token near "${expr.slice(lastIndex)}"`);
  return tokens;
}

const FUNCS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  avg: (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0),
  sqrt: (a) => Math.sqrt(a[0]),
  abs: (a) => Math.abs(a[0]),
};

/** Recursive-descent parser/evaluator for a safe arithmetic grammar. */
export function evaluateMetric(expr: string, scope: Record<string, number>): number {
  const tokens = tokenize(expr);
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): number {
    let v = parseTerm();
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = next().value;
      const rhs = parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = next().value;
      const rhs = parseFactor();
      v = op === "*" ? v * rhs : v / rhs;
    }
    return v;
  }
  function parseFactor(): number {
    const t = peek();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.type === "op" && t.value === "-") { next(); return -parseFactor(); }
    if (t.type === "num") { next(); return parseFloat(t.value); }
    if (t.type === "paren" && t.value === "(") {
      next();
      const v = parseExpr();
      if (!peek() || peek().value !== ")") throw new Error("Expected )");
      next();
      return v;
    }
    if (t.type === "id") {
      next();
      // Function call?
      if (peek() && peek().type === "paren" && peek().value === "(") {
        next();
        const args: number[] = [];
        if (peek() && peek().value !== ")") {
          args.push(parseExpr());
          while (peek() && peek().type === "comma") { next(); args.push(parseExpr()); }
        }
        if (!peek() || peek().value !== ")") throw new Error("Expected )");
        next();
        const fn = FUNCS[t.value];
        if (!fn) throw new Error(`Unknown function "${t.value}"`);
        return fn(args);
      }
      if (!(t.value in scope)) throw new Error(`Unknown identifier "${t.value}"`);
      return scope[t.value];
    }
    throw new Error(`Unexpected token "${t.value}"`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error("Unexpected trailing tokens");
  return Math.round(result * 10000) / 10000;
}

/** Validate an expression against an allowed identifier set without evaluating. */
export function validateMetric(expr: string, allowedIds: string[]): { valid: boolean; error?: string } {
  try {
    const scope = Object.fromEntries(allowedIds.map((id) => [id, 0]));
    evaluateMetric(expr, scope);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
