"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background relative p-4">
          <Card className="w-full max-w-md shadow-lg border-destructive/20">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-destructive/10 border-2 border-destructive/20">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              
              <CardTitle className="text-xl font-bold text-foreground">
                Kesalahan Sistem
              </CardTitle>
              
              <CardDescription className="text-muted-foreground">
                Terjadi kesalahan fatal pada aplikasi Edu-Grade. 
                Mohon refresh halaman atau hubungi administrator.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={reset}
                  className="w-full gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Muat Ulang Aplikasi
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="h-4 w-4" />
                  Ke Halaman Utama
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && error && (
                <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded text-sm">
                  <strong>Error Detail:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {error.message}
                  </pre>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center mt-4">
                Error ID: {error.digest || Date.now()}
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}