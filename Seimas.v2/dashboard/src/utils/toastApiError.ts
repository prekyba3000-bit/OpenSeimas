import { toast } from "sonner";
import { friendlyApiErrorMessage } from "./friendlyApiErrorMessage";

export function toastApiError(error: unknown): void {
  toast.error(friendlyApiErrorMessage(error));
}
