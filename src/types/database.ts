export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    role: 'siswa' | 'guru' | 'admin'
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role: 'siswa' | 'guru' | 'admin'
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: 'siswa' | 'guru' | 'admin'
                    created_at?: string
                }
            }
            soal: {
                Row: {
                    id: string
                    question_text: string
                    question_type: 'essay' | 'multiple_choice'
                    tags: string[] | null
                    difficulty_level: 'easy' | 'medium' | 'hard'
                    options: Array<{id: string, text: string}> | null
                    correct_answer: string | null
                    rubric: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    question_text: string
                    question_type?: 'essay' | 'multiple_choice'
                    tags?: string[] | null
                    difficulty_level?: 'easy' | 'medium' | 'hard'
                    options?: Array<{id: string, text: string}> | null
                    correct_answer?: string | null
                    rubric?: string | null
                    created_by: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    question_text?: string
                    question_type?: 'essay' | 'multiple_choice'
                    tags?: string[] | null
                    difficulty_level?: 'easy' | 'medium' | 'hard'
                    options?: Array<{id: string, text: string}> | null
                    correct_answer?: string | null
                    rubric?: string | null
                    created_by?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            ujian: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    duration_minutes: number
                    start_time: string | null
                    end_time: string | null
                    status: 'draft' | 'active' | 'completed'
                    created_by: string
                    created_at: string
                    updated_at: string
                    kelas_id: string | null
                    allow_remidi: boolean
                    max_attempts: number
                    visibility_setting: 'visible' | 'hidden'
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    duration_minutes: number
                    start_time?: string | null
                    end_time?: string | null
                    status?: 'draft' | 'active' | 'completed'
                    created_by: string
                    created_at?: string
                    updated_at?: string
                    kelas_id?: string | null
                    allow_remidi?: boolean
                    max_attempts?: number
                    visibility_setting?: 'visible' | 'hidden'
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    duration_minutes?: number
                    start_time?: string | null
                    end_time?: string | null
                    status?: 'draft' | 'active' | 'completed'
                    created_by?: string
                    created_at?: string
                    updated_at?: string
                    kelas_id?: string | null
                    allow_remidi?: boolean
                    max_attempts?: number
                    visibility_setting?: 'visible' | 'hidden'
                }
            }
            ujian_soal: {
                Row: {
                    id: string
                    ujian_id: string
                    soal_id: string
                    urutan: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    ujian_id: string
                    soal_id: string
                    urutan?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    ujian_id?: string
                    soal_id?: string
                    urutan?: number
                    created_at?: string
                }
            }
            ujian_siswa: {
                Row: {
                    id: string
                    ujian_id: string
                    siswa_id: string
                    status: 'not_started' | 'in_progress' | 'completed'
                    started_at: string | null
                    submitted_at: string | null
                    attempt_number: number
                }
                Insert: {
                    id?: string
                    ujian_id: string
                    siswa_id: string
                    status?: 'not_started' | 'in_progress' | 'completed'
                    started_at?: string | null
                    submitted_at?: string | null
                    attempt_number?: number
                }
                Update: {
                    id?: string
                    ujian_id?: string
                    siswa_id?: string
                    status?: 'not_started' | 'in_progress' | 'completed'
                    started_at?: string | null
                    submitted_at?: string | null
                    attempt_number?: number
                }
            }
            jawaban_siswa: {
                Row: {
                    id: string
                    ujian_id: string
                    soal_id: string
                    siswa_id: string
                    answer_text: string
                    score: number | null
                    ai_feedback: string | null
                    created_at: string
                    updated_at: string
                    attempt_number: number
                }
                Insert: {
                    id?: string
                    ujian_id: string
                    soal_id: string
                    siswa_id: string
                    answer_text: string
                    score?: number | null
                    ai_feedback?: string | null
                    created_at?: string
                    updated_at?: string
                    attempt_number?: number
                }
                Update: {
                    id?: string
                    ujian_id?: string
                    soal_id?: string
                    siswa_id?: string
                    answer_text?: string
                    score?: number | null
                    ai_feedback?: string | null
                    created_at?: string
                    updated_at?: string
                    attempt_number?: number
                }
            }
            audit_logs: {
                Row: {
                    id: string
                    actor_id: string | null
                    actor_role: 'siswa' | 'guru' | 'admin' | null
                    action: string
                    entity_type: string
                    entity_id: string | null
                    metadata: Record<string, unknown> | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    actor_id?: string | null
                    actor_role?: 'siswa' | 'guru' | 'admin' | null
                    action: string
                    entity_type: string
                    entity_id?: string | null
                    metadata?: Record<string, unknown> | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    actor_id?: string | null
                    actor_role?: 'siswa' | 'guru' | 'admin' | null
                    action?: string
                    entity_type?: string
                    entity_id?: string | null
                    metadata?: Record<string, unknown> | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
            }
            security_events: {
                Row: {
                    id: string
                    user_id: string | null
                    ujian_id: string | null
                    event_type: string
                    severity: string | null
                    details: Record<string, unknown> | null
                    source: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    ujian_id?: string | null
                    event_type: string
                    severity?: string | null
                    details?: Record<string, unknown> | null
                    source?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    ujian_id?: string | null
                    event_type?: string
                    severity?: string | null
                    details?: Record<string, unknown> | null
                    source?: string | null
                    created_at?: string
                }
            }
            system_settings: {
                Row: {
                    setting_key: string
                    value: Record<string, unknown>
                    description: string | null
                    updated_by: string | null
                    updated_at: string
                }
                Insert: {
                    setting_key: string
                    value: Record<string, unknown>
                    description?: string | null
                    updated_by?: string | null
                    updated_at?: string
                }
                Update: {
                    setting_key?: string
                    value?: Record<string, unknown>
                    description?: string | null
                    updated_by?: string | null
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role: 'siswa' | 'guru' | 'admin'
        }
    }
}
