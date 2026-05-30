// Fungsi untuk mengacak array (Fisher-Yates shuffle)
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

// Simple seeded random function
export const seededRandom = (seed: string) => {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff
    }
    return Math.abs(hash) / 2147483647
}

/** A single ujian_soal row with its nested soal data. */
interface UjianSoalItem {
    id: string
    soal_id: string
    urutan: number
    soal: {
        id: string
        question_text: string
        question_type: string
        options?: unknown[] | null
        correct_answer?: string | null
        tags?: string[] | null
    } | null
}

/** Grouped question sections. */
interface QuestionSections {
    multipleChoice: UjianSoalItem[]
    essay: UjianSoalItem[]
    all: UjianSoalItem[]
}

// Organize and shuffle questions based on question_type (both MC and Essay are shuffled)
export const organizeQuestions = (ujianSoal: UjianSoalItem[], ujianId: string): UjianSoalItem[] => {
    if (!ujianSoal?.length) return []

    const sortedUjianSoal = ujianSoal.sort((a, b) => a.urutan - b.urutan)
    const validQuestions = sortedUjianSoal.filter((us) => us.soal)

    // Kelompokkan soal berdasarkan question_type
    const multipleChoice = validQuestions.filter((us) => us.soal!.question_type === 'multiple_choice')
    const essay = validQuestions.filter((us) => us.soal!.question_type === 'essay')

    // Acak soal untuk setiap siswa (seed berdasarkan user ID + ujian ID)
    const userId = (typeof window !== 'undefined' ? (() => { try { return localStorage.getItem('current_user_id') } catch { return null } })() : null) || Math.random().toString()
    const seed = `${userId}-${ujianId}`
    
    // Acak soal multiple choice
    const shuffledMC = [...multipleChoice]
    for (let i = shuffledMC.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(`${seed}-mc-${i}`) * (i + 1));
        [shuffledMC[i], shuffledMC[j]] = [shuffledMC[j], shuffledMC[i]]
    }

    // Acak soal essay juga
    const shuffledEssay = [...essay]
    for (let i = shuffledEssay.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(`${seed}-essay-${i}`) * (i + 1));
        [shuffledEssay[i], shuffledEssay[j]] = [shuffledEssay[j], shuffledEssay[i]]
    }

    // Gabungkan: multiple choice dulu (diacak), kemudian essay (diacak)
    return [...shuffledMC, ...shuffledEssay]
}

// Group questions for navigator
export const groupQuestions = (organizedQuestions: UjianSoalItem[]): QuestionSections => {
    const mcQuestions = organizedQuestions.filter((q) => q.soal?.question_type === 'multiple_choice')
    const essayQuestions = organizedQuestions.filter((q) => q.soal?.question_type === 'essay')

    return {
        multipleChoice: mcQuestions,
        essay: essayQuestions,
        all: organizedQuestions
    }
}

// Calculate section index and total for proper navigation
export const getSectionInfo = (currentQuestion: UjianSoalItem | null, questionSections: QuestionSections) => {
    if (!currentQuestion) return { sectionIndex: 0, sectionTotal: 0 }

    const currentSectionType = currentQuestion?.soal?.question_type || 'multiple_choice'

    if (currentSectionType === 'multiple_choice') {
        const mcIndex = questionSections.multipleChoice.findIndex((q) => q.soal?.id === currentQuestion.soal?.id)
        return {
            sectionIndex: mcIndex,
            sectionTotal: questionSections.multipleChoice.length
        }
    } else {
        const essayIndex = questionSections.essay.findIndex((q) => q.soal?.id === currentQuestion.soal?.id)
        return {
            sectionIndex: essayIndex,
            sectionTotal: questionSections.essay.length
        }
    }
}

// Calculate progress for each section
export const calculateSectionProgress = (questionSections: QuestionSections, answers: { [key: string]: string }) => {
    const mcAnswered = questionSections.multipleChoice.filter((q) => answers[q.soal?.id ?? '']?.trim()).length
    const essayAnswered = questionSections.essay.filter((q) => answers[q.soal?.id ?? '']?.trim()).length

    return {
        multipleChoice: {
            answered: mcAnswered,
            total: questionSections.multipleChoice.length,
            percentage: questionSections.multipleChoice.length > 0 ? (mcAnswered / questionSections.multipleChoice.length) * 100 : 0
        },
        essay: {
            answered: essayAnswered,
            total: questionSections.essay.length,
            percentage: questionSections.essay.length > 0 ? (essayAnswered / questionSections.essay.length) * 100 : 0
        }
    }
}

// Format time from seconds to readable format
export const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
}
