// ==========================================
// KELAS TYPES
// Type definitions untuk fitur manajemen kelas
// ==========================================

export interface Kelas {
  id: string;
  nama_kelas: string;
  deskripsi?: string | null;
  kode_kelas: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KelasWithMemberCount extends Kelas {
  jumlah_siswa: number;
  guru_name?: string;
}

export interface KelasForSiswa {
  id: string;
  nama_kelas: string;
  deskripsi?: string | null;
  kode_kelas: string;
  guru_name?: string;
  joined_at: string;
  created_at: string;
}

export interface KelasMember {
  id: string;
  kelas_id: string;
  siswa_id: string;
  joined_at: string;
}

export interface KelasMemberDetail {
  id: string;
  no: number;
  siswa_id: string;
  nama_siswa: string;
  email: string;
  tanggal_bergabung: string;
}

// Request/Response Types
export interface CreateKelasRequest {
  nama_kelas: string;
  deskripsi?: string;
}

export interface JoinKelasRequest {
  kode_kelas: string;
}

export interface RemoveSiswaRequest {
  siswa_id: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface GetKelasResponse {
  success: boolean;
  data: KelasWithMemberCount[] | KelasForSiswa[];
  role: 'guru' | 'siswa';
}

export interface GetMembersResponse {
  success: boolean;
  data: {
    kelas: {
      id: string;
      nama_kelas: string;
    };
    members: KelasMemberDetail[];
    total_members: number;
  };
}

export interface JoinKelasResponse {
  success: boolean;
  message: string;
  data?: {
    kelas_id: string;
    kelas_name: string;
  };
  error?: string;
}

// Database Function Response Types
export interface JoinKelasDbResponse {
  success: boolean;
  message: string;
  error?: string;
  kelas_id?: string;
  kelas_name?: string;
}

export interface RemoveSiswaDbResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Form Types untuk UI Components
export interface KelasFormData {
  nama_kelas: string;
  deskripsi: string;
}

export interface JoinKelasFormData {
  kode_kelas: string;
}

// Error Types
export type KelasErrorCode = 
  | 'KELAS_NOT_FOUND'
  | 'ALREADY_JOINED'
  | 'INVALID_USER'
  | 'UNAUTHORIZED'
  | 'NOT_MEMBER'
  | 'DATABASE_ERROR'
  | 'VALIDATION_ERROR';

export interface KelasError {
  code: KelasErrorCode;
  message: string;
}