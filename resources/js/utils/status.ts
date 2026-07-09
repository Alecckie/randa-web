/**
 * Canonical status → Mantine color / label maps for every entity in the system.
 *
 * Rules:
 *   green  = running / approved / available / succeeded
 *   teal   = successfully completed / done
 *   blue   = ready / paid / assigned
 *   yellow = draft / pending / informational
 *   orange = action required (pay / approve)
 *   grape  = paused / suspended
 *   red    = cancelled / rejected / failed / retired
 *   gray   = unknown / incomplete
 */

// ── Campaign ──────────────────────────────────────────────────────────────────

const CAMPAIGN_COLORS: Record<string, string> = {
    draft:     'yellow',
    submitted: 'orange',
    active:    'green',
    paused:    'grape',
    completed: 'teal',
    cancelled: 'red',
};

const CAMPAIGN_LABELS: Record<string, string> = {
    draft:     'Draft',
    submitted: 'Submitted',
    active:    'Active',
    paused:    'Paused',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export function getCampaignStatusColor(status: string): string {
    return CAMPAIGN_COLORS[status] ?? 'gray';
}

export function getCampaignStatusLabel(status: string): string {
    return CAMPAIGN_LABELS[status] ?? status;
}

// ── Person: Rider / Advertiser ────────────────────────────────────────────────

const PERSON_COLORS: Record<string, string> = {
    pending:    'yellow',
    approved:   'green',
    rejected:   'red',
    incomplete: 'gray',
    active:     'green',
    inactive:   'red',
};

const PERSON_LABELS: Record<string, string> = {
    pending:    'Pending',
    approved:   'Approved',
    rejected:   'Rejected',
    incomplete: 'Incomplete',
    active:     'Active',
    inactive:   'Inactive',
};

export function getPersonStatusColor(status: string): string {
    return PERSON_COLORS[status] ?? 'gray';
}

export function getPersonStatusLabel(status: string): string {
    return PERSON_LABELS[status] ?? status;
}

// ── Helmet ────────────────────────────────────────────────────────────────────

const HELMET_COLORS: Record<string, string> = {
    available:   'green',
    assigned:    'blue',
    maintenance: 'yellow',
    retired:     'red',
};

const HELMET_LABELS: Record<string, string> = {
    available:   'Available',
    assigned:    'Assigned',
    maintenance: 'Maintenance',
    retired:     'Retired',
};

export function getHelmetStatusColor(status: string): string {
    return HELMET_COLORS[status] ?? 'gray';
}

export function getHelmetStatusLabel(status: string): string {
    return HELMET_LABELS[status] ?? status;
}

// ── Assignment ────────────────────────────────────────────────────────────────

const ASSIGNMENT_COLORS: Record<string, string> = {
    active:    'green',
    completed: 'teal',
    cancelled: 'red',
};

const ASSIGNMENT_LABELS: Record<string, string> = {
    active:    'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export function getAssignmentStatusColor(status: string): string {
    return ASSIGNMENT_COLORS[status] ?? 'gray';
}

export function getAssignmentStatusLabel(status: string): string {
    return ASSIGNMENT_LABELS[status] ?? status;
}

// ── Payment ───────────────────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
    paid:                 'green',
    partially_paid:       'yellow',
    unpaid:               'red',
    pending_verification: 'blue',
    rejected:             'red',
};

const PAYMENT_LABELS: Record<string, string> = {
    paid:                 'Paid',
    partially_paid:       'Partially Paid',
    unpaid:               'Unpaid',
    pending_verification: 'Verification Pending',
    rejected:             'Payment Rejected',
};

export function getPaymentStatusColor(status: string): string {
    return PAYMENT_COLORS[status] ?? 'gray';
}

export function getPaymentStatusLabel(status: string): string {
    return PAYMENT_LABELS[status] ?? status;
}
