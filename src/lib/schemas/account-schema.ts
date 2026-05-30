import { z } from 'zod'

export const createAccountSchema = z
  .object({
    email: z
      .string()
      .email('Format email tidak valid')
      .max(254, 'Email maksimal 254 karakter'),
    full_name: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter')
      .max(100, 'Nama lengkap maksimal 100 karakter'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .max(72, 'Password maksimal 72 karakter'),
    confirm_password: z.string(),
    role: z.enum(['siswa', 'guru'], {
      errorMap: () => ({ message: "Role harus 'siswa' atau 'guru'" }),
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Password dan konfirmasi password harus sama',
    path: ['confirm_password'],
  })

export const importRowSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  full_name: z
    .string()
    .trim()
    .min(1, 'Nama lengkap tidak boleh kosong'),
  role: z.enum(['siswa', 'guru'], {
    errorMap: () => ({ message: "Role harus 'siswa' atau 'guru'" }),
  }),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(72, 'Password maksimal 72 karakter'),
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type ImportRowInput = z.infer<typeof importRowSchema>
