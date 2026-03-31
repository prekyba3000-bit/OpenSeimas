import React from "react";
import { ApiError } from "../services/api";
import { LT } from "../i18n/lt";

type ProblemDetailsNoticeProps = {
  error: unknown;
  className?: string;
};

function mapErrorToMessage(error: unknown): string {
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

export function ProblemDetailsNotice({ error, className }: ProblemDetailsNoticeProps) {
  return (
    <div
      className={
        className ??
        "p-4 border rounded-xl flex items-center gap-3 border-amber-500/40 bg-amber-500/10 text-amber-200"
      }
      role="alert"
    >
      {mapErrorToMessage(error)}
    </div>
  );
}
