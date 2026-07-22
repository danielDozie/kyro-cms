import React, { useState } from "react";
import { useUIStore } from "../../lib/stores";
import { ConfirmModal } from "./Modal";

export function GlobalModal() {
  const { modal, closeModal } = useUIStore();
  const [loading, setLoading] = useState(false);

  if (!modal.open || !modal.config) return null;

  const { config } = modal;

  const handleConfirm = async () => {
    if (config.onConfirm) {
      try {
        setLoading(true);
        await config.onConfirm();
      } catch (error) {
        console.error("Modal confirm action failed:", error);
      } finally {
        setLoading(false);
        closeModal();
      }
    } else {
      closeModal();
    }
  };

  const handleClose = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    closeModal();
  };

  return (
    <ConfirmModal
      open={modal.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      variant={config.variant === "danger" ? "danger" : "default"}
      loading={loading}
    />
  );
}
