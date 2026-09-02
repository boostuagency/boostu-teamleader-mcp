/**
 * The catalogue: items, their grouping, units and prices.
 *
 * "Item" covers both goods and services in Exact, so a consultancy's hourly
 * rate and a retailer's stock keeping unit live in the same collection.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ExactClient } from "../api/client.js";
import { registerResources, type ResourceDef } from "../lib/registerResource.js";

const RESOURCES: ResourceDef[] = [
  {
    name: "items",
    resource: "logistics/Items",
    label: "items: the goods and services that can be sold or purchased",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Code,Description,ItemGroup,ItemGroupCode,ItemGroupDescription,CostPriceStandard," +
      "SalesVatCode,PurchaseVatCode,Unit,UnitDescription,IsSalesItem,IsPurchaseItem,IsStockItem," +
      "IsWebshopItem,IsSerialItem,GLRevenue,GLCosts,Barcode,IsBlocked,Created,Modified",
    commonFields:
      "Code (required), Description (required), ItemGroup (GUID), Unit, SalesVatCode, PurchaseVatCode, " +
      "CostPriceStandard, IsSalesItem, IsPurchaseItem, IsStockItem, GLRevenue, GLCosts",
    filterHint:
      "IsSalesItem eq true narrows to what you sell. Search by description with " +
      "\"substringof('advies', tolower(Description))\".",
  },
  {
    name: "item_groups",
    resource: "logistics/ItemGroups",
    label: "item groups, which drive the default ledger accounts for items",
    ops: ["list", "create", "update"],
    defaultSelect: "ID,Code,Description,GLRevenue,GLCosts,GLStock,IsDefault,Created,Modified",
    commonFields: "Code (required), Description (required), GLRevenue, GLCosts, GLStock",
  },
  {
    name: "sales_item_prices",
    resource: "logistics/SalesItemPrices",
    label: "sales prices per item, price list and quantity",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect:
      "ID,Item,ItemCode,ItemDescription,Account,AccountName,Price,Currency,Quantity,Unit," +
      "StartDate,EndDate,PriceList,PriceListDescription,NumberOfItemsPerUnit",
    commonFields: "Item (GUID, required), Price (required), Currency, Quantity, StartDate, EndDate, Account, PriceList",
    filterHint: "A price scoped to an Account is that customer's own price. Filter with \"Item eq guid'...'\".",
  },
  {
    name: "sales_price_lists",
    resource: "sales/SalesPriceLists",
    label: "sales price lists",
    ops: ["list", "create", "update"],
    defaultSelect: "ID,Code,Description,Currency,StartDate,EndDate,Main,Active",
    commonFields: "Code (required), Description (required), Currency, StartDate, EndDate",
  },
  {
    name: "units",
    resource: "logistics/Units",
    label: "units of measure (piece, hour, kilogram, ...)",
    ops: ["list", "create", "update"],
    defaultSelect: "ID,Code,Description,Type,Main",
    commonFields: "Code (required), Description (required), Type",
  },
  {
    name: "customer_items",
    resource: "logistics/CustomerItems",
    label: "the item codes your customers use for your items",
    ops: ["list", "create", "update"],
    deletable: true,
    defaultSelect: "ID,Item,ItemCode,ItemDescription,Account,AccountName,CustomerItemCode,CustomerItemDescription",
    commonFields: "Item (GUID, required), Account (GUID, required), CustomerItemCode",
  },
];

export function registerItemTools(server: McpServer, client: ExactClient): void {
  registerResources(server, client, RESOURCES);
}
