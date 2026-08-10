import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../services/api";

/**
 * React Query retries are layered on top of api.request()'s own retries.
 * Skip extra RQ rounds for client errors and rate limits so the UI surfaces messages quickly.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) {
    const s = error.status;
    if (s === 401 || s === 403 || s === 404 || s === 422) return false;
    if (s === 429) return false;
    if (s >= 400 && s < 500) return false;
  }
  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: shouldRetryQuery,
      },
    },
  });
}
