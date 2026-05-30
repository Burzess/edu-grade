'use client';
import React, { Component, ErrorInfo, PropsWithChildren } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error caught by boundary:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <div className="bg-card shadow-lg rounded-lg p-8 max-w-md w-full border border-border">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">💥</div>
              
              <h2 className="text-xl font-bold text-foreground mb-2">
                Oops! Terjadi Kesalahan
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Aplikasi mengalami error yang tidak terduga. Tim kami akan segera memperbaikinya.
              </p>

              {/* Error details - hanya tampil dalam development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg text-left">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={this.handleRefresh}
                  className="w-full bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  🔄 Refresh Halaman
                </button>
                
                <button 
                  onClick={this.handleGoBack}
                  className="w-full bg-muted hover:bg-muted/80 text-muted-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  ⬅️ Kembali
                </button>
                
                <button 
                  onClick={this.handleGoHome}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  🏠 Ke Halaman Utama
                </button>
              </div>

              <div className="mt-6 text-xs text-muted-foreground">
                <p>Jika masalah terus berlanjut, hubungi tim support.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
