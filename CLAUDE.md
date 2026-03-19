# Tally — Media Planning & Buying Platform
### Claude Code Project Brief | Sage Media Planning & Placement, Inc.

> **How to use this file:** This is your persistent project spec. Read it at the start of every session. All build decisions, feature priorities, business logic, and prompt sequences live here. When in doubt, refer back to this file before writing any code.

---

## What is Tally?

Tally is Sage's proprietary media planning and buying platform — purpose-built for **political campaigns and issue advocacy organizations**. It replaces the current Excel-based workflow with a dynamic, multi-section web application that handles everything from inventory selection and market targeting through weekly actualization and PDF-ready client deliverables.

Tally is powered by an embedded AI assistant named **"Sage"** (built on the Claude API), enabling clients to interact with their media plans conversationally — asking questions, requesting scenario changes, and reviewing performance in plain English.

**Firm:** Sage Media Planning & Placement, Inc.  
**Primary users:** Sage planners (admin), political campaign clients (read/review)  
**Client types:** Candidates, Issue Advocacy Organizations, PACs  

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Prisma ORM + PostgreSQL |
| Database/Auth | Supabase (auth + real-time + hosted Postgres) |
| PDF Export | Playwright headless browser |
| AI Assistant | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Sharing | Tokenized expiring links — no login required for client review |

**Brand color:** `#2D6A4F` (Sage green) — use as primary throughout.

---

## Database Schema

Create these Prisma models. Field details below each.

### Plan
```
id, clientName, clientType (CANDIDATE | ISSUE_ADVOCACY | PAC),
electionType (PRIMARY | GENERAL), isElectionWeek (bool),
startDate, endDate, windowDate (auto: endDate - 45 days),
flightLengthDays (auto), flightLengthWeeks (auto),
commissionPct (default: 0.15), status (DRAFT | IN_REVIEW | APPROVED),
createdAt, updatedAt
```

### Market
```
id, planId, name (DMA name), districtVotePct, hispanicPct,
cppQ3OOW_A35, cppQ3IW_A35, cppEarlyQ4_A35, cppLateQ4_A35,
cppQ3OOW_H25, cppQ3IW_H25, cppEarlyQ4_H25, cppLateQ4_H25,
sortOrder
```

### MediaSection
```
id, planId, name (e.g. "Broadcast TV English"), type
(BROADCAST_TV | SPANISH_TV | CABLE | RADIO | DIGITAL_OTT | DISPLAY | STREAMING),
sortOrder
```

### LineItem
```
id, sectionId, marketId, tacticName, audienceDemo, adServingEnabled (bool),
reachEstimate, frequency, notes, sortOrder
```

### FlightWeek
```
id, planId, weekNumber (1 = election week, counts up going back),
startDate, endDate, label (e.g. "Oct 27 - Nov 3"), isLocked (bool)
```

### LineItemWeekValue
```
id, lineItemId, flightWeekId,
plannedPoints, plannedImpressions, plannedCost,
actualPoints, actualImpressions, actualCost
```

### DigitalTactic
```
id, searchKey, displayName, platform, adLength, cpm, servingCpm,
platformType (CTV_OTT | YOUTUBE | META | AUDIO | VOD | TIKTOK | OTHER)
```

### AudienceProfile
```
id, searchKey, geography, audienceName, language, listSize, url,
coverageTvStreaming, coverageYoutube, coverageYoutubeTV,
coverageMeta, coverageAudio, coverageVod, coverageDigital
```

### ShareToken
```
id, planId, token (uuid), expiresAt, permissions (VIEW | COMMENT | APPROVE),
createdAt, usedAt
```

---

## Core Business Logic

Replicate these formulas exactly — they come from the existing Excel template.

| Calculation | Formula |
|---|---|
| Window Date | `endDate - 45 days` |
| Flight Length | `endDate - startDate` → display as "X D / Y W" |
| Week numbering | Count backwards from election. Week 1 = last week before election. |
| CPP cost | `points_per_week × num_weeks × CPP` — CPP tier selected by flight date |
| CPP tier selection | Q3 OOW = before primary window; Q3 IW = in-window Q3; Early Q4 = first half Q4; Late Q4 = final 2 weeks |
| Digital cost | `(impressions / 1000) × CPM` |
| Gross to cut | `budget ÷ (1 + serving_CPM / media_CPM)` |
| Client Gross | `net_cost ÷ (1 - commission_pct)` — default 15% |
| % of Broadcast | `section_gross ÷ total_broadcast_gross` |
| % of Plan | `section_gross ÷ grand_total_gross` |

