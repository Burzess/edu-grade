import { z } from 'zod'

export const visibilitySettingSchema = z.enum(['visible', 'hidden'], {
  errorMap: () => ({
    message: "visibility_setting harus 'visible' atau 'hidden'",
  }),
})

export const visibilityUpdateSchema = z.object({
  visibility_setting: visibilitySettingSchema,
})

export type VisibilitySetting = z.infer<typeof visibilitySettingSchema>
export type VisibilityUpdateInput = z.infer<typeof visibilityUpdateSchema>
