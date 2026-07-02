// scripts/probe-endpoints.mjs — read-only endpoint existence probe.
// Sends a minimal body to each *.list / reference endpoint and records HTTP status.
// 200 = exists; 400 = exists but body invalid (still "exists"); 404 = missing.
import { TeamleaderAuth } from "../dist/api/auth.js";

const auth = new TeamleaderAuth({
  clientId: process.env.TEAMLEADER_CLIENT_ID,
  clientSecret: process.env.TEAMLEADER_CLIENT_SECRET,
  refreshToken: process.env.TEAMLEADER_REFRESH_TOKEN,
});

const LIST_ENDPOINTS = [
  "quotations.list", "subscriptions.list", "creditNotes.list",
  "products.list", "productCategories.list", "priceLists.list", "unitsOfMeasure.list",
  "projects.list", "projects-v2.projects.list", "milestones.list",
  "timeTracking.list", "calls.list", "meetings.list", "activityTypes.list",
  "tickets.list", "ticketStatus.list",
  "users.list", "teams.list", "departments.list",
  "customFieldDefinitions.list",
  "dealPhases.list", "dealPipelines.list", "dealSources.list", "lostReasons.list",
  "taxRates.list", "paymentTerms.list", "currencies.list", "withholdingTaxRates.list",
  "files.list", "notes.list", "webhooks.list",
];

const token = await auth.getAccessToken();
const results = {};
for (const ep of LIST_ENDPOINTS) {
  const res = await fetch(`https://api.focus.teamleader.eu/${ep}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  results[ep] = res.status;
  console.log(res.status, ep);
}
console.log("\nJSON:\n" + JSON.stringify(results, null, 2));
