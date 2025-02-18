// Common interfaces and types shared across domains
export interface BaseError extends Error {
  code?: string;
  details?: unknown;
}

export interface BaseRepository<T> {
  get(id: string): Promise<T | null>;
  list(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
