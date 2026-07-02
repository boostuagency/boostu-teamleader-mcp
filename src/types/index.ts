/**
 * Teamleader Focus API Types
 *
 * Based on https://developer.focus.teamleader.eu/
 * All endpoints use POST with JSON body.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TeamleaderAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  /** Optional: read the latest refresh token from external storage on boot. */
  loadRefreshToken?: () => string | undefined;
  /** Optional: persist each rotated refresh token to external storage. */
  saveRefreshToken?: (token: string) => void;
}

export interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PageParams {
  number?: number;
  size?: number;
}

export interface PaginationMeta {
  page: {
    size: number;
    number: number;
  };
  matches: number;
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface IdObject {
  type: string;
  id: string;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Address {
  line_1?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export interface PhoneNumber {
  type: "phone" | "mobile" | "fax";
  number: string;
}

export interface Email {
  type: "primary" | "invoicing";
  email: string;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  salutation?: string;
  emails?: Email[];
  telephones?: PhoneNumber[];
  website?: string;
  addresses?: Address[];
  gender?: "male" | "female";
  birthdate?: string;
  language?: string;
  tags?: string[];
  added_at?: string;
  updated_at?: string;
}

export interface ContactListFilter {
  email?: { type: string; email: string };
  ids?: string[];
  term?: string;
  tags?: string[];
  updated_since?: string;
}

export interface ContactCreateParams {
  first_name: string;
  last_name: string;
  emails?: Email[];
  telephones?: PhoneNumber[];
  addresses?: Address[];
  language?: string;
  gender?: "male" | "female";
  tags?: string[];
}

export interface ContactUpdateParams {
  id: string;
  first_name?: string;
  last_name?: string;
  emails?: Email[];
  telephones?: PhoneNumber[];
  addresses?: Address[];
  language?: string;
  gender?: "male" | "female";
  tags?: string[];
}

// ─── Companies ───────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  business_type?: IdObject;
  vat_number?: string;
  national_identification_number?: string;
  emails?: Email[];
  telephones?: PhoneNumber[];
  website?: string;
  addresses?: Address[];
  language?: string;
  tags?: string[];
  added_at?: string;
  updated_at?: string;
}

export interface CompanyListFilter {
  email?: { type: string; email: string };
  ids?: string[];
  term?: string;
  tags?: string[];
  updated_since?: string;
  vat_number?: string;
}

export interface CompanyCreateParams {
  name: string;
  emails?: Email[];
  telephones?: PhoneNumber[];
  addresses?: Address[];
  language?: string;
  vat_number?: string;
  tags?: string[];
  website?: string;
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export interface Deal {
  id: string;
  title: string;
  summary?: string;
  reference?: string;
  status?: string;
  lead?: IdObject;
  department?: IdObject;
  estimated_value?: Money;
  estimated_closing_date?: string;
  estimated_probability?: number;
  current_phase?: IdObject;
  responsible_user?: IdObject;
  closed_at?: string;
  source?: IdObject;
  created_at?: string;
  updated_at?: string;
}

export interface DealListFilter {
  ids?: string[];
  term?: string;
  phase_id?: string;
  responsible_user_id?: string;
  updated_since?: string;
}

export interface DealCreateParams {
  title: string;
  lead: {
    customer: IdObject;
    contact_person_id?: string;
  };
  phase_id: string;
  estimated_value?: Money;
  estimated_closing_date?: string;
  estimated_probability?: number;
  responsible_user_id?: string;
  department_id?: string;
  source_id?: string;
}

export interface DealUpdateParams {
  id: string;
  title?: string;
  estimated_value?: Money;
  estimated_closing_date?: string;
  estimated_probability?: number;
  responsible_user_id?: string;
  lead?: {
    customer?: IdObject;
    contact_person_id?: string;
  };
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  due_on?: string;
  customer?: IdObject;
  assignee?: IdObject;
  created_at?: string;
  updated_at?: string;
}

export interface TaskListFilter {
  ids?: string[];
  term?: string;
  customer?: IdObject;
  assignee?: IdObject;
}

export interface TaskCreateParams {
  description: string;
  due_on?: string;
  customer?: IdObject;
  assignee?: IdObject;
  work_type_id?: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  title: string;
  description?: string;
  creator?: IdObject;
  task?: IdObject;
  activity_type?: IdObject;
  starts_at?: string;
  ends_at?: string;
  location?: string;
  attendees?: IdObject[];
  links?: IdObject[];
}

export interface EventListFilter {
  ids?: string[];
  starts_after?: string;
  starts_before?: string;
  ends_after?: string;
  ends_before?: string;
  attendee?: IdObject;
}

export interface EventCreateParams {
  title: string;
  description?: string;
  activity_type_id: string;
  starts_at: string;
  ends_at: string;
  attendees?: { type: string; id: string }[];
  links?: IdObject[];
  location?: string;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  department?: IdObject;
  invoice_number?: string;
  invoice_date?: string;
  status?: string;
  due_on?: string;
  paid?: boolean;
  paid_at?: string;
  invoicee?: {
    customer: IdObject;
    for_attention_of?: IdObject;
  };
  total?: {
    tax_exclusive: Money;
    tax_inclusive: Money;
    payable: Money;
    taxes: { rate: number; taxable: Money; tax: Money }[];
  };
  grouped_lines?: InvoiceGroupedLine[];
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceGroupedLine {
  section?: { title: string };
  line_items: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  quantity: number;
  description: string;
  extended_description?: string;
  unit_price: Money;
  tax_rate_id: string;
  discount?: {
    type: "percentage";
    value: number;
  };
  product_id?: string;
}

export interface InvoiceListFilter {
  ids?: string[];
  department_id?: string;
  status?: string[];
  updated_since?: string;
  invoice_date_after?: string;
  invoice_date_before?: string;
}

export interface InvoiceCreateParams {
  invoicee: {
    customer: IdObject;
    for_attention_of?: IdObject;
  };
  department_id: string;
  payment_term: {
    type: string;
    days?: number;
  };
  grouped_lines: InvoiceGroupedLine[];
  invoice_date?: string;
  discounts?: { type: string; value: number }[];
  note?: string;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface TeamleaderListResponse<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface TeamleaderInfoResponse<T> {
  data: T;
}
