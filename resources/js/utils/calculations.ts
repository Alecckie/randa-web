/**
 * Bullet-proof arithmetic utilities for money, progress, and statistics.
 *
 * Design rules:
 *   - All money values treated as KES with 2 decimal places.
 *   - null / undefined / NaN inputs are treated as 0 — never crash.
 *   - All percentages are clamped to [0, 100].
 *   - Division by zero always returns the explicit `fallback` (default 0).
 *   - Final money results are always rounded to 2 decimal places.
 */

// ── Primitives ────────────────────────────────────────────────────────────────

/** Coerce any value to a finite number, defaulting to 0. */
function toNum(v: number | null | undefined): number {
    const n = Number(v);
    return isFinite(n) ? n : 0;
}

/** Round a money value to exactly 2 decimal places (avoids floating-point drift). */
export function roundMoney(amount: number | null | undefined): number {
    return Math.round(toNum(amount) * 100) / 100;
}

/**
 * Safe integer division that returns `fallback` (default 0) when
 * denominator is zero, null, or NaN.
 */
export function safeDivide(
    numerator: number | null | undefined,
    denominator: number | null | undefined,
    fallback = 0,
): number {
    const d = toNum(denominator);
    if (d === 0) return fallback;
    return toNum(numerator) / d;
}

/** Clamp a value to the [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, toNum(value)));
}

// ── Money ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the outstanding balance for a campaign.
 * Both inputs are floored at 0 so a negative paid amount can't inflate the balance.
 * Returns a non-negative rounded KES value.
 */
export function calculateBalance(
    totalCost: number | null | undefined,
    paidAmount: number | null | undefined,
): number {
    const cost = Math.max(0, toNum(totalCost));
    const paid = Math.max(0, toNum(paidAmount));
    return roundMoney(Math.max(0, cost - paid));
}

/** True when there is a non-zero balance remaining. */
export function hasBalance(
    totalCost: number | null | undefined,
    paidAmount: number | null | undefined,
): boolean {
    return calculateBalance(totalCost, paidAmount) > 0;
}

/**
 * Compute the VAT component of a subtotal.
 * Default Kenya VAT rate = 16%.
 */
export function calculateVAT(subtotal: number | null | undefined, vatRate = 0.16): number {
    return roundMoney(Math.max(0, toNum(subtotal)) * vatRate);
}

/**
 * Compute the total cost including VAT.
 * Default Kenya VAT rate = 16%.
 */
export function calculateTotalWithVAT(subtotal: number | null | undefined, vatRate = 0.16): number {
    const base = Math.max(0, toNum(subtotal));
    return roundMoney(base + base * vatRate);
}

/**
 * Compute the per-unit cost for a campaign.
 * e.g. daily rate × number of helmets × duration days.
 * Returns rounded KES value.
 */
export function calculateCampaignSubtotal(
    dailyRate: number | null | undefined,
    helmetCount: number | null | undefined,
    durationDays: number | null | undefined,
): number {
    const rate    = Math.max(0, toNum(dailyRate));
    const helmets = Math.max(0, Math.round(toNum(helmetCount)));
    const days    = Math.max(0, Math.round(toNum(durationDays)));
    return roundMoney(rate * helmets * days);
}

// ── Progress / Percentages ────────────────────────────────────────────────────

/**
 * Convert a count/total pair to a 0–100 percentage.
 * Returns 0 when total is 0 or missing.
 */
export function calculateProgress(
    count: number | null | undefined,
    total: number | null | undefined,
): number {
    return clamp(safeDivide(count, total) * 100, 0, 100);
}

/**
 * Calculate what percentage of the cost has been paid.
 * Returns 0 when no cost, 100 when over-paid.
 */
export function calculatePaymentProgress(
    paidAmount: number | null | undefined,
    totalCost: number | null | undefined,
): number {
    return clamp(safeDivide(paidAmount, totalCost) * 100, 0, 100);
}

/**
 * Campaign rider-slot utilisation: active assignments / helmet_count × 100.
 */
export function calculateAssignmentUtilisation(
    activeAssignments: number | null | undefined,
    helmetCount: number | null | undefined,
): number {
    return clamp(safeDivide(activeAssignments, helmetCount) * 100, 0, 100);
}

// ── Statistics ────────────────────────────────────────────────────────────────

/**
 * Safe sum of an array of numbers (handles nulls inside the array).
 */
export function safeSum(values: (number | null | undefined)[]): number {
    return roundMoney(values.reduce<number>((acc, v) => acc + toNum(v), 0));
}

/**
 * Safe average; returns 0 for an empty array.
 */
export function safeAverage(values: (number | null | undefined)[]): number {
    if (!values.length) return 0;
    return roundMoney(safeSum(values) / values.length);
}
