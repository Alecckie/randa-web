# Rider Shift & Location API

> Updated: 2026-07-08
> Backend: Laravel + Sanctum (`randa-web`)
> For use by: Mobile app team
> Verified: end-to-end against a live copy of production data, 2026-07-08 (see Verified Test Runs below)

All requests require:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
```

Base URL: `/api/v1`

> 403 with a `debug` block in the response body means the token is valid but the role/active check failed — read `debug.your_role` / `debug.required_roles` rather than guessing.

---

## Shift Lifecycle

One check-in row per rider per day. `started`/`resumed` are the only states where GPS should stream.

```
STARTED  ──pause──▶  PAUSED  ──resume──▶  RESUMED  ──end / leave──▶  ENDED
 (GPS on)            (GPS blocked)         (GPS on)                 (pay calculated)
```

- Pausing and resuming multiple times in one shift is normal — it never creates new check-in rows.
- Pay is calculated **once**, when the shift ends, from the check-in + pause history + GPS trail. Never trust anything the client sends for pay — the server recomputes it from scratch.
- **Check-in is only allowed within a daily window** — see [Check-in Window](#check-in-window) below.
- **A shift you forget to end doesn't stay open forever** — see [Automatic Shift Closure](#automatic-shift-closure).

---

## Check-in Window

Riders can only start a shift between `RIDER_EARLIEST_CHECK_IN_HOUR` (default 06:00) and `RIDER_LATEST_CHECK_IN_HOUR` (default 18:00 / 6:00 PM), app timezone (`Africa/Nairobi`). Both bounds are enforced server-side in `CheckInService::checkIn()` and are admin-configurable via `config/rider_shift.php` — don't hardcode 6 AM/6 PM client-side, read the error message instead (see [Error Strings](#error-strings)).

---

## Automatic Shift Closure

If a rider forgets to check out, the system closes their shift automatically at that day's `RIDER_LATEST_CHECK_IN_HOUR` cutoff (default 6:00 PM) — a scheduled job (`rider-shifts:auto-close`) runs daily at that time. Pay is calculated exactly as if the rider had checked out at the cutoff moment: same pause deduction, same [movement-based deduction](#movement-based-pay), same 3-hour minimum. The closed shift's `end_reason` is `auto_closed`, and the rider gets an in-app notification either way ("you earned KSh X" or "below minimum, no earnings recorded").

**Client implication:** always call [`GET /rider/status`](#shift--earnings-summary) on foreground — if the shift status comes back `ended` with `end_reason: auto_closed` even though the client thought it was still `started`/`resumed`, stop the location service and show the day's final earnings. Don't assume a shift you started is still open just because the app never called checkout.

---

## Start Shift

```
POST /rider/check_in
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `qr_code` | Yes | string, 3–255 chars (scanned from the helmet) |
| `latitude` | Yes | number, -90..90 |
| `longitude` | Yes | number, -180..180 |

### Response · 200

```json
{
  "success": true,
  "check_in": { "id": 37, "status": "started", "...": "..." },
  "campaign_name": "TEST",
  "helmet_code": "HLM-0002",
  "check_in_time": "04:13 PM",
  "daily_earning": "KSh 70.00"
}
```

