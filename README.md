# Service Desk: after-sales returns tracker (MVP)

Tracks a faulty unit from a retailer's store to the plant and back:

**Store rep logs complaint → Support approves or rejects → pickup slip (PDF + QR) → collected → received at plant → repaired or replaced → return slip → delivered.**

Every step records who did it and when.

| Role | Where | Can do |
|---|---|---|
| Store rep | `/rep` (phone) | Log complaints for their store, follow progress |
| Support | `/support` | Review, assign dispatchers, print slips, move tickets forward |
| Manager | `/manager`, `/admin` | Everything support can do, plus dashboard, stores, products, dispatchers and users |
| Anyone with a slip | `/verify/<token>` | Scan the QR code to check the slip is genuine and see its live status |

Stack: Next.js 15, Supabase (Postgres, Auth, row-level security), Netlify.

## Run the app

The database lives on the hosted Supabase project **cambri** (`itocjjjmztvhlcahamrz`). Its schema is already applied from [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). There is no local database.

Requires Node 20+.

```bash
npm install
cp .env.example .env.local  # project URL, publishable key, service-role key
npm run seed                # one-time: demo stores, products, dispatchers, users, sample tickets
npm run dev                 # http://localhost:3000, connected to hosted Supabase
```

Demo logins (password `Demo1234!`):

- `rep.central@example.com`: store rep at HomeMax Central (also `rep.riverside@`, `rep.valuehub@`, `rep.north@`)
- `support@example.com`: support team
- `manager@example.com`: manager

`npm run seed -- --reset` deletes all tickets and recreates the sample set.

## Deploy (Supabase + Netlify)

1. **Supabase:** the schema is already on the **cambri** project. For a fresh project, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in its SQL editor.
   Go to *Authentication → Sign In / Providers* and turn **off** "Allow new users to sign up". Only managers create accounts.
2. **Seed:** put the project's URL, publishable key and service-role key in `.env.local`, then run `npm run seed`.
3. **Netlify:** import the Git repo. The build settings come from `netlify.toml`. Add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret; used only on the server for the admin "Add user" screen)
   - `NEXT_PUBLIC_COMPANY_NAME`: shown in the header and on slips
   - `NEXT_PUBLIC_APP_TIMEZONE`, e.g. `Asia/Karachi`. Servers run on UTC, so set this.
   - `NEXT_PUBLIC_SITE_URL=https://cambri-appliances.netlify.app`, the address slip QR codes open.
   - Optional: `NEXT_PUBLIC_SHOW_DEMO_LOGINS=false` hides the demo-account hint on the login page.
4. In Supabase *Authentication → URL Configuration*, set the Site URL to your Netlify URL.

## Demo script (about 5 minutes)

1. On a phone, sign in as **rep.central**. Tap **New complaint**, pick a microwave, enter a serial and fault, and submit.
2. On a laptop, sign in as **support**. The ticket is in **Needs review**. Approve it, assign a dispatcher, then **Open PDF** to show the pickup slip.
3. Scan the slip's QR code with the phone. The verify page confirms the slip and shows the dispatcher.
4. Click through **Collected → Received at plant → Replaced** (enter the new serial) **→ Assign return → Delivered**.
5. Back on the phone, the rep sees the full timeline.
6. Sign in as **manager** to show the dashboard, then **Admin** to add a store, dispatcher or user.

## How it works

- **Workflow rules live in the database.** The `transition_ticket()` function in the migration allows only valid next steps, requires a reason to reject, a dispatcher for pickups and returns, and a serial for replacements. It writes the audit event in the same transaction. The UI calls it from [`app/actions/tickets.ts`](app/actions/tickets.ts).
- **Access control is row-level security.** Reps can only read and create tickets for their own store. Only support and managers can change tickets. Only managers can edit reference data.
- **Slips** are generated on demand by [`app/api/tickets/[id]/slip/route.tsx`](app/api/tickets/[id]/slip/route.tsx) using [`lib/pdf/Slip.tsx`](lib/pdf/Slip.tsx). The QR code links to `NEXT_PUBLIC_SITE_URL/verify/<token>`, a public, read-only page backed by the `get_ticket_by_token()` function, which exposes only a few fields.

## Not in this MVP

Customer portal, email, SMS or WhatsApp notifications, dispatcher app and GPS, photo uploads, warranty and invoice checks, ERP integration, offline mode.
