import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { gradeEssayJob } from '@/lib/inngest/functions'

// Inngest API route handler untuk Next.js App Router
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    gradeEssayJob
  ],
})
