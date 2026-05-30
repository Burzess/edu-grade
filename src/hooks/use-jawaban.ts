/**
 * Re-export shim — all jawaban hooks now live in src/features/jawaban/hooks/.
 * This file exists for backward compatibility until all importers are migrated.
 */
export {
  checkMultipleChoiceAnswer,
  calculateUjianScore,
  triggerAIGrading,
  triggerBatchAIGrading,
  useJawabanByUjian,
  useJawabanSiswa,
  useCompletedUjianIds,
  useCompletedUjianSiswa,
  useInProgressUjianSiswa,
  useAvailableUjian,
  useUjianForSiswa,
  useSubmitJawaban,
  useLocalAutoSave,
  useDebouncedSubmitJawaban,
  useBatchSubmitJawaban,
  useUpdateJawaban,
  useBatchAIGrading,
} from '@/features/jawaban/hooks'
