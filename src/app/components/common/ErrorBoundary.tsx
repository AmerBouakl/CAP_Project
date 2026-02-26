import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred while rendering this page. You can try again or navigate
            to a different page.
          </p>
        </div>

        {this.state.error && (
          <pre className="mt-2 max-w-lg overflow-auto rounded-md bg-muted px-4 py-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
        )}

        <Button variant="outline" onClick={this.handleRetry} className="mt-2 gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }
}
