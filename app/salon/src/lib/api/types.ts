export interface ApiError {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}