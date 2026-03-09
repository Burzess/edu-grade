'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JoinKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (kodeKelas: string) => Promise<void>;
}

export function JoinKelasModal({ isOpen, onClose, onSubmit }: JoinKelasModalProps) {
  const [kodeKelas, setKodeKelas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateKodeKelas = (kode: string): boolean => {
    // Format: xxx-xxx-xxx (contoh: k7b-p2m-z9x)
    const cleanKode = kode.trim().toLowerCase().replace(/\s+/g, '');
    const kodeRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/;
    return kodeRegex.test(cleanKode);
  };

  const formatKodeKelas = (value: string): string => {
    // Remove spaces and convert to lowercase
    let cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Limit to 9 characters (3-3-3)
    cleaned = cleaned.substring(0, 9);
    
    // Add hyphens at appropriate positions
    if (cleaned.length > 3) {
      cleaned = cleaned.substring(0, 3) + '-' + cleaned.substring(3);
    }
    if (cleaned.length > 7) {
      cleaned = cleaned.substring(0, 7) + '-' + cleaned.substring(7);
    }
    
    return cleaned;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKodeKelas(e.target.value);
    setKodeKelas(formatted);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kodeKelas.trim()) {
      setError('Kode kelas wajib diisi');
      return;
    }

    if (!validateKodeKelas(kodeKelas)) {
      setError('Format kode kelas tidak valid. Contoh: k7b-p2m-z9x');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(kodeKelas);
      
      // Reset form on success (onSubmit will handle closing modal)
      setKodeKelas('');
      setError(null);
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      setError('Terjadi kesalahan saat bergabung ke kelas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setKodeKelas('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bergabung ke Kelas</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kode_kelas">
              Kode Kelas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="kode_kelas"
              type="text"
              placeholder="k7b-p2m-z9x"
              value={kodeKelas}
              onChange={handleInputChange}
              className={error ? 'border-red-500' : ''}
              disabled={isSubmitting}
              maxLength={11} // 9 characters + 2 hyphens
            />
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Help Section */}
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cara bergabung:</strong>
              <br />
              1. Dapatkan kode kelas dari guru Anda
              <br />
              2. Masukkan kode dengan format xxx-xxx-xxx
              <br />
              3. Klik "Bergabung" untuk masuk ke kelas
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !kodeKelas.trim()}
            >
              {isSubmitting ? 'Bergabung...' : 'Bergabung'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}