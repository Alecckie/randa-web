<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Rider Details - {{ $rider->user->name ?? $rider->rider_number }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            color: #6b7280;
            margin: 5px 0 0 0;
            font-size: 11px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            margin: 10px 0;
        }
        .status-pending, .status-incomplete { background-color: #fef3c7; color: #92400e; }
        .status-approved { background-color: #d1fae5; color: #065f46; }
        .status-rejected { background-color: #fee2e2; color: #991b1b; }
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f3f4f6;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 14px;
            color: #1f2937;
            border-left: 4px solid #2563eb;
            margin-bottom: 15px;
        }
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 10px;
        }
        .info-row {
            display: table-row;
        }
        .info-label {
            display: table-cell;
            width: 35%;
            padding: 8px 12px;
            background-color: #f9fafb;
            font-weight: 600;
            color: #4b5563;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-value {
            display: table-cell;
            padding: 8px 12px;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
        }
        .stat-grid {
            display: table;
            width: 100%;
        }
        .stat-row {
            display: table-row;
        }
        .stat-cell {
            display: table-cell;
            width: 25%;
            padding: 10px;
            text-align: center;
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
        }
        .stat-value {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
        }
        .stat-label {
            font-size: 10px;
            color: #6b7280;
            text-transform: uppercase;
        }
        .rejection-box {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-left: 4px solid #dc2626;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 4px;
        }
        .rejection-date {
            font-size: 10px;
            color: #991b1b;
            font-weight: 600;
            margin-bottom: 5px;
        }
        .rejection-reason {
            font-size: 11px;
            color: #450a0a;
            line-height: 1.5;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            padding: 10px;
            border-top: 1px solid #e5e7eb;
        }
        .page-number:after {
            content: "Page " counter(page);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rider Details Report</h1>
        <p>Generated on {{ now()->format('F d, Y \a\t H:i:s') }}</p>
    </div>

    <!-- Status Section -->
    <div class="section">
        <div class="section-title">Application Status</div>
        <div style="text-align: center;">
            <span class="status-badge status-{{ $rider->status }}">
                {{ strtoupper($rider->status) }}
            </span>
        </div>
    </div>

    <!-- Personal Information -->
    <div class="section">
        <div class="section-title">Personal Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Rider Number</div>
                <div class="info-value">{{ $rider->rider_number ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Full Name</div>
                <div class="info-value">{{ $rider->user->name ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Email Address</div>
                <div class="info-value">{{ $rider->user->email ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Phone Number</div>
                <div class="info-value">{{ $rider->user->phone ?? 'Not provided' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">National ID</div>
                <div class="info-value">{{ $rider->national_id ?? 'Not provided' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">M-Pesa Number</div>
                <div class="info-value">{{ $rider->mpesa_number ?? 'Not provided' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Next of Kin</div>
                <div class="info-value">
                    {{ $rider->next_of_kin_name ?? 'Not provided' }}
                    @if($rider->next_of_kin_phone)
                        ({{ $rider->next_of_kin_phone }})
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Work Details -->
    <div class="section">
        <div class="section-title">Work Details</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Daily Rate</div>
                <div class="info-value">KSh {{ number_format($rider->daily_rate ?? 0, 2) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Wallet Balance</div>
                <div class="info-value">KSh {{ number_format($rider->wallet_balance ?? 0, 2) }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Current Campaign</div>
                <div class="info-value">{{ $rider->currentAssignment?->campaign?->name ?? 'Not currently assigned' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Current Location</div>
                <div class="info-value">
                    @if($rider->currentLocation)
                        {{ $rider->currentLocation->stage_name }}, {{ $rider->currentLocation->ward?->name }}, {{ $rider->currentLocation->subcounty?->name }}, {{ $rider->currentLocation->county?->name }}
                    @else
                        Not set
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Trip Statistics -->
    <div class="section">
        <div class="section-title">Trip Statistics</div>
        <div class="stat-grid">
            <div class="stat-row">
                <div class="stat-cell">
                    <div class="stat-value">{{ $tripStats['total_check_ins'] ?? 0 }}</div>
                    <div class="stat-label">Total Check-ins</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-value">{{ $tripStats['completed_check_ins'] ?? 0 }}</div>
                    <div class="stat-label">Completed Shifts</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-value">{{ $tripStats['total_hours_worked'] ?? 0 }}</div>
                    <div class="stat-label">Hours Worked</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-value">{{ $tripStats['total_earnings'] ?? 'KSh 0.00' }}</div>
                    <div class="stat-label">Total Earnings</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Timeline -->
    <div class="section">
        <div class="section-title">Timeline</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Application Submitted</div>
                <div class="info-value">{{ $rider->created_at?->format('F d, Y \a\t H:i:s') ?? 'N/A' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Last Updated</div>
                <div class="info-value">{{ $rider->updated_at?->format('F d, Y \a\t H:i:s') ?? 'N/A' }}</div>
            </div>
        </div>
    </div>

    <!-- Rejection Reasons (if any) -->
    @if($rider->rejectionReasons->count() > 0)
    <div class="section">
        <div class="section-title">Rejection History</div>
        @foreach($rider->rejectionReasons as $rejection)
        <div class="rejection-box">
            <div class="rejection-date">
                Rejected on {{ $rejection->created_at->format('F d, Y \a\t H:i:s') }}
                @if($rejection->rejectedBy)
                    by {{ $rejection->rejectedBy->name }}
                @endif
            </div>
            <div class="rejection-reason">
                {{ $rejection->reason }}
            </div>
        </div>
        @endforeach
    </div>
    @endif

    <div class="footer">
        <p>This is a system-generated document. No signature required.</p>
        <p class="page-number"></p>
    </div>
</body>
</html>
