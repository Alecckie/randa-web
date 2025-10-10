<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Advertiser Details - {{ $advertiser->company_name }}</title>
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
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-approved {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status-rejected {
            background-color: #fee2e2;
            color: #991b1b;
        }
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
        <h1>Advertiser Details Report</h1>
        <p>Generated on {{ now()->format('F d, Y \a\t H:i:s') }}</p>
    </div>

    <!-- Status Section -->
    <div class="section">
        <div class="section-title">Application Status</div>
        <div style="text-align: center;">
            <span class="status-badge status-{{ $advertiser->status }}">
                {{ strtoupper($advertiser->status) }}
            </span>
        </div>
    </div>

    <!-- Company Information -->
    <div class="section">
        <div class="section-title">Company Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Company Name</div>
                <div class="info-value">{{ $advertiser->company_name }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Business Registration</div>
                <div class="info-value">{{ $advertiser->business_registration ?? 'Not provided' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Company Address</div>
                <div class="info-value">{{ $advertiser->address }}</div>
            </div>
        </div>
    </div>

    <!-- Contact Information -->
    <div class="section">
        <div class="section-title">Contact Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-label">Contact Person</div>
                <div class="info-value">{{ $advertiser?->user?->name ?? "-" }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Email Address</div>
                <div class="info-value">{{ $advertiser->user->email }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Phone Number</div>
                <div class="info-value">{{ $advertiser->user->phone ?? 'Not provided' }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Account Status</div>
                <div class="info-value">
                    <strong style="color: {{ $advertiser->user->is_active ? '#059669' : '#dc2626' }}">
                        {{ $advertiser->user->is_active ? 'Active' : 'Inactive' }}
                    </strong>
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
                <div class="info-value">{{ $advertiser->created_at->format('F d, Y \a\t H:i:s') }}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Last Updated</div>
                <div class="info-value">{{ $advertiser->updated_at->format('F d, Y \a\t H:i:s') }}</div>
            </div>
        </div>
    </div>

    <!-- Rejection Reasons (if any) -->
    @if($rejectionReasons->count() > 0)
    <div class="section">
        <div class="section-title">Rejection History</div>
        @foreach($rejectionReasons as $rejection)
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

    <!-- Campaigns List -->
    @if(isset($campaigns) && $campaigns->count() > 0)
    <div class="section">
        <div class="section-title">Campaigns ({{ $campaigns->count() }})</div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                    <th style="padding: 8px; text-align: left; font-size: 11px; font-weight: 600;">Campaign Name</th>
                    <th style="padding: 8px; text-align: left; font-size: 11px; font-weight: 600;">Status</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600;">Duration</th>
                    <th style="padding: 8px; text-align: center; font-size: 11px; font-weight: 600;">Helmets</th>
                    <th style="padding: 8px; text-align: left; font-size: 11px; font-weight: 600;">Dates</th>
                </tr>
            </thead>
            <tbody>
                @foreach($campaigns as $campaign)
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px; font-size: 10px;">{{ $campaign->name ?? 'N/A' }}</td>
                    <td style="padding: 8px; font-size: 10px;">
                        <span style="
                            padding: 3px 8px; 
                            border-radius: 3px; 
                            font-weight: 600; 
                            font-size: 9px;
                            text-transform: uppercase;
                            @if($campaign->status === 'active') background-color: #d1fae5; color: #065f46;
                            @elseif($campaign->status === 'completed') background-color: #ccfbf1; color: #115e59;
                            @elseif($campaign->status === 'pending_payment') background-color: #fef3c7; color: #92400e;
                            @elseif($campaign->status === 'cancelled') background-color: #fee2e2; color: #991b1b;
                            @else background-color: #f3f4f6; color: #4b5563;
                            @endif
                        ">
                            {{ str_replace('_', ' ', $campaign->status ?? 'unknown') }}
                        </span>
                    </td>
                    <td style="padding: 8px; text-align: center; font-size: 10px;">
                        @if($campaign->start_date && $campaign->end_date)
                            {{ $campaign->start_date->diffInDays($campaign->end_date) + 1 }} days
                        @else
                            N/A
                        @endif
                    </td>
                    <td style="padding: 8px; text-align: center; font-size: 10px;">{{ $campaign->helmet_count ?? 0 }}</td>
                    <td style="padding: 8px; font-size: 10px;">
                        @if($campaign->start_date && $campaign->end_date)
                            {{ $campaign->start_date->format('M d, Y') }} - {{ $campaign->end_date->format('M d, Y') }}
                        @else
                            N/A
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @else
    <div class="section">
        <div class="section-title">Campaigns</div>
        <p style="color: #6b7280; font-size: 11px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
            No campaigns have been created for this advertiser yet.
        </p>
    </div>
    @endif

    <div class="footer">
        <p>This is a system-generated document. No signature required.</p>
        <p class="page-number"></p>
    </div>
</body>
</html>