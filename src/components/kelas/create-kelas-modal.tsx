'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { KelasFormData } from '@/types/kelas';

interface CreateKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KelasFormData) => Promise<void>;
}

export function CreateKelasModal({ isOpen, onClose, onSubmit }: CreateKelasModalProps) {
  const [formData, setFormData] = useState<KelasFormData>({nama_kelas: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<KelasFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<KelasFormData> = {};

    if (!formData.nama_kelas.trim()) {
      newErrors.nama_kelas = 'Nama kelas wajib diisi';
    } else if (formData.nama_kelas.trim().length < 3) {
      newErrors.nama_kelas = 'Nama kelas minimal 3 karakter';
    } else if (formData.nama_kelas.trim().length > 255) {
      newErrors.nama_kelas = 'Nama kelas maksimal 255 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        nama_kelas: formData.nama_kelas.trim(),
      });
      
      // Reset form on success
      setFormData({ nama_kelas: '' });
      setErrors({});
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ nama_kelas: '' });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Buat Kelas Baru</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama_kelas">
              Nama Kelas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nama_kelas"
              type="text"
              placeholder="Contoh: Fisika - Kelas 10-A"
              value={formData.nama_kelas}
              onChange={(e) => setFormData(prev => ({ ...prev, nama_kelas: e.target.value }))}
              className={errors.nama_kelas ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.nama_kelas && (
              <p className="text-sm text-red-500">{errors.nama_kelas}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Membuat...' : 'Buat Kelas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}