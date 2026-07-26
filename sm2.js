/* ============================================================
   sm2.js — Algoritmo SM-2 clásico (SuperMemo 2).
   Misma lógica que la versión Dart, portada a JS.
   ============================================================ */

const ANSWER_QUALITY = {
  know: 5,
  doubt: 3,
  dontKnow: 0,
};

function clampEase(ease) {
  return ease < 1.3 ? 1.3 : ease;
}

/**
 * Calcula el nuevo estado de repaso a partir del estado actual y la
 * respuesta del usuario ('know' | 'doubt' | 'dontKnow').
 */
function sm2Next(review, answerKey) {
  const quality = ANSWER_QUALITY[answerKey];
  const now = new Date();

  if (quality < 3) {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    return {
      ...review,
      repetitions: 0,
      interval: 1,
      easeFactor: clampEase(review.easeFactor - 0.2),
      nextReview: next.toISOString(),
    };
  }

  const newRepetitions = review.repetitions + 1;
  let newInterval;

  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(review.interval * review.easeFactor);
    if (newInterval < 1) newInterval = 1;
  }

  const newEase = clampEase(
    review.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const next = new Date(now);
  next.setDate(next.getDate() + newInterval);

  return {
    ...review,
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: newEase,
    nextReview: next.toISOString(),
  };
}
