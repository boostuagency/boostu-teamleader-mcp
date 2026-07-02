# Teamleader Focus — Confirmed Endpoint Manifest

**Source of truth** for Teamleader Focus API endpoint names used in this project.

## Probe semantics

All probes hit `https://api.focus.teamleader.eu/<endpoint>` with `POST {}` and a valid Bearer token.

| HTTP status | Meaning |
|-------------|---------|
| 200 | Endpoint exists and accepted the empty body |
| 400 | Endpoint exists but rejected the minimal body (still "confirmed") |
| 403 | Endpoint exists but this account lacks the required module/permission |
| 404 | Endpoint does not exist at this path |

Probe run: 2026-06-08. Token rotation is persisted to `.teamleader-token` via `TEAMLEADER_TOKEN_STORE`.

---

## Section 1 — List / reference endpoints (probed)

### Previously confirmed (not re-probed this session)

| Endpoint | Status | Exists? | Notes |
|----------|--------|---------|-------|
| quotations.create | — | Yes | Confirmed by prior session work |
| quotations.info | — | Yes | Confirmed by prior session work |
| products.list | — | Yes | Re-confirmed below |
| products.info | — | Yes | Confirmed by prior session work |
| taxRates.list | — | Yes | Re-confirmed below |
| deals.list | — | Yes | Confirmed by prior session work |
| deals.info | — | Yes | Confirmed by prior session work |
| deals.create | — | Yes | Confirmed by prior session work |
| deals.update | — | Yes | Confirmed by prior session work |
| companies.list | — | Yes | Confirmed by prior session work |
| contacts.list | — | Yes | Confirmed by prior session work |

### Probe results (2026-06-08)

| Endpoint | Probe status | Exists? | Notes |
|----------|-------------|---------|-------|
| quotations.list | 200 | Yes | |
| subscriptions.list | 200 | Yes | |
| creditNotes.list | 200 | Yes | |
| products.list | 200 | Yes | |
| productCategories.list | 200 | Yes | |
| priceLists.list | 200 | Yes | |
| unitsOfMeasure.list | 200 | Yes | |
| projects.list | 403 | Yes (no module access) | Endpoint exists but this account does not have the Projects module enabled. Use this endpoint name when the module is active. |
| projects-v2.projects.list | 404 | No | The alternative v2 path does not exist; `projects.list` (403) is the correct name. |
| milestones.list | 403 | Yes (no module access) | Endpoint exists but requires Projects module. Correct name confirmed as `milestones.list`. |
| timeTracking.list | 200 | Yes | |
| calls.list | 200 | Yes | |
| meetings.list | 200 | Yes | |
| activityTypes.list | 200 | Yes | |
| tickets.list | 200 | Yes | |
| ticketStatus.list | 200 | Yes | |
| users.list | 200 | Yes | |
| teams.list | 200 | Yes | |
| departments.list | 200 | Yes | |
| customFieldDefinitions.list | 200 | Yes | |
| dealPhases.list | 200 | Yes | |
| dealPipelines.list | 200 | Yes | |
| dealSources.list | 200 | Yes | |
| lostReasons.list | 200 | Yes | |
| taxRates.list | 200 | Yes | |
| paymentTerms.list | 200 | Yes | |
| currencies.list | 404 | No | No currencies.list endpoint exists. Currency data may be embedded in other resources or available via a different path — needs lookup in the API reference. |
| withholdingTaxRates.list | 200 | Yes | |
| files.list | 400 | Yes | Endpoint exists; empty body rejected (likely requires `filter` param). |
| notes.list | 400 | Yes | Endpoint exists; empty body rejected (likely requires `filter` param such as `linked_to`). |
| webhooks.list | 200 | Yes | |

---

## Section 2 — Write endpoints (documented, not probed)

These endpoints are needed by later implementation tasks. They are listed here based on Teamleader Focus API documentation conventions. All are marked **documented (unverified by probe)** — later tasks should verify against actual API responses before shipping.

