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
        "p-4 border rounded-xl flex items-center gap-3 border-attention/40 bg-attention/10 text-foreground"
      }
      role="alert"
    >
      {friendlyApiErrorMessage(error)}
    </div>
  );
}
