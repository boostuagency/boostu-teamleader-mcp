export interface ListParams {
  page?: number;
  page_size?: number;
  filter?: Record<string, unknown>;
  sort?: Array<{ field: string; order?: "asc" | "desc" }>;
}

export function buildListBody(params: ListParams): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (params.page || params.page_size) {
    body.page = {
      number: params.page ?? 1,
      size: Math.min(params.page_size ?? 20, 100),
    };
  }
  if (params.filter && Object.keys(params.filter).length > 0) {
    body.filter = params.filter;
  }
  if (params.sort && params.sort.length > 0) {
    body.sort = params.sort;
  }
  return body;
}
