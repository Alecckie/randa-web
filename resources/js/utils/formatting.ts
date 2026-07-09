/**
 * Shared formatting utilities — single source of truth for the whole system.
 * Import from here; do NOT redefine these locally in page/component files.
 */

// ── Currency ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/**
 * Format a KES monetary amount.
 * Handles null/undefined/NaN safely — returns 'KES 0.00' for invalid input.
 */
export function formatCurrency(amount: number | null | undefined): string {
    const n = Number(amount);
    return currencyFormatter.format(isNaN(n) ? 0 : n);
}

// ── Date ──────────────────────────────────────────────────────────────────────

function parseDate(date: string | null | undefined): Date | null {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
}

/** 'January 1, 2025'  — long month, full year */
export function formatDate(date: string | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** 'Jan 1, 2025'  — abbreviated month */
export function formatDateShort(date: string | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** 'January 1, 2025 at 02:30 PM'  — date + time */
export function formatDateTime(date: string | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '—';
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** '1 Jan 2025'  — en-KE locale (used in analytics / local context) */
export function formatDateKE(date: string | null | undefined): string {
    const d = parseDate(date);
    if (!d) return '—';
    return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Relative time ─────────────────────────────────────────────────────────────

/** '3m ago', '2h ago', '1d ago' — relative time string */
export function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 0)     return 'just now';
    if (diff < 60)    return `${diff}s ago`;
    if (diff < 3_600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86_400) return `${Math.floor(diff / 3_600)}h ago`;
    return `${Math.floor(diff / 86_400)}d ago`;
}

// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Convert snake_case / kebab-case status strings to Title Case.
 * e.g. 'pending_payment' → 'Pending Payment'
 */
export function formatStatus(status: string | null | undefined): string {
    if (!status) return '—';
    return status
        .split(/[_-]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Extract up to 2 initials from a full name string.
 * Returns '?' for empty/null input.
 */
export function initials(name: string | null | undefined): string {
    if (!name?.trim()) return '?';
    return name
        .trim()
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/**
 * Compact number abbreviation: 1 500 000 → '1.5M', 3 200 → '3.2K'.
 * Values under 1 000 are returned as-is.
 */
export function fmtNumber(n: number): string {
    if (!isFinite(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(n));
}

/**
 * Format a ratio (0–1) as a percentage string: 0.756 → '75.6%'
 * Clamps to [0, 100].
 */
export function formatPercent(ratio: number | null | undefined, decimals = 1): string {
    const r = Number(ratio);
    if (!isFinite(r)) return '0%';
    return `${Math.min(100, Math.max(0, r * 100)).toFixed(decimals)}%`;
}
