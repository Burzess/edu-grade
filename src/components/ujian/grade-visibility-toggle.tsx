'use client'

import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { useUpdateVisibility } from '@/features/ujian/hooks/use-visibility-setting'
import type { VisibilitySetting } from '@/lib/schemas/visibility-schema'

interface GradeVisibilityToggleProps {
  ujianId: string
  currentSetting: VisibilitySetting
  onSettingChange?: (newSetting: VisibilitySetting) => void
}

export function GradeVisibilityToggle({
  ujianId,
  currentSetting,
  onSettingChange,
}: GradeVisibilityToggleProps) {
  const mutation = useUpdateVisibility(ujianId)

  const isVisible = currentSetting === 'visible'

  const handleToggle = (checked: boolean) => {
    const newSetting: VisibilitySetting = checked ? 'visible' : 'hidden'

    mutation.mutate(newSetting, {
      onSuccess: () => {
        toast.success('Pengaturan visibilitas berhasil diubah')
        onSettingChange?.(newSetting)
      },
      onError: () => {
        toast.error('Gagal menyimpan pengaturan')
      },
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="grade-visibility-toggle"
        checked={isVisible}
        onCheckedChange={handleToggle}
        disabled={mutation.isPending}
        aria-label="Toggle visibilitas nilai"
      />
      <label
        htmlFor="grade-visibility-toggle"
        className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none"
      >
        {isVisible ? (
          <Eye className="h-4 w-4 text-green-600" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span>
          {isVisible ? 'Nilai terlihat oleh siswa' : 'Nilai disembunyikan dari siswa'}
        </span>
      </label>
    </div>
  )
}
