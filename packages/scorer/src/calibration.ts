/**
 * Score calibration against human-rater ground truth (issue #604).
 *
 * Calibrates judge-model scores onto a human scale and reports calibration
 * error. Uses a lightweight isotonic-style monotonic fit plus Expected
 * Calibration Error (ECE).
 */

export interface CalibrationPair {
  judge: number; // 0-1
  human: number; // 0-1
}

export interface CalibrationModel {
  /** Sorted breakpoints of a monotonic mapping judge -> human. */
  points: { x: number; y: number }[];
}

function round(n: number, d = 4): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Pool-Adjacent-Violators (PAV) isotonic regression producing a monotonic
 * non-decreasing mapping from judge scores to human scores.
 */
export function fitCalibration(pairs: CalibrationPair[]): CalibrationModel {
  if (pairs.length === 0) return { points: [] };
  const sorted = [...pairs].sort((a, b) => a.judge - b.judge);

  // Initialize blocks of (x, y, weight).
  const blocks = sorted.map((p) => ({ x: p.judge, y: p.human, w: 1 }));

  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].y > blocks[i + 1].y) {
      // Merge violating adjacent blocks.
      const merged = {
        x: blocks[i].x,
        y: (blocks[i].y * blocks[i].w + blocks[i + 1].y * blocks[i + 1].w) /
          (blocks[i].w + blocks[i + 1].w),
        w: blocks[i].w + blocks[i + 1].w,
      };
      blocks.splice(i, 2, merged);
      if (i > 0) i--;
    } else {
      i++;
    }
  }

  return { points: blocks.map((b) => ({ x: round(b.x), y: round(b.y) })) };
}

/** Apply the calibration mapping with linear interpolation between points. */
export function applyCalibration(model: CalibrationModel, judge: number): number {
  const pts = model.points;
  if (pts.length === 0) return judge;
  if (judge <= pts[0].x) return pts[0].y;
  if (judge >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  for (let i = 0; i < pts.length - 1; i++) {
    if (judge >= pts[i].x && judge <= pts[i + 1].x) {
      const span = pts[i + 1].x - pts[i].x;
      const t = span === 0 ? 0 : (judge - pts[i].x) / span;
      return round(pts[i].y + t * (pts[i + 1].y - pts[i].y));
    }
  }
  return judge;
}

/**
 * Expected Calibration Error across bins (lower is better calibrated).
 */
export function expectedCalibrationError(
  pairs: CalibrationPair[],
  bins = 10
): number {
  if (pairs.length === 0) return 0;
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const inBin = pairs.filter((p) => p.judge >= lo && (b === bins - 1 ? p.judge <= hi : p.judge < hi));
    if (inBin.length === 0) continue;
    const avgJudge = inBin.reduce((s, p) => s + p.judge, 0) / inBin.length;
    const avgHuman = inBin.reduce((s, p) => s + p.human, 0) / inBin.length;
    ece += (inBin.length / pairs.length) * Math.abs(avgJudge - avgHuman);
  }
  return round(ece);
}
