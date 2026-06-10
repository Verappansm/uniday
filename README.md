# UniDay

A full-stack university event management system built with Next.js. Handles student RSVP collection, QR-based check-in on event day, automatic seat assignment, live attendance monitoring, and email campaign tracking.

---

## What it does

Students receive a personalised email with an RSVP link. The link opens a page that shows their seat, awards, and a QR code. On the day, volunteers scan the QR at the door (or search manually) to mark attendance. The MC panel shows a live seating map that auto-refreshes every 10 seconds.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Database | MongoDB via Mongoose |
| Auth | JWT (jose) — hardcoded role-based credentials |
| Email sending | Delegated to Google Apps Script |
| Email tracking | Open pixel + click link (both stored per student) |
| QR scanning | `qr-scanner` (camera) + `qrcode.react` (display) |
| Excel import | `xlsx` |
| Styling | Tailwind CSS 4 |

---

## Roles

| Role | Access |
|---|---|
| `admin` | Everything: upload, email, seat map, stats |
| `volunteer` | Check-in only (QR scan or manual search) |
| `mc` | Read-only: live list and seating map |

---

## Pages

| Route | Description |
|---|---|
| `/login` | Credential login; sets a 24 h JWT cookie |
| `/admin` | Dashboard, Excel upload, student list, seat map, email management |
| `/volunteer` | QR scanner + manual name/reg-no search with inline check-in |
| `/mc` | Live attendance list and interactive 2×2 section seating map |
| `/rsvp/[token]` | Public student page: view seat, submit RSVP, display QR code |

---

## API routes

| Method + Path | Auth | Description |
|---|---|---|
| `POST /api/auth/login` | Public | Issue JWT cookie |
| `GET /api/auth/me` | Public | Verify session |
| `POST /api/auth/logout` | Public | Clear cookie |
| `POST /api/checkin` | admin, volunteer | Mark student as present |
| `GET /api/users` | admin, volunteer, mc | Paginated student list with filters |
| `POST /api/upload` | admin | Import students from Excel; auto-assign ground seats |
| `GET /api/seating` | admin, volunteer, mc | Seat grid for MC/volunteer seat maps |
| `PUT /api/seating` | admin | Manually update a single seat |
| `GET /api/rsvp` | Public | Load student data for RSVP page |
| `POST /api/rsvp` | Public | Submit RSVP response |
| `GET /api/dashboard` | admin | Aggregate stats (counts, email metrics, award breakdown) |
| `POST /api/email/send` | admin | Batch-send emails via Apps Script |
| `GET /api/track/open/[id]` | Public | Email open tracking pixel |

---

## Data model (MongoDB)

Each `User` document represents one student:

```
register_no       — unique, used as business key
student_name
email
phone?
school / program / branch / batch / program_code
awards            — array of { type, details }
rsvp_status       — null | 'yes' | 'no'
rsvp_reason?
qr_code           — 32-char hex token; unique; used for all links
upload_order      — preserves Excel row order
checked_in        — false until volunteer marks arrival
seating_category  — 'ground' | 'gallery'
seat?             — { section, row, column, type }
email_status      — { sent, opened, clicked, sent_at, opened_at, clicked_at }
```

---

## Seating system

Ground-floor seats are automatically assigned at upload time by `src/lib/seating.ts`.

Layout: **4 sections (S1–S4) × 15 rows (A–O) × 10 columns = 600 seats**

Assignment priority (front to back):

1. **BOGS** students → S1-A, columns 1–10
2. **Regular** (no special award) → S1-B onward through S3, sequential
3. **100% attendance** → 35 seats continuing from regular block
4. **Best sports athlete** → 2 seats
5. **NSS / NCC** → 30 seats
6. **Club awards** → entire S4; grouped by club type, each group starts on a new row

Gallery students receive no assigned seat.

---

## Email campaign

1. Admin clicks "Send Emails" in the Email tab — calls `POST /api/email/send`
2. The API fetches up to 100 unsent students, builds a payload, and POSTs to the configured `APPSCRIPT_URL`
3. The Apps Script sends the emails; results come back with a `status` per recipient
4. Students whose emails were sent get `email_status.sent = true` in MongoDB
5. Open tracking: each email embeds a 1×1 pixel pointing to `/api/track/open/<qr_code>`
6. Click tracking: the RSVP link is `/rsvp/<qr_code>`; visiting it marks `email_status.clicked = true`

---

## Environment variables

