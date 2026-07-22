import { useToastStore } from "../../lib/stores";
import { Toast } from "./Toast";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="kyro-toasts-container" style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "12px", zIndex: 100000, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <Toast type={t.type} message={t.message} onClose={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
