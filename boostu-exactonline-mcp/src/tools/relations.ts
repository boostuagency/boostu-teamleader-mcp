/**
 * Relations: the CRM side of Exact Online.
 *
 * In Exact one "Account" is both customer and supplier — the Status and the
 * IsSales/IsPurchase flags decide the role — so there is a single collection
 * rather than separate customer and supplier lists.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "accounts",
    resource: "crm/Accounts",
    label: "relations: customers, suppliers, prospects and leads",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Code,Name,Status,Email,Phone,Website,VATNumber,ChamberOfCommerce,City,Postcode," +
      "AddressLine1,Country,IsSales,IsPurchase,IsSupplier,Created,Modified",
    commonFields:
      "Name (required), Status ('C' customer, 'S' suspect, 'P' prospect), Email, Phone, Website, " +
      "VATNumber, ChamberOfCommerce, AddressLine1, Postcode, City, Country (ISO code), Language, " +
      "IsSales, IsPurchase, IsSupplier, SalesCurrency, PaymentConditionSales",
    filterHint:
      "Status 'C' is an active customer, 'S' suspect, 'P' prospect. IsSupplier eq true selects suppliers. " +
      "Search by name with \"substringof('acme', tolower(Name))\".",
  },
  {
    name: "contacts",
    resource: "crm/Contacts",
    label: "contact persons at relations",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Account,AccountName,FirstName,LastName,FullName,Email,Phone,Mobile,JobTitleDescription," +
      "IsMainContact,Created,Modified",
    commonFields:
      "Account (GUID of the relation, required), FirstName, LastName, Email, Phone, Mobile, " +
      "JobTitleDescription, IsMainContact, Gender ('M'/'V'), Language",
    filterHint: "Filter to one relation with \"Account eq guid'...'\".",
  },
  {
    name: "addresses",
    resource: "crm/Addresses",
    label: "postal, visit and invoice addresses of relations",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Account,AccountName,Type,AddressLine1,AddressLine2,Postcode,City,State,Country,Mailbox,Main",
    commonFields:
      "Account (GUID, required), Type (1 visit, 2 postal, 3 invoice, 4 delivery), AddressLine1, " +
      "Postcode, City, Country (ISO code), Main",
    filterHint: "Type 1 is the visiting address, 2 postal, 3 invoice, 4 delivery.",
  },
  {
    name: "bank_accounts",
    resource: "crm/BankAccounts",
    label: "bank accounts (IBAN) belonging to relations",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect: "ID,Account,AccountName,BankAccount,BankAccountHolderName,BICCode,Main,Type",
    commonFields: "Account (GUID, required), BankAccount (IBAN), BankAccountHolderName, BICCode, Main",
  },
  {
    name: "account_classifications",
    resource: "crm/AccountClassifications",
    label: "classification values used to segment relations",
    ops: ["list"],
    defaultSelect: "ID,Code,Description,AccountClassificationName",
  },
];

export function registerRelationTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
