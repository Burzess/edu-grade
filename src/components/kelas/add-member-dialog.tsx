import React, { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAvailableStudents, useAddKelasMembers } from '@/hooks/use-kelas';
import { toastSuccess, toastError } from '@/lib/toast';

interface AddMemberDialogProps {
  kelasId: string;
}

export function AddMemberDialog({ kelasId }: AddMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: availableStudents, isLoading } = useAvailableStudents(kelasId);
  const addMembers = useAddKelasMembers(kelasId);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchQuery('');
      setSelectedIds(new Set());
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const next = new Set(selectedIds);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = (filteredIds: string[]) => {
    if (selectedIds.size === filteredIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const handleAddMembers = async () => {
    if (selectedIds.size === 0) return;
    try {
      await addMembers.mutateAsync(Array.from(selectedIds));
      toastSuccess('Berhasil!', `${selectedIds.size} siswa berhasil ditambahkan ke kelas`);
      setIsOpen(false);
    } catch (error: any) {
      toastError('Error', error.message || 'Gagal menambahkan siswa');
    }
  };

  const filteredStudents = availableStudents?.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  }) || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Tambah Siswa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Siswa ke Kelas</DialogTitle>
          <DialogDescription>
            Pilih siswa yang ingin dimasukkan ke dalam kelas ini. Anda dapat mencari berdasarkan nama atau email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>

          <div className="border rounded-md overflow-hidden flex-1 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Memuat data siswa...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                {searchQuery ? 'Tidak ada siswa yang cocok dengan pencarian' : 'Semua siswa sudah ada di kelas ini'}
              </div>
            ) : (
              <div className="divide-y">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedIds.size > 0 && selectedIds.size === filteredStudents.length}
                      onCheckedChange={() => handleSelectAll(filteredStudents.map(s => s.id))}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Pilih Semua ({filteredStudents.length})
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedIds.size} dipilih</span>
                </div>
                {filteredStudents.map((student) => (
                  <div key={student.id} className="p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedIds.has(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <label htmlFor={`student-${student.id}`} className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium leading-none">{student.full_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{student.email}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
          <Button 
            onClick={handleAddMembers} 
            disabled={selectedIds.size === 0 || addMembers.isPending}
          >
            {addMembers.isPending ? 'Menyimpan...' : `Tambahkan (${selectedIds.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
