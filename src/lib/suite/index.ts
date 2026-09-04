import { bootstrapSuite } from "./bootstrap";

/**
 * Ensures the forever-running suite wakes when the Next.js server process starts.
 * Safe to import from API routes / layout server components.
 */
export function ensureSuiteAwake() {
  bootstrapSuite();
}
