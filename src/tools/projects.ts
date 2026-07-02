/**
 * Teamleader Nextgen Projects Tools (projects-v2)
 *
 * These tools target the nextgen project module under the `projects-v2/`
 * namespace (note the SLASH). The legacy `projects.*` and `milestones.*`
 * endpoints return 403 "no access to this module" on modern accounts.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import { respond, respondError } from "../lib/respond.js";
import { buildListBody } from "../lib/listBody.js";

export function registerProjectTools(server: McpServer, client: TeamleaderClient): void {
  // ── List Projects ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_list",
    "List nextgen projects, optionally filtered by search term or status.",
    {
      page: z.number().optional(),
      page_size: z.number().optional().describe("max 100"),
      term: z.string().optional().describe("Search term to filter projects"),
      status: z
        .enum(["running", "overdue", "over_budget", "closed"])
        .optional()
        .describe("Filter by project status"),
    },
    async (p) => {
      try {
        const filter: Record<string, unknown> = {};
        if (p.term) filter.term = p.term;
        if (p.status) filter.status = [p.status];
        const body = buildListBody({ page: p.page, page_size: p.page_size, filter });
        return respond(await client.request({ endpoint: "projects-v2/projects.list", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Get Project ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_info",
    "Get a single nextgen project by id.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "projects-v2/projects.info", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Create Project ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_create",
    "Maak een nieuw nextgen-project. Enkel title is verplicht.",
    {
      title: z.string().describe("Project title (required)"),
      description: z.string().optional().describe("Project description"),
      starts_on: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      due_on: z.string().optional().describe("Due date (YYYY-MM-DD)"),
      extra: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Any other documented projects-v2/projects.create field"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { title: p.title };
        if (p.description !== undefined) body.description = p.description;
        if (p.starts_on !== undefined) body.starts_on = p.starts_on;
        if (p.due_on !== undefined) body.due_on = p.due_on;
        Object.assign(body, p.extra ?? {});
        return respond(await client.request({ endpoint: "projects-v2/projects.create", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Update Project ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_update",
    "Update een nextgen-project. Enkel meegegeven velden worden aangepast.",
    {
      id: z.string().describe("Project ID (required)"),
      title: z.string().optional().describe("Project title"),
      description: z.string().optional().describe("Project description"),
      starts_on: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      due_on: z.string().optional().describe("Due date (YYYY-MM-DD)"),
      extra: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Any other documented projects-v2/projects.update field"),
    },
    async (p) => {
      try {
        const body: Record<string, unknown> = { id: p.id };
        if (p.title !== undefined) body.title = p.title;
        if (p.description !== undefined) body.description = p.description;
        if (p.starts_on !== undefined) body.starts_on = p.starts_on;
        if (p.due_on !== undefined) body.due_on = p.due_on;
        Object.assign(body, p.extra ?? {});
        return respond(await client.request({ endpoint: "projects-v2/projects.update", body }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Close Project ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_close",
    "Sluit een nextgen-project. SIDE EFFECT: markeert het project als gesloten.",
    { id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.close", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "closed" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Reopen Project ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_reopen",
    "Heropen een gesloten nextgen-project.",
    { id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.reopen", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "reopened" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Duplicate Project ────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_duplicate",
    "Dupliceer een nextgen-project.",
    { id: z.string() },
    async (p) => {
      try {
        return respond(await client.request({ endpoint: "projects-v2/projects.duplicate", body: { id: p.id } }));
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Delete Project ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_delete",
    "Verwijder een nextgen-project. SIDE EFFECT: verwijdert het project onomkeerbaar.",
    { id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.delete", body: { id: p.id } });
        return respond({ success: true, id: p.id, status: "deleted" });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Assign / Unassign ────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_assign",
    "Wijs een gebruiker of team toe aan een nextgen-project.",
    {
      id: z.string(),
      assignee_type: z.enum(["user", "team"]),
      assignee_id: z.string(),
    },
    async (p) => {
      try {
        const body = { id: p.id, assignee: { type: p.assignee_type, id: p.assignee_id } };
        await client.request({ endpoint: "projects-v2/projects.assign", body });
        return respond({ success: true, id: p.id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_projects_unassign",
    "Verwijder de toewijzing van een gebruiker of team op een nextgen-project.",
    {
      id: z.string(),
      assignee_type: z.enum(["user", "team"]),
      assignee_id: z.string(),
    },
    async (p) => {
      try {
        const body = { id: p.id, assignee: { type: p.assignee_type, id: p.assignee_id } };
        await client.request({ endpoint: "projects-v2/projects.unassign", body });
        return respond({ success: true, id: p.id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Owners ───────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_add_owner",
    "Voeg een eigenaar (gebruiker) toe aan een nextgen-project.",
    { id: z.string(), user_id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.addOwner", body: { id: p.id, user_id: p.user_id } });
        return respond({ success: true, id: p.id, user_id: p.user_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_projects_remove_owner",
    "Verwijder een eigenaar (gebruiker) van een nextgen-project.",
    { id: z.string(), user_id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.removeOwner", body: { id: p.id, user_id: p.user_id } });
        return respond({ success: true, id: p.id, user_id: p.user_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Customers ────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_add_customer",
    "Koppel een klant (contact of bedrijf) aan een nextgen-project.",
    {
      id: z.string(),
      customer_type: z.enum(["contact", "company"]),
      customer_id: z.string(),
    },
    async (p) => {
      try {
        const body = { id: p.id, customer: { type: p.customer_type, id: p.customer_id } };
        await client.request({ endpoint: "projects-v2/projects.addCustomer", body });
        return respond({ success: true, id: p.id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_projects_remove_customer",
    "Ontkoppel een klant (contact of bedrijf) van een nextgen-project.",
    {
      id: z.string(),
      customer_type: z.enum(["contact", "company"]),
      customer_id: z.string(),
    },
    async (p) => {
      try {
        const body = { id: p.id, customer: { type: p.customer_type, id: p.customer_id } };
        await client.request({ endpoint: "projects-v2/projects.removeCustomer", body });
        return respond({ success: true, id: p.id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Deals ────────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_add_deal",
    "Koppel een deal aan een nextgen-project.",
    { id: z.string(), deal_id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.addDeal", body: { id: p.id, deal_id: p.deal_id } });
        return respond({ success: true, id: p.id, deal_id: p.deal_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_projects_remove_deal",
    "Ontkoppel een deal van een nextgen-project.",
    { id: z.string(), deal_id: z.string() },
    async (p) => {
      try {
        await client.request({ endpoint: "projects-v2/projects.removeDeal", body: { id: p.id, deal_id: p.deal_id } });
        return respond({ success: true, id: p.id, deal_id: p.deal_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  // ── Quotations ───────────────────────────────────────────────────────────
  server.tool(
    "teamleader_projects_add_quotation",
    "Koppel een offerte aan een nextgen-project.",
    { id: z.string(), quotation_id: z.string() },
    async (p) => {
      try {
        await client.request({
          endpoint: "projects-v2/projects.addQuotation",
          body: { id: p.id, quotation_id: p.quotation_id },
        });
        return respond({ success: true, id: p.id, quotation_id: p.quotation_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );

  server.tool(
    "teamleader_projects_remove_quotation",
    "Ontkoppel een offerte van een nextgen-project.",
    { id: z.string(), quotation_id: z.string() },
    async (p) => {
      try {
        await client.request({
          endpoint: "projects-v2/projects.removeQuotation",
          body: { id: p.id, quotation_id: p.quotation_id },
        });
        return respond({ success: true, id: p.id, quotation_id: p.quotation_id });
      } catch (e) {
        return respondError((e as Error).message);
      }
    }
  );
}