### Quotations

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| quotations.create | `deal_id`, `grouped_lines` | |
| quotations.update | `id`, fields to update | |
| quotations.accept | `id` | Action name unverified; may be `quotations.markAccepted` — verify. |
| quotations.send | `id` | Action name unverified; may be `quotations.sendByEmail` — verify. |

### Invoices

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| invoices.list | `filter` | Confirmed 200 in prior session |
| invoices.info | `id` | Confirmed in prior session |
| invoices.create | `invoicee`, `grouped_lines` | |
| invoices.book | `id` | Books a draft invoice |
| invoices.send | `id` | Sends invoice by email |
| invoices.registerPayment | `id`, `payment` | |
| invoices.download | `id` | Returns PDF download link |
| invoices.creditNote.create | `invoice_id` | Exact sub-resource path unverified; may be `creditNotes.create` — verify. |

### Subscriptions

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| subscriptions.create | `description`, `invoicee`, `grouped_lines`, `starts_on`, `recurrence_type` | |
| subscriptions.update | `id`, fields to update | |
| subscriptions.deactivate | `id` | Action name unverified; may be `subscriptions.close` — verify. |

### Projects (requires Projects module)

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| projects.create | `title`, `customer` | Module must be active; endpoint exists (403 probe). |
| projects.info | `id` | |
| projects.update | `id`, fields to update | |

### Milestones (requires Projects module)

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| milestones.create | `project_id`, `name`, `due_date` | Module must be active; endpoint exists (403 probe). |
| milestones.info | `id` | |
| milestones.update | `id`, fields to update | |

### Time Tracking

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| timeTracking.add | `started_on`, `duration`, `subject` | Action name unverified; may be `timeTracking.create` — verify. |
| timeTracking.update | `id`, fields to update | |
| timeTracking.delete | `id` | |

### Timers

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| timers.start | `subject` | Exact resource path unverified; may live under `timeTracking` rather than a separate `timers.*` namespace — verify. |
| timers.stop | `id` | Same caveat as above. |

### Calls

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| calls.add | `subject`, `started_at` | Action name unverified; may be `calls.create` — verify. |
| calls.complete | `id` | Action name unverified — verify. |
| calls.update | `id`, fields to update | |

### Meetings

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| meetings.create | `title`, `starts_at`, `ends_at` | Action name unverified; may be `meetings.schedule` — verify. |
| meetings.update | `id`, fields to update | |
| meetings.complete | `id` | Action name unverified — verify. |

### Tickets

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| tickets.create | `subject`, `description`, `customer` | |
| tickets.update | `id`, fields to update | |
| tickets.reply | `id`, `message` | Exact endpoint name unverified; may be `tickets.addReply`, `tickets.createMessage`, or `ticketMessages.create` — verify. |

### Contacts & Companies (tagging)

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| contacts.tag | `id`, `tags` | Action name unverified; may be `contacts.linkToTag` or similar — verify. |
| contacts.untag | `id`, `tags` | Same caveat as above. |
| companies.tag | `id`, `tags` | Same caveat. |
| companies.untag | `id`, `tags` | Same caveat. |

### Notes

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| notes.create | `content`, `linked_to` | |
| notes.update | `id`, `content` | |

### Files

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| files.upload | (multipart form or `content` + `name` + `linked_to`) | Exact upload mechanism unverified (multipart vs base64 JSON) — verify. |
| files.download | `id` | Returns signed download URL. |
| files.delete | `id` | |

### Webhooks

| Endpoint | Required body fields (known) | Notes |
|----------|------------------------------|-------|
| webhooks.register | `url`, `types` | Action name unverified; may be `webhooks.create` or `webhooks.subscribe` — verify. |
| webhooks.unregister | `id` | Action name unverified; may be `webhooks.delete` or `webhooks.unsubscribe` — verify. |
