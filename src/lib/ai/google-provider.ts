import { createGoogleGenerativeAI } from '@ai-sdk/google'

const apiKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  ''

export const googleProvider = createGoogleGenerativeAI({
  apiKey,
})

// Google AI Studio free tier: 15 RPM, 1M TPM, 1,500 RPD
export const DEFAULT_AI_MODEL = 'gemini-3.6-flash'
export const FALLBACK_AI_MODEL = 'gemini-3-flash-preview'

export function hasGoogleApiKey(): boolean {
  return apiKey.trim().length > 0
}
