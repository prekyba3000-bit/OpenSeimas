import React from "react";
import { friendlyApiErrorMessage } from "../utils/friendlyApiErrorMessage";

type ProblemDetailsNoticeProps = {
  error: unknown;
  className?: string;
};

export function ProblemDetailsNotice({ error, className }: ProblemDetailsNoticeProps) {
  return (
    <div
      className={
        className ??
        "p-4 border rounded-xl flex items-center gap-3 border-amber-500/40 bg-amber-500/10 text-amber-200"
      }
      role="alert"
    >
      {friendlyApiErrorMessage(error)}
    </div>
  );
}
