import { ApiError } from "../services/api";
import { LT } from "../i18n/lt";

/** User-facing message for API / network failures (Problem Details–aware). */
export function friendlyApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.problem?.status === 429 || error.status === 429) {
      return LT.errors.tooManyRequests;
    }
    if (error.problem?.type?.endsWith("/validation-error") || error.status === 422) {
      return LT.errors.validation;
    }
    if (error.message.toLowerCase().includes("timed out")) {
      return LT.errors.timeout;
    }
    if (error.message.toLowerCase().includes("network")) {
      return LT.errors.network;
    }
  }
  return LT.errors.generic;
}