> **Don't display `daily_earning` from this response.** It's a placeholder written at check-in time (the rider's flat `daily_rate`), not a real figure — actual pay is unknown until the shift ends. Use [Shift & Earnings Summary](#shift--earnings-summary) for a live, honest running estimate instead.

Blocked before `RIDER_EARLIEST_CHECK_IN_HOUR`, at/after `RIDER_LATEST_CHECK_IN_HOUR`, if already checked in today (in **any** state — started/paused/resumed/ended, not just started), if the rider isn't `approved`, or if the assigned campaign isn't active/paid — see [Error Strings](#error-strings) for exact messages.

---

## Send Location

```
POST /rider/location
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `latitude` | Yes | number, -90..90 |
| `longitude` | Yes | number, -180..180 |
| `accuracy` | No | number ≥0 (meters) |
| `altitude` | No | number |
| `speed` | No | number ≥0 |
| `heading` | No | number, 0–360 |
| `recorded_at` | No | ISO date string |
| `metadata.battery_level` | No | number, 0–100 |
| `metadata.network_type` | No | `wifi` \| `cellular` \| `none` |
| `metadata.app_version` | No | string, ≤20 chars |

### Response · 201

```json
{
  "success": true,
  "message": "Location recorded successfully",
  "data": {
    "gps_point_id": 29779,
    "recorded_at": "2026-07-04T16:17:26+03:00",
    "latitude": -1.2867,
    "longitude": 36.8176
  }
}
```

> **No IDs to track.** Don't send `check_in_id` or `campaign_assignment_id` — there's nowhere to put them. The server resolves the rider's own active check-in itself.

### Sending cadence — throttle while stationary

Recommended base cadence: every 15s while `started`/`resumed`, high-accuracy fix, no cached/stale positions. **But don't send a point just because 15 seconds passed if the rider hasn't actually moved** — see [Movement-Based Pay](#movement-based-pay). The reference web client (`resources/js/Services/LocationTracking.ts`) implements this as:

- Skip a tick if the new position is within **15 meters** of the last point actually sent.
- ...unless **2 minutes** have passed since the last send — always send at least a heartbeat that often, even while parked. This matters for two reasons: (1) it keeps the rider visible on live tracking/heatmap views instead of looking indistinguishable from a dead app, and (2) the server's stationary-detection algorithm works off consecutive GPS points, so a total blackout during a stop is *fine for pay* (it still reads as zero movement) but *bad for live status*.

Mirror this behavior in the native client — it directly reduces battery/data usage during idle time, which is most of a typical stop.

---

## Send Location (Batch / Offline Sync)

```
POST /rider/locations/batch
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `locations` | Yes | array, 1–500 items |
| `locations[].latitude` | Yes | number, -90..90 |
| `locations[].longitude` | Yes | number, -180..180 |
| `locations[].*` | No | same optional fields as the single endpoint above |

### Response · 201

```json
{
  "success": true,
  "message": "12 locations recorded successfully",
  "data": { "recorded_count": 12, "timestamp": "2026-07-04T16:20:00+03:00" }
}
```

---

## Pause Shift

```
POST /rider/tracking/pause
```

No request body. Stamps `paused_at` using the rider's **last recorded** GPS fix as the pause location — it does not read lat/lng from this request. Stop sending `/location` immediately after this call succeeds.

### Response · 200

```json
{
  "success": true,
  "message": "Tracking paused successfully",
  "data": {
    "check_in_id": 37,
    "status": "paused",
    "paused_at": "2026-07-04T16:14:05+03:00",
    "pause_latitude": -1.2865,
    "pause_longitude": 36.81745
  }
}
```

---

## Resume Shift

```
POST /rider/tracking/resume
```

No request body. Closes the open pause event and flips status back to `resumed`. Start sending `/location` again once this succeeds.

### Response · 200

```json
{
  "success": true,
  "message": "Tracking resumed successfully",
  "data": {
    "check_in_id": 37,
    "status": "resumed",
    "resumed_at": "2026-07-04T16:17:25+03:00",
    "duration_minutes": 3
  }
}
```

---

## Leave / Stop Shift

```
POST /rider/leave-shift
```

For sickness, an emergency, or any other early end.

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `reason` | Yes | `sickness` \| `emergency` \| `other` |
| `latitude` | No | number, -90..90 |
| `longitude` | No | number, -180..180 |

Response shape is identical to [End Shift](#end-shift) below — only `end_reason` differs.

> **Pay math is identical to a normal end-of-shift.** A rider who genuinely worked qualifying hours and then had to leave for an emergency is paid for those hours, same as ending normally. Only the recorded `end_reason` differs, for reporting.

---

## End Shift

```
POST /rider/checkout
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `latitude` | No | number, -90..90 |
| `longitude` | No | number, -180..180 |

### Response Fields

| Field | Meaning |
|-------|---------|
| `total_hours` | check-in → now, in hours |
| `paused_hours` | deducted time, including an open/unresumed pause |
| `stationary_hours` | deducted time where the GPS trail showed no sustained movement — see [Movement-Based Pay](#movement-based-pay) |
| `worked_hours` | total − paused − stationary |
| `payable_hours` | worked_hours capped at `max_hours_per_day` |
| `qualifies_for_payment` | `worked_hours ≥ min_qualifying_hours` |
| `daily_earning` | `payable_hours × hourly_rate`, or `0` if not qualified |
| `new_wallet_balance` | unchanged if not qualified |

### Response · 200 (qualified)

```json
{
  "success": true,
  "message": "Check-out successful! Your earnings have been added to your wallet.",
  "data": {
    "end_reason": "completed",
    "total_hours": 7,
    "worked_hours": 6.17,
    "payable_hours": 6.17,
    "paused_hours": 0.83,
    "stationary_hours": 0,
    "hourly_rate": 10,
    "max_hours_per_day": 7,
    "min_qualifying_hours": 3,
    "qualifies_for_payment": true,
    "daily_earning": "KSh 61.67",
    "new_wallet_balance": "KSh 1,437.28"
  }
}
```

### Response · 200 (under minimum)

```json
{
  "success": true,
  "message": "Shift ended. You worked 0.0 hour(s), below the 3.0-hour minimum required to qualify for payment — no earnings were recorded for today.",
  "data": {
    "worked_hours": 0,
    "qualifies_for_payment": false,
    "daily_earning": "KSh 0.00"
  }
}
```

> **Read `hourly_rate`, `max_hours_per_day`, and `min_qualifying_hours` from this response** rather than hardcoding them client-side — all are admin-configurable and can change without an app release. **`hourly_rate` is per-rider**, not a global constant — it's `daily_rate ÷ max_hours_per_day` for that specific rider.

> If a rider ends their shift while still `paused` (never resumed), that open pause is closed and its time deducted automatically — you don't need to force a resume first.

---

## Movement-Based Pay

Elapsed clock time and declared pauses aren't the whole picture — **a sustained stationary stretch is deducted from worked_hours even if the rider never tapped "pause".** The server walks the shift's GPS trail and flags any stretch where consecutive points imply a speed below `RIDER_STATIONARY_SPEED_THRESHOLD_KMH` (default 2 km/h) lasting longer than `RIDER_STATIONARY_MIN_MINUTES` (default 5 minutes — grace for traffic lights and brief stops).

- This is why throttling `/location` while stationary (see above) doesn't hurt the rider's pay — a gap in GPS points with the rider in roughly the same place reads exactly the same as explicit low-speed points would.
- **Fairness rule for missing data:** with fewer than 2 GPS points in the shift, there's no basis to conclude the rider was stationary, so the deduction is `0` — a shift with sparse/failed GPS is never penalized beyond the pause deduction. This matters for older clients or connectivity dead zones; it is not a loophole to exploit by disabling GPS entirely, since a shift with no GPS at all also means no proof of the movement claimed.
- `stationary_hours` is returned on [End Shift](#end-shift) and included in [Shift & Earnings Summary](#shift--earnings-summary) so the app can show *why* payable hours are lower than elapsed time, rather than the rider just seeing a number that doesn't add up.

---

## Shift & Earnings Summary

```
GET /rider/rider_campaign_summary
```

The rider-facing "how am I doing" screen: current campaign, progress through it, today's running earnings, and total campaign earnings so far. Poll it after check-in and after each pause/resume/checkout.

```json
{
  "campaign": {
    "name": "TEST", "status": "active",
    "start_date": "2026-07-03", "end_date": "2026-07-07",
    "duration_days": 5
  },
  "progress": {
    "day_of_campaign": 2, "day_of_campaign_label": "2nd day of the campaign",
    "remaining_days": 3
  },
  "earnings": {
    "today": 51.17, "today_formatted": "KSh 51.17",
    "total_campaign": 98.28, "total_campaign_formatted": "KSh 98.28",
    "expected_remaining_formatted": "KSh 210.00",
    "expected_remaining_note": "Based on working a full 7-hour day × KSh 10/hr for 3 remaining day(s)",
    "hourly_rate": 10
  },
  "work_summary": {
    "total_days_worked": 4, "total_hours_worked": 12.62,
    "today_checked_in": true, "today_check_in_time": "09:00 AM",
    "today_status": "resumed"
  },
  "assignment": { "helmet_code": "HLM-0003", "assigned_at": "2026-07-06T06:00:04Z" }
}
```

> **`earnings.today` is live and honest.** While the shift is in progress it's computed with the exact same pause/stationary-deduction and minimum-hours rules used at checkout — so it won't show a rising number that then drops unexpectedly. Once the shift ends, it becomes the final `daily_earning`.

Lighter alternative: `GET /rider/status` returns just `{ status, check_in_time, worked_hours, paused_hours, daily_earning }` for today — cheaper to poll if you don't need the campaign/progress fields.

### Detailed earnings table

```
GET /rider/earnings/monthly?month=7&year=2026
```

Returns a day-by-day breakdown suitable for a table view (date / hours worked / amount awarded), plus running totals for the month — this is what backs the "Earnings Summary" table on the web dashboard (`resources/js/Pages/front-end/Riders/Dashboard.tsx`) and should be used for the equivalent table in the native app rather than assembling one from individual check-in records client-side.

```json
{
  "success": true,
  "data": {
    "month": 7, "year": 2026,
    "total_days_worked": 4,
    "total_earnings": "KSh 98.28",
    "average_daily_earning": "KSh 24.57",
    "total_hours_worked": 12.62,
    "total_owed": 98.28,
    "daily_breakdown": [
      {
        "date": "2026-07-04",
        "earnings": "KSh 0.00",
        "hours": 1,
        "settled": false,
        "daily_earning": 0,
        "max_possible_earning": 70
      },
      {
        "date": "2026-07-06",
        "earnings": "KSh 51.17",
        "hours": 5.12,
        "settled": false,
        "daily_earning": 51.17,
        "max_possible_earning": 70
      },
      {
        "date": "2026-07-07",
        "earnings": "KSh 47.11",
        "hours": 4.71,
        "settled": false,
        "daily_earning": 47.11,
        "max_possible_earning": 70
      }
    ]
  }
}
```

> **Added 2026-07-08: `daily_earning` and `max_possible_earning` per day.** `earnings` stays as the pre-formatted `"KSh X.XX"` string for convenience; `daily_earning` is the same value as a raw number, and `max_possible_earning` is this rider's full `daily_rate` — i.e. what they'd have earned working a complete qualifying day. Use the two together to render the "51.17 / 70.00" rate display the web dashboard and admin views now show per day, so the rider can see at a glance how close they got to a full day's pay. `max_possible_earning` is the rider's own `daily_rate`, not a global constant — it can differ rider to rider.

> **`settled`** reflects whether an admin has marked that day's earnings as paid out via the settlement flow (see [Pay Rules](#pay-rules) — settled days no longer count toward `total_owed`, but still appear in `daily_breakdown` for history.

Self-service equivalent for the web/admin dashboard (session-auth, not token-auth): `GET /rider/check-in/earnings-summary` (no month/year params — returns the rider's full history). Same underlying data source (`RiderPayoutService`), slightly different key names (`worked_hours`/`payable_hours`/`daily_earning` per day, `total_hours_worked`/`total_earning`/`total_owed`/`total_settled` for totals) — use `GET /rider/earnings/monthly` above for the mobile app, not this one.

> **Fixed 2026-07-08.** This endpoint used to filter on `status = 'completed'`, a value that never exists in the real status enum (`started`/`paused`/`resumed`/`ended`) — it always returned zero days and zero earnings regardless of actual activity. It's rebuilt on the same `RiderPayoutService` the web dashboard and admin views use, so all three surfaces now agree.

> `settled` reflects whether an admin has marked that day's earnings as paid out. `total_owed` is the sum of unsettled days only — once a day is settled it no longer counts toward what the rider is still owed (but still shows in the table for history).

---

## App Lifecycle & Background Tracking

The API being correct doesn't help if the app stops calling it. Two client-side rules matter as much as anything above.

### Re-sync on every foreground — don't trust cached state

Call `GET /rider/status` on **every app launch and every resume-from-background**, before deciding whether to show "start shift" or "tracking active" or to restart the location service. Never resume sending `/location` just because the app's local state says it was tracking when it went to the background — the server is the only source of truth for `started` / `paused` / `resumed` / `ended`.

This isn't hypothetical: it's the same class of bug that shipped in the reference web client — a check-in status check that compared against `'active'`/`'completed'` strings the server never actually returns (real values are the four-state enum above), silently breaking the "you're checked in" UI. Fixed 2026-07-08; if you're implementing your own status check anywhere, match against the real enum values, not assumed ones.

> **Reconcile, don't assume.** On every foreground: fetch status → if `paused`, stop the location service and show the paused UI; if `started`/`resumed`, ensure the service is running; if `ended` (including `end_reason: auto_closed`, see [Automatic Shift Closure](#automatic-shift-closure)), stop it and show the summary. Then flush any queued offline points via the batch endpoint.

### Keep sending location in the background — and after an accidental kill

Riders will lock their phone, switch apps, or have iOS/Android kill the app under memory pressure while a shift is running. Tracking must survive all three, the same way a driver app like Uber's does. That means **OS-level background location, not a JS `setInterval` that dies the moment the app is backgrounded.**

| Platform | What to implement |
|----------|--------------------|
| Android | A foreground service (`FOREGROUND_SERVICE_LOCATION` on API 34+) with a persistent notification while a shift is active; `ACCESS_BACKGROUND_LOCATION` permission; request the user exempt the app from battery optimization; use `START_STICKY` / `START_REDELIVER_INTENT` so the OS restarts the service if it kills it under memory pressure. |
| iOS | "Always" location authorization; Background Modes → Location updates capability; `CLLocationManager.allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false`; layer `startMonitoringSignificantLocationChanges` underneath as a low-power fallback that can relaunch the app if the system (not the user) terminates it. |

> **Be honest about one iOS limit.** If the rider explicitly force-quits the app (swipe-up-to-kill) while `started`/`resumed`, iOS will not relaunch it — no background API restores tracking after a user-initiated kill, and Uber's driver app has the same constraint. What you *can* guarantee: surviving app backgrounding, phone lock, and the OS killing the app for memory — only a deliberate force-quit is out of reach. Mitigate it in UI, not code: warn the rider clearly that force-quitting during a shift stops tracking (and their pay clock), and reconcile on next launch per the rule above so a gap is at least detected rather than silently trusted. Note that even a full force-quit is now bounded by [Automatic Shift Closure](#automatic-shift-closure) — the shift won't stay open forever, but the rider will only be paid for movement genuinely captured before the gap.

> When background delivery resumes after a gap (reopen, reboot, connectivity restored), send the buffered points through `/rider/locations/batch` rather than dropping them — `recorded_at` on each point preserves the real timestamp even if it's uploaded late.

---

## Pay Rules

All figures are env-configurable server-side (`config/rider_shift.php`) — treat the values below as defaults, not constants, and prefer reading them from API responses where available (see [End Shift](#end-shift)).

| Rule | Default | Applied |
|------|---------|---------|
| Hourly rate | `daily_rate ÷ max_hours_per_day`, **per rider** (e.g. KSh 70 ÷ 7h = KSh 10/hr) | × payable_hours, only if qualified |
| Max hours per day | 7.0 hours | payable_hours capped here — a longer shift doesn't earn more than daily_rate |
| Minimum hours to qualify for any pay | 3.0 hours | worked_hours < 3 → daily_earning = 0, rider notified in-app |
| Earliest check-in time | 06:00 | check_in rejected before this hour |
| Latest check-in time | 18:00 | check_in rejected at/after this hour; also the daily auto-close cutoff |
| Stationary speed threshold | 2 km/h | below this speed between two GPS points, that stretch isn't moving |
| Stationary grace period | 5 minutes | a low-speed stretch shorter than this isn't deducted |

---

## Error Strings

Domain errors return `{ "success": false, "message": "..." }` with HTTP 400/422 — there's no error code enum yet, so match on the exact string for anything you need to branch on.

| Endpoint | Message |
|----------|---------|
| check_in | `Invalid QR code. Helmet not found.` |
| check_in | `Your rider account is not approved yet.` |
| check_in | `No active campaign assignment found for this helmet and rider.` |
| check_in | `The campaign associated with this helmet is not active or paid.` |
| check_in | `Check-in is not allowed before 06:00 AM.` |
| check_in | `Check-in is not allowed after 06:00 PM.` |
| check_in | `You have already checked in today at 08:03 AM` |
| check_in | `You have already completed your shift for today.` |
| location / batch | `No active check-in found for this rider` |
| location / batch | `Location tracking is currently paused. Please resume to continue recording.` |
| pause | `Tracking is already paused` |
| resume | `Tracking is not paused` |
| resume | `No active pause found` |
| checkout / leave-shift | `No active check-in found for today.` |

---

## What Changed (2026-07-08)

- **Movement-based pay.** A sustained stationary stretch (GPS shows no real movement) is now deducted from worked_hours the same way a declared pause is — see [Movement-Based Pay](#movement-based-pay). Pay tracks actual riding, not just elapsed clock time between check-in and check-out.
- **Automatic shift closure.** Shifts left open past the daily cutoff (default 6:00 PM) are closed automatically by a scheduled job — see [Automatic Shift Closure](#automatic-shift-closure).
- **Check-in window has an upper bound now.** Previously only "not before 6 AM" was enforced; "not at/after 6 PM" is new.
- **Pay model reworked (carried over from 2026-07-05, still current):** hourly rate is derived per rider (`daily_rate ÷ max_hours_per_day`) instead of a flat global rate, and payable hours are capped at a full day (`max_hours_per_day`, default 7h) — working longer never earns more than `daily_rate`.
- **`GET /rider/earnings/monthly` was silently broken and is now fixed.** It filtered on a `status` value (`'completed'`) that never exists in the real enum, so it always returned empty data. Rebuilt on the same service every other earnings view uses, and its `daily_breakdown` items gained two new fields: `daily_earning` (raw number) and `max_possible_earning` (this rider's full daily_rate) — see [Detailed earnings table](#detailed-earnings-table).
- **Client-side stationary throttling.** The reference web client now skips sending `/location` when the rider hasn't moved meaningfully since the last sent point (with a 2-minute heartbeat floor) — see [Send Location](#send-location).
- **Historical wallet_balance reconciliation.** Every rider's `wallet_balance` was found to be seeded with an arbitrary figure disconnected from real check-in history (up to several thousand KSh phantom balance per rider). Reconciled to equal the sum of actual unsettled `daily_earning` — if you cached a wallet balance client-side before this date, discard it and re-fetch.
- **Seeded historical data removed.** All rider check-ins, pause events, routes, and GPS points dated before 2026-07-04 were deleted (they were demo/seed data, not real activity) — don't expect history before that date to exist.

## What Changed (2026-07-04)

- **Resuming silently killed GPS recording for the rest of the day.** The lookup used to find a rider's active check-in only matched `status = 'started'`, never `'resumed'`. Any pause → resume cycle meant every `/location` call afterward failed with "no active check-in found." Fixed.
- **`/locations/batch` always returned 403.** Its validation class had authorization hardcoded to `false`. Fixed and given real per-point field validation — safe to build offline sync against.
- **Pausing didn't deduct time if the rider never resumed.** Ending a shift mid-pause used to ignore that open pause entirely. Now included in the deduction regardless of how the shift ends.
- **No minimum-hours rule existed.** Any worked time, even a few minutes, was paid. Added the 3-hour qualifying threshold with an in-app notification when a rider falls short.
- **"Leave shift" endpoint was broken and unused.** The old `/force-checkout` checked for a `status` value that never existed in the real enum, and paid out whatever placeholder figure was stored at check-in. Replaced with `/leave-shift`, sharing the exact same pay calculation as a normal end.
- **Pay rate and thresholds were hardcoded.** Moved to `config/rider_shift.php` — admins can change pay rules without a deploy.

---

## Verified Test Runs

**2026-07-08 — movement-based pay, synthetic GPS trail:**
A shift with 2 hours of GPS points including a 35-minute parked stretch (same coordinates, sub-threshold speed) correctly computed `stationary_hours: 0.58` and `worked_hours: 1.42` (2h − 0.58h), with zero declared pauses. A control run with the GPS points trimmed to fewer than 2 total correctly returned `stationary_hours: 0` (insufficient data → benefit of the doubt, not penalized).

**2026-07-08 — automatic closure, three scenarios:**
1. Shift abandoned 3 days ago mid-`started`, no pause → closed at that day's 6 PM, 8.92h elapsed, capped to 7h payable, KSh 70.00 (full daily rate).
2. Shift abandoned 2 days ago, paused after 40 minutes and never resumed → closed at that day's 6 PM with the pause correctly extended to the cutoff, 0.67h worked, correctly unpaid (below 3h minimum).
3. A shift started earlier the same day (before that day's cutoff had passed) was correctly left untouched by the same run — confirms the job only closes shifts whose own day's cutoff has already passed, not everything indiscriminately.

Re-running immediately afterward closed zero additional shifts (idempotent).

**2026-07-04 — start → pause → resume → end (PASS)**

1. Check in via QR `QR-C81E728D` → `started`
2. Send 2 location points → recorded
3. Pause → `paused`
4. Send location while paused → rejected — "tracking is currently paused"
5. Resume → `resumed`
6. Send 2 more location points → recorded — confirms the fix
7. End shift (≈4 real minutes worked, 3 paused) → `worked_hours: 0`, correctly unpaid

**2026-07-04 — start → leave shift (sickness) (PASS)**

1. Check in via QR `QR-ECCBC87E` → `started`
2. Send location points → recorded
3. Leave shift, reason: sickness (≈4h simulated) → `worked_hours: 4`, paid, `end_reason: "sickness"`
