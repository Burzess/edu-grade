'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface KelasStatusToggleProps {
  kelas: {
    id: string;
    nama_kelas: string;
    is_active?: boolean;
    jumlah_siswa?: number;
  };
  onToggle: (kelasId: string, newStatus: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export function KelasStatusToggle({ 
  kelas, 
  onToggle, 
  disabled = false,
  size = 'default'
}: KelasStatusToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<boolean | null>(null);

  const isActive = kelas.is_active ?? true; // Default to active if undefined

  const handleToggleClick = (newStatus: boolean) => {
    // If trying to deactivate and there are students, show confirmation
    if (!newStatus && (kelas.jumlah_siswa || 0) > 0) {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
    } else {
      // Directly toggle for activation or if no students
      handleConfirmedToggle(newStatus);
    }
  };

  const handleConfirmedToggle = async (newStatus: boolean) => {
    setIsLoading(true);
    setShowConfirmDialog(false);
    setPendingStatus(null);

    try {
      await onToggle(kelas.id, newStatus);
    } catch (error) {
      console.error('Error toggling kelas status:', error);
      // Error handling will be done by parent component via toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmDialog(false);
    setPendingStatus(null);
  };

  // Status badge component
  const StatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Memproses...
        </Badge>
      );
    }

    return (
      <Badge 
        variant={isActive ? "default" : "secondary"} 
        className={`text-xs ${
          isActive 
            ? "bg-green-100 text-green-800 hover:bg-green-200" 
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {isActive ? (
          <>
            <CheckCircle className="h-3 w-3 mr-1" />
            Aktif
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Nonaktif
          </>
        )}
      </Badge>
    );
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${size === 'sm' ? 'text-sm' : ''}`}>
        <Switch
          checked={isActive}
          onCheckedChange={handleToggleClick}
          disabled={disabled || isLoading}
          className={size === 'sm' ? 'scale-75' : ''}
        />
        <StatusBadge />
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Nonaktifkan Kelas?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Anda akan menonaktifkan kelas <strong>"{kelas.nama_kelas}"</strong>.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <h4 className="font-medium text-amber-800 mb-2">
                    Dampak menonaktifkan kelas:
                  </h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Siswa tidak dapat mengakses ujian dalam kelas ini</li>
                    <li>• Kelas tidak akan muncul dalam daftar kelas aktif siswa</li>
                    <li>• Data kelas dan ujian akan tetap tersimpan</li>
                    <li>• Anda dapat mengaktifkan kembali kapan saja</li>
                  </ul>
                </div>
                {(kelas.jumlah_siswa || 0) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <strong>{kelas.jumlah_siswa} siswa</strong> saat ini terdaftar di kelas ini.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirmation}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirmedToggle(false)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Ya, Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Simplified version untuk display saja tanpa toggle functionality
export function KelasStatusDisplay({ 
  isActive, 
  size = 'default' 
}: { 
  isActive: boolean; 
  size?: 'sm' | 'default';
}) {
  return (
    <Badge 
      variant={isActive ? "default" : "secondary"} 
      className={`${size === 'sm' ? 'text-xs' : ''} ${
        isActive 
          ? "bg-green-100 text-green-800" 
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {isActive ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Aktif
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3 mr-1" />
          Nonaktif
        </>
      )}
    </Badge>
  );
}

export default KelasStatusToggle;