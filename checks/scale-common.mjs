export const sampledRanks = [1, 25, 50, 75, 99, 100, 101, 150, 200, 250, 300, 400, 500, 600, 700, 800, 850, 900, 950, 1000]
export const pageRanks = [1, 101, 500, 750, 1000]
export const tokenFor = rank => `zq${String(rank).padStart(4, '0')}`
export const pathFor = (rank, locale = 'en') => `${locale === 'de' ? '/de' : ''}/docs/section-${String(Math.ceil(rank / 50)).padStart(2, '0')}/page-${String(rank).padStart(4, '0')}`
export function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return { count: sorted.length, min: sorted[0], median: sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2, max: sorted.at(-1), p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1] }
}
