"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type DocsErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string | null;
};

type DocsErrorBoundaryState = {
  error: Error | null;
};

export class DocsErrorBoundary extends Component<
  DocsErrorBoundaryProps,
  DocsErrorBoundaryState
> {
  state: DocsErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): DocsErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[workspace-docs] 문서 화면 렌더링 실패", {
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(previousProps: DocsErrorBoundaryProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full items-center justify-center bg-white p-6">
        <div className="w-full max-w-md border border-red-200 bg-red-50/40 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">
                문서 화면을 불러오지 못했습니다
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                보드와 다른 워크스페이스 기능은 계속 사용할 수 있습니다.
                잠시 후 문서 화면만 다시 시도해 주세요.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={this.reset}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                문서 다시 열기
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
