import React, { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  /** If true, shows a minimal inline error rather than a full-page fallback */
  inline?: boolean;
  /** Optional label for the error boundary (used in the message) */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.inline) {
      return (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {this.props.label
              ? `${this.props.label} could not be loaded.`
              : "This section could not be loaded."}
          </span>
          <button
            onClick={this.handleReset}
            className="ml-auto text-red-600 hover:text-red-800 underline text-xs"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      >
        <div className="rounded-full bg-red-100 p-4">
          <AlertCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-600 max-w-md">
            {this.props.label
              ? `An error occurred in ${this.props.label}.`
              : "An unexpected error occurred. Our team has been notified."}
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-4 max-w-lg text-left text-xs text-red-600 bg-red-50 rounded p-3 overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}

/** Convenience wrapper for route-level boundaries — keeps nav accessible on error */
export function RouteErrorBoundary({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ErrorBoundary label={label}>
      {children}
    </ErrorBoundary>
  );
}

/** Inline boundary for individual components (timeline, compliance, action list) */
export function ComponentErrorBoundary({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ErrorBoundary inline label={label}>
      {children}
    </ErrorBoundary>
  );
}
