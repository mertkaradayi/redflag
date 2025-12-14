'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#D12226]/40 bg-[#D12226]/10 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-[#D12226]" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground dark:text-white">
              Something went wrong
            </h3>
            <p className="max-w-md text-sm text-muted-foreground dark:text-zinc-400">
              An error occurred while rendering this component. Try refreshing or click below to retry.
            </p>
          </div>
          <Button
            onClick={this.handleReset}
            variant="outline"
            className="border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