---

## Feature List & Priorities

**P0** = Launch blocker | **P1** = Required at launch | **P2** = Post-launch

### Plan Setup
| Feature | Priority |
|---|---|
| Multi-step plan creation wizard (client info → election config → dates → markets → media mix) | P0 |
| Auto-generate flight weeks on save (Mon–Sun, counting back from election) | P0 |
| Market manager — add/remove DMAs, set CPP tiers, manual override | P0 |
| Commission % config per plan | P1 |
| Client type flag (Candidate / Issue Advocacy / PAC) | P1 |
| Plan duplication | P2 |

### Media Planning Grid
| Feature | Priority |
|---|---|
| Spreadsheet-like weekly grid per section (columns = weeks, rows = line items) | P0 |
| Tabbed sections: Broadcast TV (English), Spanish-Language TV, Cable, Radio, Digital/OTT, Display, Streaming | P0 |
| Inline cost calculation (points → CPP cost OR impressions → CPM cost) | P0 |
| Live row totals, section subtotals, grand total | P0 |
| % of broadcast and % of plan per section | P1 |
| Ad serving toggle per row (pulls serving CPM, calculates gross-to-cut) | P1 |
| COH (Competitive/Opposition Holdout) gross value field at footer | P1 |
| Competitive tracking / ratings / payment delivery line at footer | P1 |

### Inventory & Market Selection
| Feature | Priority |
|---|---|
| Searchable inventory database (seeded from Digital Targeting tab — 800+ items) | P0 |
| Filter by platform, format, ad length | P0 |
| Market selector with DMA typeahead, auto-populate CPP from rate card | P0 |
| CPM rate card per platform, per-row override | P1 |
| Coverage estimates displayed when digital tactic added | P1 |
| Hispanic market flag → surface Spanish-Language TV CPP + suggest Spanish inventory | P1 |

### Audience & Reach Planning
| Feature | Priority |
|---|---|
| Audience profile library (seeded from Digital Targeting tab) | P1 |
| Per-platform reach estimates on digital line items | P1 |
| Demo tagging per line item (A35+, H25+, custom) | P1 |
| Frequency input per digital line item | P2 |
| Aggregate reach/frequency summary across digital line items | P2 |

### Cost Variability & Scenarios
| Feature | Priority |
|---|---|
| CPP tier auto-selection by flight week date, manual override | P0 |
| Budget target mode with live overage/underage indicator | P1 |
| Scenario A/B (base vs. stretch) | P2 |
| CPP sensitivity slider (apply % adjustment to all CPPs) | P2 |

### Actualization
| Feature | Priority |
|---|---|
| Actualization mode toggle — planned vs. actual side by side per cell | P1 |
| Variance reporting (actual - planned), red/amber highlights | P1 |
| Week lock (freeze completed flight weeks) | P1 |
| Actualization export (PDF or CSV) | P2 |

### Client Sharing & Review
| Feature | Priority |
|---|---|
| Tokenized expiring share link — no login required | P0 |
| Comment mode — clients leave inline comments on line items | P1 |
| Approval workflow — client marks plan approved via link; triggers Sage team notification | P1 |
| Revision history (all changes with timestamp + author) | P2 |
| Persistent client portal (login to view all plans) | P2 |

### PDF Export
| Feature | Priority |
|---|---|
| One-click PDF export via Playwright headless render | P0 |
| Branded header/footer (Sage logo, client name, plan date, page numbers, copyright) | P0 |
| Landscape orientation for weekly grid | P1 |
| Auto-generated cover page (client name, campaign, date range, summary stats) | P1 |
| Section-level export (export individual sections as standalone PDFs) | P1 |

### Sage AI Assistant
| Feature | Priority |
|---|---|
| Embedded chat panel in plan view (collapsible sidebar) | P1 |
| Plan-aware context — full plan JSON injected into every API call | P1 |
| Natural language plan queries ("What's total broadcast spend in Market A in Week 3?") | P1 |
| Scenario suggestions ("What would happen if we added 50 points to Market B in weeks 8–10?") | P2 |
| Client-facing Sage mode on share link (read-only, no plan modification) | P2 |
| Claude Cowork integration (expose plan data as structured source) | P2 |

