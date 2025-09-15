// Monotonic clock injection helper
export type Clock = () => number; // seconds with fractional part
export function systemMonotonic(): number {
  // prefer performance.now if available for monotonic behavior
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now() / 1000;
  }
  const [s, ns] = process.hrtime();
  return s + ns / 1e9;
}
export function nowUTC(): string {
  return new Date().toISOString();
}