Create `.env.local` at the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/uniday

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<choose a strong password>
VOLUNTEER_USERNAME=volunteer
VOLUNTEER_PASSWORD=<choose a strong password>
MC_USERNAME=mcpanel
MC_PASSWORD=<choose a strong password>

JWT_SECRET=<long random string — do not use the placeholder>

NEXT_PUBLIC_APP_URL=https://your-domain.com
APPSCRIPT_URL=https://script.google.com/macros/s/<script-id>/exec
```

**Never commit `.env.local` to version control.**

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build
npm start        # production
```

---

## Uploading students

1. Prepare an Excel file (.xlsx) with one student per row.
2. Required columns: `REGISTER_NO` (or `REG_NO`, `REGISTER_NUMBER`, etc.) and `STUDENT_NAME` (or `NAME`).
3. Optional columns: `SCHOOL`, `PROGRAM`, `BRANCH`, `BATCH`, `PROGRAM_CODE`, `EMAIL`, `PHONE`, `AWARD_TYPE`, `AWARD_DETAILS`, `RANK`.
4. If a student appears on multiple rows (multiple awards), rows are merged automatically.
5. Upload as **Ground** or **Gallery** via the Upload tab in the admin panel.
6. Seats are assigned immediately on upload. **Do not re-upload after the event starts** — re-uploading an existing student overwrites their check-in status and QR code.

---

## Known issues / bugs to fix before production

See the [bug report](#bug-report) section below.

---

## Future: Fest mode (planned, not yet implemented)

The current system is purpose-built for a **single-venue ceremony** (one auditorium, fixed sections and rows).

A planned extension would add a **fest mode** for events spanning multiple venues simultaneously (e.g., cultural fest, tech fest). The intent:

- Admin configures the event as `single_venue` or `fest`
- In fest mode, each sub-event has a named venue instead of a fixed seat grid
- Students are assigned to venues, not rows/columns
- Volunteers are scoped to a venue; check-in is per-venue entry (and optionally exit)
- MC panel shows per-venue attendance
- The existing single-venue code stays unchanged; fest is an additive code path

**This is not implemented yet.** All current code is single-venue only.

---

## Bug report

These bugs exist in the current codebase and should be fixed before the system handles real event data.

### Critical

**1. Middleware file is named wrong — server-side auth is not running**
`src/proxy.ts` should be `src/middleware.ts`, and the exported function should be named `middleware` (not `proxy`). Next.js only picks up the middleware from a file with that exact name and export. Until this is fixed, page routes (`/admin`, `/volunteer`, `/mc`) have no server-side protection — only a client-side redirect — and several API routes listed below are completely open.

**2. `/api/upload` has no auth check**
The route never calls `requireRole()`. Anyone who can reach the server can POST an Excel file and overwrite student data.

**3. `/api/email/send` has no auth check**
Same problem. Anyone can trigger bulk email sends.

**4. `/api/users` has no auth check**
Exposes the full student list (names, emails, schools, awards) to unauthenticated requests.

**5. `/api/dashboard` has no auth check**
Exposes aggregate stats without auth.

**6. Re-uploading Excel resets the `qr_code` for existing students**
`upload/route.ts` generates a new random `qr_code` for every student, then `$set`-overwrites the entire document. If a student already exists in the database, their QR code changes. This invalidates the RSVP link in any email already sent to them and any printed QR codes.
Fix: use `$setOnInsert` for `qr_code` so it is only written on first insert, never on update.

**7. Re-uploading Excel resets `checked_in` and `rsvp_status`**
Same `$set` overwrites `checked_in: false` and `rsvp_status: null` for already-existing students. If you re-upload mid-event, all attendance data is lost.
Fix: either prevent re-upload of existing students, or exclude `checked_in` and `rsvp_status` from the `$set` update.

**8. Email QR image URL points to tracking pixel, not a QR code**
In `email/send/route.ts`, line 39: `qr_image_url` is set to the tracking pixel endpoint (`/api/track/open/<qr_code>`). The AppScript template presumably uses this to embed a scannable QR image in the email, but gets a 1×1 transparent GIF instead. Students receive an email with no scannable QR code image.
Fix: generate a real QR image URL (e.g. a QR code data-URL from the `qrcode` library) and include that in the payload.

### Minor

**9. Email batch size: route fetches 100, admin UI says 50**
The send route limits to 100 results; the admin panel describes the action as sending 50 at a time. Pick one and be consistent.