---

## Seed Data

The project includes `Media_Plan_Template.xlsx`. On first run, seed:

1. **DigitalTactic table** — from Digital Targeting tab, rows 21–854. Fields: searchKey, displayName, CPM, platformType, adLength.
2. **AudienceProfile table** — from Digital Targeting tab, rows 21–29. Fields: geography, audienceName, language, listSize, URL, all coverage estimate columns.
3. **Default RateCard** — CPP tier structures from Media Plan Template tab, rows 7–20.

---

## Build Order (Phases)

Build in this sequence. Each phase must be fully working before starting the next.

**Phase 1 — Foundation**
Database schema + Prisma migrations + Supabase setup + seed scripts for DigitalTactic and AudienceProfile tables + basic auth (Sage admin role + planner role)

**Phase 2 — Plan Engine**
Plan creation wizard, market manager, flight week auto-generation, CPP tier logic, commission calculation, window date and length calculations

**Phase 3 — Planning Grid**
Weekly grid UI per section, tab navigation across sections, inline cost calculation, row totals, section subtotals, grand total, % of broadcast, % of plan

**Phase 4 — Digital Module**
Inventory lookup and search, CPM rate card, ad serving calculator, coverage estimates display, audience profile selector

**Phase 5 — Sharing & Export**
Share token generation, client review mode (read-only), comment system, approval workflow, PDF export via Playwright (landscape grid, branded header/footer, cover page)

**Phase 6 — Actualization**
Actualization mode toggle, planned vs. actual display, variance calculation and highlighting, week locking

**Phase 7 — Sage AI**
Claude API integration, plan-aware context injection, embedded chat panel, client-facing mode

---

## Sage AI — System Prompt

Use this system prompt verbatim when initializing the Claude API call for the Sage assistant:

```
You are Sage, the AI assistant built into Tally — a media planning platform used by political campaigns and issue advocacy organizations. You have full access to the current media plan data provided below.

Answer questions about the plan directly and confidently. You understand political media buying deeply: CPP, GRPs, dayparts, flight windows, DMA markets, broadcast and cable inventory, digital targeting, CTV, OTT, programmatic, reach and frequency. You know the difference between a Primary window and a General, and why Late Q4 CPPs hit different.

Keep your tone sharp, expert, and a little witty. You work for Sage Media Planning & Placement. When a client asks a question, give them the answer — not a hedge.

Current plan data:
{{plan_json}}
```

Replace `{{plan_json}}` with the serialized plan object (including all markets, sections, line items, and flight weeks) before sending to the API.

---

## UI/UX Principles

- **Planners live in spreadsheets.** The grid must feel native — full keyboard navigation, tab between cells, arrow key movement, copy-paste support. Do not make it feel like a form.
- **Client views are presentation-quality.** When accessed via share link, hide all internal planning controls. The plan should look like a polished deliverable, not a tool.
- **Sage AI panel feels like a colleague.** Sidebar chat, not a modal. Always visible but collapsible. Tone matches Sage brand: direct, witty, expert.
- **Color system:** `#2D6A4F` Sage green as primary. Muted palette for data. Red for overages, amber for warnings, green for on-target.
- **Mobile responsive for client review.** Clients may view share links on phones. The planning grid does not need to be mobile-optimized — planners work on desktop.
- **PDF must match screen.** Use Playwright to render the actual plan view as PDF, not a separate template. What clients see on screen is what they get in the PDF.

---

## Prompt Sequence for Claude Code Sessions

Use these prompts in order to build Tally. Paste the relevant prompt at the start of each phase.

### Prompt 1 — Project Init
```
Read CLAUDE.md fully before writing any code. Create a new Next.js 14 app with TypeScript, Tailwind CSS, and shadcn/ui called "tally". Set up Supabase for auth and database. Initialize Prisma with a PostgreSQL connection string from Supabase. Create the full schema from CLAUDE.md (Plan, Market, MediaSection, LineItem, FlightWeek, LineItemWeekValue, DigitalTactic, AudienceProfile, ShareToken). Run the initial migration.
```

