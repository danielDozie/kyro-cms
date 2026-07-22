import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy } from "../ui/icons";
import { useAutoFormStore } from "../../lib/autoform-store";
import { toast } from "../../lib/stores";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || null });
  }

  handleCopyToClipboard = () => {
    const { error, errorInfo } = this.state;
    const formData = useAutoFormStore.getState().formData;
    const payload = {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo,
      formData,
      timestamp: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      toast.success("Crash details copied to clipboard");
    });
  };

  handleReload = () => {
    window.dispatchEvent(new Event('kyro:soft-reload'));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-16">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-[var(--kyro-text-primary)]">
            {this.props.fallbackTitle || "Something went wrong"}
          </h3>
          <p className="text-sm text-[var(--kyro-text-secondary)] text-center max-w-md">
            The form encountered an unexpected error. Your unsaved changes may still be recoverable.
          </p>
          {this.state.error && (
            <p className="text-xs font-mono text-red-500/70 bg-red-500/5 px-4 py-2 rounded-lg max-w-full overflow-auto">
              {this.state.error.message}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border border-[var(--kyro-border)] hover:bg-[var(--kyro-surface-accent)] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleCopyToClipboard}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-[var(--kyro-primary)]/10 text-[var(--kyro-primary)] hover:bg-[var(--kyro-primary)]/20 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Details
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
