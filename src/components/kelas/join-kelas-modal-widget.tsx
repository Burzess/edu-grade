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
import { JoinKelasFormData } from '@/types/kelas';

interface JoinKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (kodeKelas: string) => Promise<void>;
}

export function JoinKelasModal({ isOpen, onClose, onSubmit }: JoinKelasModalProps) {
  const [formData, setFormData] = useState<JoinKelasFormData>({
    kode_kelas: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<JoinKelasFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<JoinKelasFormData> = {};

    if (!formData.kode_kelas.trim()) {
      newErrors.kode_kelas = 'Kode kelas wajib diisi';
    } else {
      // Validate format: xxx-xxx-xxx (alphanumeric, case-insensitive)
      const cleanKode = formData.kode_kelas.trim().toLowerCase().replace(/\s+/g, '');
      const kodeRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/;
      
      if (!kodeRegex.test(cleanKode)) {
        newErrors.kode_kelas = 'Format kode kelas tidak valid. Contoh: k7b-p2m-z9x';
      }
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
      // Clean dan normalize kode kelas
      const cleanKode = formData.kode_kelas.trim().toLowerCase().replace(/\s+/g, '');
      await onSubmit(cleanKode);
      
      // Reset form on success
      setFormData({ kode_kelas: '' });
      setErrors({});
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ kode_kelas: '' });
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Auto-format input dengan hyphen
    value = value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    
    // Auto-insert hyphens
    if (value.length <= 11) {
      value = value.replace(/-/g, ''); // Remove existing hyphens
      if (value.length > 6) {
        value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 9);
      } else if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3, 6);
      }
    }
    
    setFormData(prev => ({ ...prev, kode_kelas: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gabung ke Kelas</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kode_kelas">
              Kode Kelas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="kode_kelas"
              type="text"
              placeholder="Contoh: k7b-p2m-z9x"
              value={formData.kode_kelas}
              onChange={handleInputChange}
              className={errors.kode_kelas ? 'border-red-500' : ''}
              disabled={isSubmitting}
              maxLength={11}
            />
            {errors.kode_kelas && (
              <p className="text-sm text-red-500">{errors.kode_kelas}</p>
            )}
            <p className="text-xs text-gray-500">
              Masukkan kode kelas yang diberikan oleh guru Anda
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Cara mendapatkan kode kelas:</p>
                <ul className="space-y-0.5">
                  <li>• Tanyakan kepada guru Anda</li>
                  <li>• Lihat di papan tulis atau pengumuman</li>
                  <li>• Format kode: 3 huruf/angka - 3 huruf/angka - 3 huruf/angka</li>
                </ul>
              </div>
            </div>
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
              {isSubmitting ? 'Bergabung...' : 'Gabung Kelas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}