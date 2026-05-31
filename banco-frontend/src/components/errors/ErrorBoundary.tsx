"use client";

import React from "react";
import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { logError } from "@/lib/logger/client";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  boundaryName?: string;
  resetKey?: string; // cambia este valor para forzar el reset
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  prevResetKey?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, prevResetKey: props.resetKey };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // Resetear automáticamente cuando cambia el resetKey (pathname)
  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.prevResetKey) {
      return { hasError: false, error: null, prevResetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError(this.props.boundaryName ?? "ErrorBoundary", error.message, {
      stack: info.componentStack,
    });
    console.error(
      `[${this.props.boundaryName ?? "ErrorBoundary"}]`,
      error,
      info.componentStack
    );
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          reset={this.reset}
          context={this.props.boundaryName}
        />
      );
    }

    return this.props.children;
  }
}
