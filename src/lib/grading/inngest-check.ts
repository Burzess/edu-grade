/**
 * Utility to check if Inngest is reachable for queuing background jobs.
 * Prevents jobs from being sent into a void when Inngest dev server is not running locally.
 */
export async function isInngestAvailable(): Promise<boolean> {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
  const hasInngestKeys = Boolean(process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY)

  // In production with credentials, assume Inngest cloud is ready
  if (!isDev && hasInngestKeys) {
    return true
  }

  // In local development, probe the local Inngest dev server
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300)
    const res = await fetch('http://127.0.0.1:8288', {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null)
    clearTimeout(timeout)

    return res !== null
  } catch {
    return false
  }
}
