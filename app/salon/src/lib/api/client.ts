import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiError } from "./types";

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) {
  throw new Error("VITE_API_URL is not set");
}

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export class AppApiError extends Error implements ApiError {
  status: number;
  code?: string;
  details?: unknown;
  response?: { status: number; data: unknown };

  constructor(error: ApiError & { response?: { status: number; data: unknown } }) {
    super(error.message);
    this.name = "AppApiError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.response = error.response;
  }
}

export function toApiError(error: unknown): AppApiError {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ detail?: string; message?: string; code?: string }>;
    const data = err.response?.data;
    return new AppApiError({
      status: err.response?.status ?? 0,
      code: data?.code ?? err.code,
      message:
        (typeof data?.detail === "string" && data.detail) ||
        (typeof data?.message === "string" && data.message) ||
        err.message ||
        "Request failed",
      details: data,
      response: err.response ? { status: err.response.status, data } : undefined,
    });
  }
  if (error instanceof Error) {
    return new AppApiError({ status: 0, message: error.message });
  }
  return new AppApiError({ status: 0, message: "Unknown error" });
}