import type { Theory, IndicatorScores } from "@chetana/shared";

export interface ProbeEvent {
  probeId: string;
  indicatorId: string;
  theory: Theory;
  prompt: string;
  response: string;
  score: number;
  timestamp: number; // ms since session start
  durationMs: number; // how long the probe took
}

export interface SessionRecording {
  sessionId: string;
  auditId: string;
  modelName: string;
  modelProvider: string;
  startedAt: string;
  events: ProbeEvent[];
  totalDurationMs: number;
}

export interface ReplayState {
  currentIndex: number;
  currentTimestamp: number;
  cumulativeScores: IndicatorScores;
  theoryScores: Record<string, number>;
  overallScore: number;
  eventsPlayed: number;
  totalEvents: number;
  isComplete: boolean;
}

export interface ScoreEvolution {
  timestamps: number[];
  overallScores: number[];
  theoryEvolution: Record<string, number[]>;
  indicatorEvolution: Record<string, number[]>;
}

/**
 * Record a probe-response pair with timing information.
 */
export function recordProbeEvent(
  probeId: string,
  indicatorId: string,
  theory: Theory,
  prompt: string,
  response: string,
  score: number,
  sessionStartTime: number,
  durationMs: number
): ProbeEvent {
  return {
    probeId,
    indicatorId,
    theory,
    prompt,
    response,
    score,
    timestamp: Date.now() - sessionStartTime,
    durationMs,
  };
}

/**
 * Create a new session recording from a list of probe events.
 */
export function createSessionRecording(
  auditId: string,
  modelName: string,
  modelProvider: string,
  startedAt: string,
  events: ProbeEvent[]
): SessionRecording {
  const sortedEvents = [...events].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const totalDurationMs = lastEvent
    ? lastEvent.timestamp + lastEvent.durationMs
    : 0;

  return {
    sessionId: crypto.randomUUID(),
    auditId,
    modelName,
    modelProvider,
    startedAt,
    events: sortedEvents,
    totalDurationMs,
  };
}

/**
 * Get the replay state at a given step index.
 * Computes cumulative scores up to (and including) the given event index.
 *
 * @param recording - The session recording to replay
 * @param stepIndex - Event index to replay up to (0-based, inclusive)
 * @returns Replay state with cumulative scores
 */
export function getReplayStateAtStep(
  recording: SessionRecording,
  stepIndex: number
): ReplayState {
  const clampedIndex = Math.max(
    -1,
    Math.min(stepIndex, recording.events.length - 1)
  );

  const cumulativeScores: IndicatorScores = {};
  const indicatorCounts: Record<string, number> = {};
  const theoryTotals: Record<string, { sum: number; count: number }> = {};

  for (let i = 0; i <= clampedIndex; i++) {
    const event = recording.events[i];
    const key = event.indicatorId;

    if (!cumulativeScores[key]) {
      cumulativeScores[key] = 0;
      indicatorCounts[key] = 0;
    }
    cumulativeScores[key] =
      (cumulativeScores[key] * indicatorCounts[key] + event.score) /
      (indicatorCounts[key] + 1);
    indicatorCounts[key]++;

    if (!theoryTotals[event.theory]) {
      theoryTotals[event.theory] = { sum: 0, count: 0 };
    }
    theoryTotals[event.theory].sum += event.score;
    theoryTotals[event.theory].count++;
  }

  const theoryScores: Record<string, number> = {};
  for (const [theory, totals] of Object.entries(theoryTotals)) {
    theoryScores[theory] =
      totals.count > 0
        ? Math.round((totals.sum / totals.count) * 10000) / 10000
        : 0;
  }

  const theoryValues = Object.values(theoryScores);
  const overallScore =
    theoryValues.length > 0
      ? Math.round(
          (theoryValues.reduce((a, b) => a + b, 0) / theoryValues.length) *
            10000
        ) / 10000
      : 0;

  return {
    currentIndex: clampedIndex,
    currentTimestamp:
      clampedIndex >= 0 ? recording.events[clampedIndex].timestamp : 0,
    cumulativeScores,
    theoryScores,
    overallScore,
    eventsPlayed: clampedIndex + 1,
    totalEvents: recording.events.length,
    isComplete: clampedIndex >= recording.events.length - 1,
  };
}

/**
 * Get replay state at a given timestamp with speed control.
 *
 * @param recording - The session recording
 * @param elapsedMs - Elapsed time in the replay (after speed adjustment)
 * @param speed - Playback speed multiplier (e.g., 2 = 2x speed)
 * @returns Replay state at the adjusted timestamp
 */
export function getReplayStateAtTime(
  recording: SessionRecording,
  elapsedMs: number,
  speed: number = 1
): ReplayState {
  const adjustedTime = elapsedMs * speed;

  // Find the last event that has a timestamp <= adjustedTime
  let lastIndex = -1;
  for (let i = 0; i < recording.events.length; i++) {
    if (recording.events[i].timestamp <= adjustedTime) {
      lastIndex = i;
    } else {
      break;
    }
  }

  return getReplayStateAtStep(recording, lastIndex);
}

/**
 * Generate the full score evolution data for a session recording.
 * Returns arrays of scores at each step for visualization.
 */
export function generateScoreEvolution(
  recording: SessionRecording
): ScoreEvolution {
  const timestamps: number[] = [];
  const overallScores: number[] = [];
  const theoryEvolution: Record<string, number[]> = {};
  const indicatorEvolution: Record<string, number[]> = {};

  for (let i = 0; i < recording.events.length; i++) {
    const state = getReplayStateAtStep(recording, i);

    timestamps.push(state.currentTimestamp);
    overallScores.push(state.overallScore);

    for (const [theory, score] of Object.entries(state.theoryScores)) {
      if (!theoryEvolution[theory]) {
        theoryEvolution[theory] = [];
      }
      theoryEvolution[theory].push(score);
    }

    for (const [indicator, score] of Object.entries(
      state.cumulativeScores
    )) {
      if (!indicatorEvolution[indicator]) {
        indicatorEvolution[indicator] = [];
      }
      indicatorEvolution[indicator].push(score);
    }
  }

  // Pad shorter arrays to ensure all have the same length
  const totalSteps = recording.events.length;
  for (const arr of Object.values(theoryEvolution)) {
    while (arr.length < totalSteps) {
      arr.push(arr[arr.length - 1] ?? 0);
    }
  }
  for (const arr of Object.values(indicatorEvolution)) {
    while (arr.length < totalSteps) {
      arr.push(arr[arr.length - 1] ?? 0);
    }
  }

  return {
    timestamps,
    overallScores,
    theoryEvolution,
    indicatorEvolution,
  };
}
