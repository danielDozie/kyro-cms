import { Component, Suspense, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  loading: string;
  failed: string;
  onRecover: () => void;
  recoverLabel: string;
}

export class MediaLoadBoundary extends Component<Props> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    const { children, loading, failed, onRecover, recoverLabel } = this.props;
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--kyro-text-secondary)]"
        >
          <p>{failed}</p>
          <button type="button" className="kyro-btn kyro-btn-secondary kyro-btn-sm" onClick={onRecover}>
            {recoverLabel}
          </button>
        </div>
      );
    }

    return (
      <Suspense
        fallback={
          <p role="status" className="grid flex-1 place-items-center p-6 text-sm text-[var(--kyro-text-secondary)]">
            {loading}
          </p>
        }
      >
        {children}
      </Suspense>
    );
  }
}
