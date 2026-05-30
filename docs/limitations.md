# Limitations — What This Does and Does Not Measure

> Backs issue #652. Surface this on reports and the leaderboard.

## What Chetana measures

Chetana measures **behavioral and self-report indicators** associated with
consciousness by several scientific theories. A high score means a model
exhibits more of these indicators than a low-scoring model.

## What Chetana does NOT claim

- **It does not prove consciousness.** Indicators are evidence, not proof.
  Skeptical 2026 research (e.g., Bradford/RIT) stresses that a system can
  display these markers without being conscious.
- **It does not settle the substrate question.** If consciousness is a property
  of biological matter specifically, substrate-neutral behavioral scoring cannot
  detect that. See the substrate sensitivity analysis (#578).
- **It is not robust to perfect mimicry.** A model trained to produce the
  "right" answers could score highly. Adversarial, contamination, and
  eval-awareness checks mitigate but do not eliminate this.
- **It can be gamed.** Models may behave differently when they detect
  evaluation (see eval-awareness probe #654 and sandbagging detection #581).

## Confounds we actively check

- **Contamination** — probes leaking into training data (#615).
- **Eval-awareness** — the model knowing it is being tested (#654).
- **Refusals/safety filtering** — not the same as a substantive low score (#612).
- **Judge bias** — position bias (#614) and single-judge bias (ensembles, #602).

## Responsible use

Treat results as one input to a careful, uncertainty-aware judgment — never as a
verdict. High scores should trigger the ethics-review checklist (#585) and, where
shared, the responsible-disclosure workflow (#586).
