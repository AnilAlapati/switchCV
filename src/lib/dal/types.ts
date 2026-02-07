import type { WhereFilterOp } from "./client";

export interface WhereClause {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

export interface OrderByClause {
  field: string;
  direction?: "asc" | "desc";
}

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: OrderByClause;
  limit?: number;
  startAfter?: unknown;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string;
}
