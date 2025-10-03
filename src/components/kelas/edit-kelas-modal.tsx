'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Edit3 } from 'lucide-react';

interface EditKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { kelas_id: string; nama_kelas: string }) => Promise<void>;
  kelas: {
    id: string;
    nama_kelas: string;
    deskripsi?: string;
  } | null;
  isLoading?: boolean;
}

export function EditKelasModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  kelas,
  isLoading: externalLoading = false
}: EditKelasModalProps) {
  const [namaKelas, setNamaKelas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or kelas changes
  React.useEffect(() => {
    if (isOpen && kelas) {
      setNamaKelas(kelas.nama_kelas);
      setError(null);
    } else if (!isOpen) {
      setNamaKelas('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, kelas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kelas) return;
    
    // Validation
    if (!namaKelas.trim()) {
      setError('Nama kelas wajib diisi');
      return;
    }

    if (namaKelas.trim().length < 3) {
      setError('Nama kelas minimal 3 karakter');
      return;
    }

    if (namaKelas.trim().length > 100) {
      setError('Nama kelas maksimal 100 karakter');
      return;
    }

    // Check if there's actually a change
    if (namaKelas.trim() === kelas.nama_kelas) {
      setError('Tidak ada perubahan pada nama kelas');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        kelas_id: kelas.id,
        nama_kelas: namaKelas.trim()
      });
      
      // Success akan di-handle oleh parent component
      onClose();
    } catch (error) {
      console.error('Error updating kelas:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Terjadi kesalahan saat memperbarui kelas'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting || externalLoading) return;
    onClose();
  };

  const isLoadingState = isSubmitting || externalLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Nama Kelas
          </DialogTitle>
          <DialogDescription>
            Ubah nama kelas sesuai kebutuhan Anda. Pastikan nama mudah dikenali oleh siswa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nama_kelas">
                Nama Kelas <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_kelas"
                placeholder="Contoh: Fisika - Kelas 10-A"
                value={namaKelas}
                onChange={(e) => {
                  setNamaKelas(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoadingState}
                className={error ? 'border-red-500 focus:border-red-500' : ''}
                maxLength={100}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimal 3 karakter</span>
                <span>{namaKelas.length}/100</span>
              </div>
            </div>

            {/* Display existing description for reference (read-only) */}
            {kelas?.deskripsi && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  Deskripsi Saat Ini
                </Label>
                <Textarea
                  value={kelas.deskripsi}
                  disabled
                  rows={2}
                  className="resize-none bg-muted/50 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  *Untuk mengubah deskripsi, gunakan fitur edit detail kelas
                </p>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoadingState}
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isLoadingState || !namaKelas.trim()}
            >
              {isLoadingState ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditKelasModal;