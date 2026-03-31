import React from "react";
import { LT } from "../i18n/lt";

type AppErrorBoundaryState = {
  hasError: boolean;
};

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Local telemetry fallback; can be replaced by remote sink later.
    console.error("UI boundary caught error", { error, info });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-xl border border-border bg-card text-card-foreground p-6 space-y-3">
            <h1 className="text-xl font-semibold">{LT.errors.boundaryTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {LT.errors.boundaryBody}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
            >
              {LT.errors.boundaryRetry}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
