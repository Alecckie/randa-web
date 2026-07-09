# Rider Registration & Onboarding API

> Updated: 2026-06-30 (added notifications section)  
> Backend: Laravel + Sanctum (`randa-web`)  
> For use by: Mobile (Flutter) team

All requests require:
```
Content-Type: application/json      (JSON endpoints)
Accept: application/json            (ALL endpoints — missing this causes a 406 HTML error)
Authorization: Bearer <token>       (all authenticated endpoints)
```

---

## Full Onboarding Flow

```
REGISTER → LOCATION → DOCUMENTS + NATIONAL ID → CONTACT INFO → AGREEMENT
    ↓
 status: incomplete
                                                                      ↓
                                                              status: pending  ← auto set when all steps done
                                                                      ↓
                                                         Admin reviews on web dashboard
                                                                      ↓
                                                    status: approved  OR  status: rejected
                                                                      ↓
                                                          Rider can start work
```

---

## Screen 1 — Register

**No auth required.**

```
POST /api/v1/register
Content-Type: application/json
Accept: application/json
```

### Request Body

| Field | Required | Rules |
|-------|----------|-------|
| `email` | Yes | Valid email, unique |
| `password` | Yes | Min 8 characters |
| `role` | Yes | Must be exactly `"rider"` |
| `first_name` | No | Letters and spaces only |
| `last_name` | No | Letters and spaces only |
| `phone` | No | Must be `254XXXXXXXXX` — exactly 12 digits, Kenya country code |

```json
{
  "email": "john.doe@example.com",
  "password": "secret123",
  "role": "rider",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "254716516287"
}
```

