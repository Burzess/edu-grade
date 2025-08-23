'use client'

import React, { Component, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Force a page reload to restart auth flow
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
          <Card className="w-full max-w-md shadow-lg border-0">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center space-y-6 text-center">
                <AlertTriangle className="h-16 w-16 text-red-500" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">Terjadi Kesalahan</h3>
                  <p className="text-sm text-gray-600">
                    Ada masalah dengan sistem autentikasi
                  </p>
                  {this.state.error && (
                    <p className="text-xs text-red-600 font-mono bg-red-50 p-2 rounded">
                      {this.state.error.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Coba Lagi
                  </Button>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Jika masalah berlanjut:</p>
                    <p>• Clear cache browser</p>
                    <p>• Logout dan login kembali</p>
                    <p>• Hubungi administrator</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC untuk wrap component dengan error boundary
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  const WrappedComponent = (props: P) => {
    return (
      <AuthErrorBoundary>
        <Component {...props} />
      </AuthErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withAuthErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
