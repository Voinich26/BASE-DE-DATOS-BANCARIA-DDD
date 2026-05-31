import { useUIStore } from "@/store/ui.store";
import { toast } from "sonner";
import { useCallback } from "react";

type NotificationType = "info" | "success" | "warning" | "error";

interface NotifyOptions {
  title: string;
  message: string;
  type?: NotificationType;
  /** Also show a sonner toast */
  showToast?: boolean;
}

/**
 * Unified notification hook — adds to the notification bell AND optionally
 * shows a sonner toast at the same time.
 */
export function useNotification() {
  const { addNotification } = useUIStore();

  const notify = useCallback(
    ({ title, message, type = "info", showToast = true }: NotifyOptions) => {
      addNotification({ title, message, type });

      if (showToast) {
        switch (type) {
          case "success":
            toast.success(title, { description: message });
            break;
          case "error":
            toast.error(title, { description: message });
            break;
          case "warning":
            toast.warning(title, { description: message });
            break;
          default:
            toast.info(title, { description: message });
        }
      }
    },
    [addNotification]
  );

  return { notify };
}