### Prompt 2 — Seed Data
```
Read CLAUDE.md. Write a seed script that reads Media_Plan_Template.xlsx. Import all rows from the Digital Targeting tab (rows 21–854) as DigitalTactic records. Import audience profiles (rows 21–29) as AudienceProfile records. Import CPP tier structures from the Media Plan Template tab as a default rate card. Run the seed after confirming the schema migration succeeded.
```

### Prompt 3 — Plan Engine
```
Read CLAUDE.md. Build the plan creation API and wizard UI. The wizard collects: client name, client type, election type, start date, end date, commission %, and initial market selection. On save: auto-generate FlightWeek records (Monday–Sunday windows) counting backwards from election date with Week 1 = final week. Calculate windowDate as endDate minus 45 days. Display flight length as "X D / Y W". Implement CPP tier auto-selection logic based on flight week date ranges.
```

### Prompt 4 — Planning Grid
```
Read CLAUDE.md. Build the media planning grid UI. It should feel like a spreadsheet — keyboard navigation, tab between cells, arrow keys. Create tabbed sections (Broadcast TV English, Spanish-Language TV, Cable, Radio, Digital/OTT, Display, Streaming). Each tab shows a grid: rows = line items, columns = flight weeks. Cells accept points (broadcast) or impressions (digital). Inline calculate cost per row using CPP or CPM. Show live row totals, section subtotals, and grand total. Calculate % of broadcast and % of plan per section.
```

### Prompt 5 — Digital Module
```
Read CLAUDE.md. Build the inventory lookup and digital planning module. Add a searchable modal/drawer for adding digital line items, pulling from the seeded DigitalTactic table. Filter by platform and ad length. When a tactic is added, display CPM from the rate card (editable). Add ad serving toggle per row — when enabled, calculate gross-to-cut using the formula in CLAUDE.md. Add audience profile selector pulling from AudienceProfile table. Display platform coverage estimates on digital line items.
```

### Prompt 6 — Sharing & PDF Export
```
Read CLAUDE.md. Build the client sharing and PDF export system. Generate tokenized expiring share links that give read-only or comment access without requiring login. In client view: hide all planning controls, show the plan as a polished read-only deliverable. Allow clients to leave inline comments and click Approve. Build one-click PDF export using Playwright — render the plan view in landscape orientation with branded header (Sage logo, client name, date) and footer (page numbers, copyright line). Generate a cover page with plan summary stats.
```

### Prompt 7 — Actualization
```
Read CLAUDE.md. Build the actualization module. Add a toggle to switch a plan into Actualization mode. In this mode, each grid cell shows planned vs. actual side by side. Allow actual values to be entered week by week. Calculate variance (actual minus planned) per cell. Highlight overages red, underspend amber. Add week locking — locked weeks are read-only and shown in muted style.
```

### Prompt 8 — Sage AI
```
Read CLAUDE.md. Integrate the Claude API as the embedded Sage assistant. Add a collapsible sidebar chat panel to the plan view. On each message, serialize the full plan (markets, sections, line items, flight weeks, totals) as JSON and inject it into the system prompt using the template in CLAUDE.md. The assistant is named "Sage" in the UI — not "Claude". In client share-link view, Sage is available in read-only mode (can answer questions, cannot modify the plan).
```

---

## Open Questions (Resolve Before or During Build)

- **Rate card management** — Will CPP rate cards be managed by Sage admins in the app, or imported from Excel? How often do rates change?
- **Multi-user collaboration** — Do multiple Sage planners edit the same plan simultaneously? If yes, Supabase Realtime sync is needed from Phase 1.
- **Client portal** — Persistent client logins, or share-link access only for Phase 1?
- **Billing integration** — Should actualization data feed into invoicing, or remain standalone?
- **Inventory updates** — The Digital Targeting tab has 800+ items. Is manual re-import from Excel acceptable, or do we need an admin UI to manage inventory?
- **Cowork timeline** — Is Claude Cowork integration a client deliverable for Phase 1, or Phase 2?
- **Tally branding** — Separate Tally logo/identity, or fully under the Sage brand umbrella?

---

*Copyright 2026, Sage Media Planning & Placement, Inc. — Confidential. All Rights Reserved.*