### Success — `201`

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "rider",
      "phone": "254716516287",
      "is_active": true
    },
    "token": "1|abc123..."
  }
}
```

Save the `token`. Use it as `Authorization: Bearer <token>` for all subsequent requests.

**After successful registration → redirect to Screen 2 (Location).**

---

## Screen 2 — Location Setup

Location must be completed first. All other profile steps fail until a rider record exists (created by this step).

### 2a. Fetch Counties (no auth required for location lookups — auth:sanctum required)

```
GET /api/v1/locations/counties
```

Returns a list of counties with `id` and `name`. Use the `id` values for the next call.

```
GET /api/v1/locations/counties/{county_id}/subcounties
```

```
GET /api/v1/locations/subcounties/{subcounty_id}/wards
```

Chain these three: pick county → load sub-counties → pick one → load wards → pick one.

### 2b. Submit Location

```
POST /api/v1/rider/profile/location
Authorization: Bearer <token>
```

```json
{
  "location": {
    "county_id": 1,
    "sub_county_id": 5,
    "ward_id": 23,
    "stage_name": "Westlands Stage",
    "latitude": -1.2634,
    "longitude": 36.8032,
    "notes": "Near the petrol station"
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `location.county_id` | Yes | From counties list |
| `location.sub_county_id` | Yes | From subcounties list |
| `location.ward_id` | Yes | From wards list |
| `location.stage_name` | Yes | Where the rider normally operates |
| `location.latitude` | No | GPS coordinate |
| `location.longitude` | No | GPS coordinate |
| `location.notes` | No | Max 1000 chars |

### Success — `200`

```json
{
  "success": true,
  "message": "Location details saved successfully!",
  "data": {
    "rider": {
      "id": 12,
      "status": "incomplete",
      "has_location": true,
      "has_documents": false,
      "has_contact_info": false,
      "has_agreement": false
    },
    "step_completed": "location"
  }
}
```

**After success → redirect to Screen 3 (Documents).**

---

## Screen 3 — Documents & National ID

Two separate actions on this screen:

### 3a. Submit National ID Number (text)

The ID number is a text field — submit it via the batch documents endpoint:

```
POST /api/v1/rider/profile/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Required | Notes |
|-------|----------|-------|
| `national_id` | Yes (for this call) | ID number string, max 20 chars, unique |

All other fields on this endpoint are optional — you can submit just `national_id` here.

### 3b. Upload Each Document (one at a time)

```
POST /api/v1/rider/profile/upload-document
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Value |
|-------|-------|
| `field_name` | one of the six names below |
| `file` | image or PDF, max 10 MB |

Valid `field_name` values — all six must be uploaded before the profile is considered complete:

| field_name | Description |
|------------|-------------|
| `national_id_front_photo` | Front of national ID |
| `national_id_back_photo` | Back of national ID |
| `passport_photo` | Passport-style photo of rider |
| `good_conduct_certificate` | Police clearance / certificate of good conduct |
| `motorbike_license` | Rider's motorbike licence |
| `motorbike_registration` | Motorbike registration document |

Call this endpoint once per document. Show the rider a checklist of which ones are done.

### Success — `200`

```json
{
  "success": true,
  "message": "Document uploaded successfully!",
  "data": {
    "field_name": "national_id_front_photo",
    "url": "..."
  }
}
```

**After all six documents and national ID number are submitted → redirect to Screen 4 (Contact).**

---

## Screen 4 — Contact & M-Pesa

```
POST /api/v1/rider/profile/contact
Authorization: Bearer <token>
```

```json
{
  "mpesa_number": "254716516287",
  "next_of_kin_name": "Jane Doe",
  "next_of_kin_phone": "254712345678"
}
```

All three fields are required. Phone numbers must be `254XXXXXXXXX`.

### Success — `200`

```json
{
  "success": true,
  "message": "Contact and payment information saved successfully!",
  "data": {
    "rider": {
      "status": "incomplete",
      "has_location": true,
      "has_documents": false,
      "has_contact_info": true,
      "has_agreement": false
    },
    "step_completed": "contact"
  }
}
```

**After success → redirect to Screen 5 (Agreement).**

---

## Screen 5 — Agreement

Display the RANDA terms on screen and require the rider to type or digitally sign an acceptance statement.

```
POST /api/v1/rider/profile/agreement
Authorization: Bearer <token>
```

```json
{
  "signed_agreement": "I John Doe agree to the RANDA terms and conditions and confirm all information provided is accurate."
}
```

`signed_agreement` is required and must be at least 10 characters.

### Success — `200`

When this is the final missing step and all others are complete, the server automatically sets `status` to `"pending"`:

```json
{
  "success": true,
  "message": "Agreement signed successfully! Your profile is now complete and under review.",
  "data": {
    "rider": {
      "status": "pending",
      "has_location": true,
      "has_documents": true,
      "has_contact_info": true,
      "has_agreement": true
    },
    "step_completed": "agreement",
    "is_complete": true
  }
}
```

**After success → redirect to Screen 6 (Awaiting Approval).**

---

## Screen 6 — Awaiting Approval (Pending Review)

Show a holding screen. Poll the profile endpoint to detect when the admin approves.

```
GET /api/v1/rider/profile
Authorization: Bearer <token>
```

### Response shape

```json
{
  "success": true,
  "data": {
    "rider": {
      "id": 12,
      "status": "pending",
      "has_location": true,
      "has_documents": true,
      "has_contact_info": true,
      "has_agreement": true,
      "daily_rate": null,
      "mpesa_number": "254716516287"
    }
  }
}
```

### Status values and what to show

| `status` | What to show |
|----------|-------------|
| `incomplete` | Return rider to the incomplete step (check `has_location`, `has_documents`, `has_contact_info`, `has_agreement`) |
| `pending` | "Your profile is under review. We'll notify you once approved." — block all app features |
| `approved` | Allow full access — rider can be assigned helmets and start campaigns |
| `rejected` | Show rejection screen with reason (see below) — block access |

**The rider cannot be assigned a helmet or start a trip until `status === "approved"`.**

---

## Screen 7 — Rejected (if applicable)

If `status === "rejected"`, fetch the rejection reason:

```
GET /api/v1/rider/profile/details
Authorization: Bearer <token>
```

The full profile response includes rejection reasons so you can display a message like:
> "Your application was not approved. Reason: [reason text]. Please contact support or resubmit your documents."

---

## Login (returning riders)

```
POST /api/v1/login
Content-Type: application/json
Accept: application/json
```

```json
{
  "email": "john.doe@example.com",
  "password": "secret123"
}
```

After login, immediately call `GET /api/v1/rider/profile` and check `status` to decide which screen to show — incomplete riders should be routed back into the onboarding flow, not the main app.

### Login errors

| HTTP | `error` field | Meaning |
|------|--------------|---------|
| 401 | — | Wrong email or password |
| 403 | `INVALID_ROLE` | Account exists but is not a rider |
| 403 | — | Account is deactivated |
| 429 | — | Too many attempts (5 max), wait and retry |

---

## In-App Notifications (Mobile)

RANDA uses database-backed in-app notifications only. There is no Firebase / APNs push integration — the app polls a REST endpoint on a timer and on foreground resume.

---

### Base URL and required headers

Every notification request must include these headers:

```
Authorization: Bearer <token>
Accept:        application/json
Content-Type:  application/json
```

Replace `<token>` with the bearer token returned at login or registration.

---

### Endpoint 1 — Fetch notifications

```
GET /api/v1/notifications
```

No request body or query parameters.

#### Success response — `200 OK`

```json
{
  "notifications": [
    {
      "id": "71e294fb-67b5-4832-889f-97930aaef156",
      "type": "App\\Notifications\\GeneralNotification",
      "data": {
        "title": "Application Approved!",
        "body": "Your rider application has been approved. You can now start working with RANDA.",
        "type": "success",
        "link": "/rider/rider-dash"
      },
      "read_at": null,
      "created_at": "2026-06-30T10:00:00.000000Z"
    },
    {
      "id": "a1b2c3d4-0000-0000-0000-000000000001",
      "type": "App\\Notifications\\GeneralNotification",
      "data": {
        "title": "Complete Your Profile",
        "body": "Hi John, please complete your rider profile by uploading the required documents to start earning with us.",
        "type": "warning",
        "link": "/rider/show-profile"
      },
      "read_at": "2026-06-30T09:00:00.000000Z",
      "created_at": "2026-06-29T08:00:00.000000Z"
    }
  ],
  "unread_count": 1
}
```

> **Important:** The response is a flat object — `notifications` and `unread_count` are at the top level. There is no `success` or `data` wrapper on this endpoint.

#### Response field reference

| Field | Type | Notes |
|-------|------|-------|
| `notifications` | array | Up to 30 items, newest first |
| `notifications[].id` | UUID string | Required for mark-as-read calls |
| `notifications[].data.title` | string | Short heading — display as the notification title |
| `notifications[].data.body` | string | Full message — display as subtitle or body text |
| `notifications[].data.type` | `"info"` / `"success"` / `"warning"` / `"error"` | Use to set colour/icon |
| `notifications[].data.link` | string or `null` | Web path — map to a Flutter route (table below) |
| `notifications[].read_at` | ISO 8601 string or `null` | `null` means unread |
| `unread_count` | integer | Pre-computed — use directly for the bell badge |

#### Error responses

| HTTP | Meaning |
|------|---------|
| `401 Unauthorized` | Token missing, expired, or revoked — redirect to login |
| `403 Forbidden` | Token valid but account deactivated |
| `500` | Server error — show a generic retry message |

---

### Endpoint 2 — Mark one notification as read

```
POST /api/v1/notifications/{id}/read
```

Replace `{id}` with the UUID from `notifications[].id`. No request body.

Call this immediately when the rider taps a notification, before navigating to the linked screen.

#### Success response — `200 OK`

```json
{ "success": true }
```

#### Error responses

| HTTP | Meaning |
|------|---------|
| `401` | Token invalid — redirect to login |
| `404` | Notification not found or belongs to a different user |

---

### Endpoint 3 — Mark all as read

```
POST /api/v1/notifications/read-all
```

No request body.

#### Success response — `200 OK`

```json
{ "success": true }
```

#### Error responses

| HTTP | Meaning |
|------|---------|
| `401` | Token invalid — redirect to login |

---

### Notification types and their colours

| `data.type` | Suggested colour | When used |
|-------------|-----------------|-----------|
| `success` | Green | Approval events |
| `warning` | Amber / Orange | Reminders, profile incomplete |
| `error` | Red | Rejection events |
| `info` | Blue | General announcements |

---

### All notifications a rider can receive

| Trigger | `data.title` | `data.body` (example) | `data.type` | `data.link` |
|---------|-------------|----------------------|-------------|-------------|
| Admin approves rider application | `"Application Approved!"` | `"Your rider application has been approved. You can now start working with RANDA."` | `success` | `/rider/rider-dash` |
| Admin rejects rider application | `"Application Not Approved"` | `"Your rider application was not approved. Reason: [reason]"` | `error` | `/rider/show-profile` |
| Admin sends profile completion reminder | `"Complete Your Profile"` | `"Hi [name], please complete your rider profile by uploading the required documents..."` | `warning` | `/rider/show-profile` |

> Notifications sent by the rider to admins (e.g. "New Rider Application") are admin-side only and will never appear in the rider's own notification list.

---

### `data.link` → Flutter route mapping

| `data.link` value | Navigate to |
|-------------------|-------------|
| `/rider/rider-dash` | Home / Dashboard screen |
| `/rider/show-profile` | Profile & documents screen |
| `/rider/campaigns` | My campaigns screen |
| `/rider/checkin` | Check-in screen |

If `data.link` is `null` or not in this map, tap the notification to mark it read but do not navigate.

---

### Polling strategy

The backend has no push capability. The app must poll.

| App state | What to poll | Interval |
|-----------|-------------|----------|
| Onboarding (`status: pending`) | `GET /api/v1/notifications` + `GET /api/v1/rider/profile` | Every 30 s |
| Active (`status: approved`) | `GET /api/v1/notifications` | Every 60 s |
| App brought to foreground | Both endpoints | Immediately |
| App sent to background | — | Cancel timer |

Poll both endpoints together during onboarding so that the `approved` / `rejected` status change triggers an automatic screen transition without requiring the rider to manually refresh.

---

### Flutter implementation

#### pubspec.yaml dependencies

```yaml
dependencies:
  http: ^1.2.0
  provider: ^6.1.0
```

---

#### `lib/models/app_notification.dart`

```dart
class AppNotification {
  final String id;
  final String title;
  final String body;
  final String type;    // "info" | "success" | "warning" | "error"
  final String? link;
  final bool isRead;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    this.link,
    required this.isRead,
    required this.createdAt,
  });

  AppNotification copyWith({bool? isRead}) => AppNotification(
        id:        id,
        title:     title,
        body:      body,
        type:      type,
        link:      link,
        isRead:    isRead ?? this.isRead,
        createdAt: createdAt,
      );

  // The response shape is:
  // {
  //   "id": "uuid",
  //   "data": { "title": "...", "body": "...", "type": "...", "link": "..." },
  //   "read_at": null | "ISO string",
  //   "created_at": "ISO string"
  // }
  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>;
    return AppNotification(
      id:        json['id'] as String,
      title:     data['title'] as String,
      body:      data['body'] as String,
      type:      (data['type'] as String?) ?? 'info',
      link:      data['link'] as String?,
      isRead:    json['read_at'] != null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
```

---

#### `lib/services/notification_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/app_notification.dart';

class NotificationApiService {
  final String baseUrl;   // e.g. "https://api.randa.co.ke"
  final String token;

  NotificationApiService({required this.baseUrl, required this.token});

  Map<String, String> get _headers => {
    'Authorization': 'Bearer $token',
    'Accept':        'application/json',
    'Content-Type':  'application/json',
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────

  Future<NotificationFetchResult> fetchNotifications() async {
    final uri      = Uri.parse('$baseUrl/api/v1/notifications');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;

      // Top-level: { "notifications": [...], "unread_count": N }
      final list = (body['notifications'] as List<dynamic>)
          .map((item) => AppNotification.fromJson(item as Map<String, dynamic>))
          .toList();

      return NotificationFetchResult(
        notifications: list,
        unreadCount:   body['unread_count'] as int,
      );
    }

    if (response.statusCode == 401) throw NotificationAuthException();
    throw NotificationException('Fetch failed: ${response.statusCode}');
  }

  // ── Mark one read ─────────────────────────────────────────────────────────

  Future<void> markRead(String notificationId) async {
    final uri      = Uri.parse('$baseUrl/api/v1/notifications/$notificationId/read');
    final response = await http.post(uri, headers: _headers);

    if (response.statusCode == 401) throw NotificationAuthException();
    // 200 { "success": true } — any other status is silently ignored
  }

  // ── Mark all read ─────────────────────────────────────────────────────────

  Future<void> markAllRead() async {
    final uri      = Uri.parse('$baseUrl/api/v1/notifications/read-all');
    final response = await http.post(uri, headers: _headers);

    if (response.statusCode == 401) throw NotificationAuthException();
  }
}

// ── Result & exception types ─────────────────────────────────────────────────

class NotificationFetchResult {
  final List<AppNotification> notifications;
  final int unreadCount;
  const NotificationFetchResult({required this.notifications, required this.unreadCount});
}

class NotificationException implements Exception {
  final String message;
  const NotificationException(this.message);
  @override String toString() => message;
}

class NotificationAuthException extends NotificationException {
  const NotificationAuthException() : super('Unauthorized — token expired or revoked');
}
```

---

#### `lib/providers/notification_provider.dart`

```dart
import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/app_notification.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  NotificationProvider(this._service);

  final NotificationApiService _service;

  List<AppNotification> _notifications = [];
  int _unreadCount    = 0;
  bool _loading       = false;
  String? _error;
  Timer? _pollTimer;

  // ── Getters ───────────────────────────────────────────────────────────────

  List<AppNotification> get notifications => _notifications;
  int  get unreadCount => _unreadCount;
  bool get isLoading   => _loading;
  String? get error    => _error;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  Future<void> refresh() async {
    try {
      _error = null;
      final result    = await _service.fetchNotifications();
      _notifications  = result.notifications;
      _unreadCount    = result.unreadCount;
    } on NotificationAuthException {
      _error = 'session_expired';   // caller should redirect to login
    } on NotificationException catch (e) {
      _error = e.message;           // show a retry banner
    } finally {
      notifyListeners();
    }
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  /// Call with interval: 30 s during onboarding, 60 s when active.
  void startPolling({Duration interval = const Duration(seconds: 60)}) {
    _pollTimer?.cancel();
    refresh(); // immediate first fetch
    _pollTimer = Timer.periodic(interval, (_) => refresh());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  // ── Mark read ─────────────────────────────────────────────────────────────

  Future<void> markRead(String id) async {
    // Optimistic update — flip locally first, then call API
    _notifications = _notifications
        .map((n) => n.id == id ? n.copyWith(isRead: true) : n)
        .toList();
    _unreadCount = _notifications.where((n) => !n.isRead).length;
    notifyListeners();

    try {
      await _service.markRead(id);
    } on NotificationAuthException {
      _error = 'session_expired';
      notifyListeners();
    } catch (_) {
      // Ignore — local state already updated
    }
  }

  Future<void> markAllRead() async {
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _unreadCount   = 0;
    notifyListeners();

    try {
      await _service.markAllRead();
    } on NotificationAuthException {
      _error = 'session_expired';
      notifyListeners();
    } catch (_) {}
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
```

---

#### `lib/widgets/notification_bell.dart`

Place this in any `AppBar.actions` list.

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context) {
    final unread = context.select<NotificationProvider, int>(
      (p) => p.unreadCount,
    );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          tooltip: 'Notifications',
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        if (unread > 0)
          Positioned(
            right: 6,
            top:   6,
            child: IgnorePointer(
              child: Container(
                padding:     const EdgeInsets.all(3),
                decoration:  const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                child: Text(
                  unread > 99 ? '99+' : '$unread',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    height: 1,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
```

Usage:

```dart
AppBar(
  title: const Text('RANDA'),
  actions: const [NotificationBell(), SizedBox(width: 8)],
)
```

---

#### `lib/screens/notifications_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_notification.dart';
import '../providers/notification_provider.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  // Map web links to Flutter named routes
  static const _linkToRoute = <String, String>{
    '/rider/rider-dash':   '/home',
    '/rider/show-profile': '/profile',
    '/rider/campaigns':    '/campaigns',
    '/rider/checkin':      '/checkin',
  };

  static Color _typeColor(String type) => switch (type) {
    'success' => const Color(0xFF22C55E),  // green-500
    'warning' => const Color(0xFFF59E0B),  // amber-500
    'error'   => const Color(0xFFEF4444),  // red-500
    _         => const Color(0xFF3B82F6),  // blue-500
  };

  static String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60)  return 'just now';
    if (diff.inMinutes < 60)  return '${diff.inMinutes}m ago';
    if (diff.inHours < 24)    return '${diff.inHours}h ago';
    if (diff.inDays == 1)     return 'yesterday';
    return '${diff.inDays}d ago';
  }

  void _onTap(BuildContext context, AppNotification n) {
    final provider = context.read<NotificationProvider>();

    // Mark read (optimistic — does not block navigation)
    if (!n.isRead) provider.markRead(n.id);

    // Navigate if link maps to a known screen
    final route = n.link != null ? _linkToRoute[n.link!] : null;
    if (route != null && context.mounted) {
      Navigator.pushNamed(context, route);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider       = context.watch<NotificationProvider>();
    final notifications  = provider.notifications;
    final hasUnread      = provider.unreadCount > 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: provider.markAllRead,
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: provider.isLoading && notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_none, size: 56, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      Text("You're all caught up!", style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: provider.refresh,
                  child: ListView.separated(
                    itemCount: notifications.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 56),
                    itemBuilder: (context, i) {
                      final n = notifications[i];
                      return InkWell(
                        onTap: () => _onTap(context, n),
                        child: Container(
                          color: n.isRead ? null : const Color(0xFFFFF7ED), // orange-50
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Type indicator dot
                              Container(
                                margin: const EdgeInsets.only(top: 5, right: 12),
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: _typeColor(n.type),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              // Content
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      n.title,
                                      style: TextStyle(
                                        fontWeight: n.isRead ? FontWeight.w500 : FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      n.body,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _timeAgo(n.createdAt),
                                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                    ),
                                  ],
                                ),
                              ),
                              // Chevron if navigable
                              if (n.link != null && _linkToRoute.containsKey(n.link!))
                                Icon(Icons.chevron_right, size: 18, color: Colors.grey[400]),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
```

---

#### `lib/screens/pending_approval_screen.dart` — auto-transition on approval

Poll both notifications and profile status every 30 seconds while the rider is waiting. Navigate automatically when the admin acts.

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../services/rider_service.dart';   // your existing rider profile service

class PendingApprovalScreen extends StatefulWidget {
  const PendingApprovalScreen({super.key});
  @override State<PendingApprovalScreen> createState() => _State();
}

class _State extends State<PendingApprovalScreen> with WidgetsBindingObserver {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startPolling();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _poll(); // immediate check on foreground
    }
  }

  void _startPolling() {
    _poll(); // run once immediately
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _poll());
  }

  Future<void> _poll() async {
    if (!mounted) return;

    // 1. Refresh notification badge
    await context.read<NotificationProvider>().refresh();

    // 2. Check profile status
    try {
      final riderService = context.read<RiderService>();
      final profile      = await riderService.getProfile();

      if (!mounted) return;

      if (profile.status == 'approved') {
        _timer?.cancel();
        Navigator.pushReplacementNamed(context, '/home');
      } else if (profile.status == 'rejected') {
        _timer?.cancel();
        Navigator.pushReplacementNamed(context, '/profile');
      }
    } catch (_) {
      // Network error — stay on screen and try again next interval
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.select<NotificationProvider, int>((p) => p.unreadCount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Under Review'),
        actions: [NotificationBell(), const SizedBox(width: 8)],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              const Text(
                'Your application is under review',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'We\'ll notify you as soon as an admin has reviewed your profile. '
                'This usually takes 1–2 business days.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              if (unread > 0) ...[
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, '/notifications'),
                  icon: const Icon(Icons.notifications),
                  label: Text('You have $unread new notification${unread > 1 ? 's' : ''}'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
```

---

#### Wiring it all up — `main.dart`

```dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        Provider<NotificationApiService>(
          create: (_) => NotificationApiService(
            baseUrl: 'https://api.randa.co.ke',
            token:   SecureStorage.getToken(), // your token storage
          ),
        ),
        ChangeNotifierProxyProvider<NotificationApiService, NotificationProvider>(
          create: (ctx) => NotificationProvider(ctx.read<NotificationApiService>()),
          update: (_, service, prev) => prev ?? NotificationProvider(service),
        ),
      ],
      child: const RandaApp(),
    ),
  );
}
```

Start polling after the rider logs in or reaches the home/pending screen:

```dart
// After login, in your post-login routing logic:
final provider = context.read<NotificationProvider>();

if (riderStatus == 'pending') {
  // Poll aggressively — waiting for admin approval
  provider.startPolling(interval: const Duration(seconds: 30));
  Navigator.pushReplacementNamed(context, '/pending-approval');
} else {
  // Normal cadence
  provider.startPolling(interval: const Duration(seconds: 60));
  Navigator.pushReplacementNamed(context, '/home');
}
```

Stop polling on logout:

```dart
context.read<NotificationProvider>().stopPolling();
```

---

## Common Pitfalls

1. **Missing `Accept: application/json`** — server returns `406 Not Acceptable` with an HTML body instead of JSON. Every request must include this header.
2. **`role` must be `"rider"`** — omitting it or sending another value causes 422.
3. **Phone must be `254XXXXXXXXX`** — no `+`, no leading `0`, exactly 12 digits.
4. **Location must come first** — documents, contact, and agreement all return `400` if the location step hasn't been completed.
5. **`national_id` number is separate from photos** — submit it via `POST /api/v1/rider/profile/documents` as a form field alongside or separately from photo uploads.
6. **`status: pending` ≠ can work** — riders must wait for admin approval (`status: approved`) before helmet assignment is possible.
