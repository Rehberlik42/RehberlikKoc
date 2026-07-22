/**
 * Net hesaplama. divisor null/undefined ise yanlis dogruyu goturmez (ceza yok).
 * TYT/AYT/LGS icin varsayilan 4'tur (mock_exams.wrong_penalty_divisor kolonundan gelir).
 */
export function calculateNet(
  correct: number,
  wrong: number,
  divisor: number | null | undefined
): number {
  if (!divisor || divisor <= 0) return correct;
  return correct - wrong / divisor;
}
