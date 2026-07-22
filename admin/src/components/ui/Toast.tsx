import React, { createContext, useContext, type ReactNode } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X,
  ShieldAlert
} from "./icons";

import { useToastStore } from "../../lib/stores";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

export function Toast({ type, message, onClose }: ToastProps) {
  const [isPaused, setIsPaused] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onClose, 5000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  React.useEffect(() => {
    if (!isPaused) {
      startTimer();
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPaused, onClose]);

  const Icon = {
    success: CheckCircle2,
    error: ShieldAlert,
    warning: AlertTriangle,
    info: Info,
  }[type];

  return (
    <div 
      className={`kyro-toast kyro-toast-${type} group animate-in fade-in slide-in-from-right-4 duration-300`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="kyro-toast-accent" />
      <div className="kyro-toast-icon-container">
        <Icon className="w-4 h-4" />
      </div>
      <div className="kyro-toast-content">
        <p className="kyro-toast-message">{message}</p>
      </div>
      <button 
        type="button" 
        className="kyro-toast-close group-hover:opacity-100 opacity-40 transition-opacity" 
        onClick={onClose}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return <>{children}</>;
}

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const toasts = useToastStore((state) => state.toasts);

  return { toasts, addToast, removeToast };
}
