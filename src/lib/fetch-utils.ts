/**
 * Utility untuk robust fetch dengan timeout dan retry mechanism
 * Mengatasi masalah AbortError dan network issues
 */

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

/**
 * Fetch dengan timeout dan retry capability
 */
export async function fetchWithTimeout(
  url: string, 
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 3000,
    retries = 1,
    retryDelay = 500,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Set timeout
      timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort()
        }
      }, timeout)

      // Make request
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })

      // Clear timeout on success
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      return response

    } catch (error) {
      lastError = error as Error

      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      // Don't retry on AbortError if it's the last attempt
      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt === retries) {
          console.warn(`Fetch timeout after ${timeout}ms (attempt ${attempt + 1}/${retries + 1})`)
          break
        }
      }

      // Don't retry on 4xx errors (client errors)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error
      }

      // Retry dengan delay
      if (attempt < retries) {
        console.warn(`Fetch failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw lastError || new Error('Fetch failed after all retry attempts')
}

/**
 * Specialized fetch untuk auth check dengan optimized settings
 */
export async function authFetch(url: string = '/api/auth/check'): Promise<Response> {
  const startTime = Date.now()
  
  // Emit debug event
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('authDebug', {
      detail: { type: 'auth_request_start', data: { url } }
    }))
  }

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-cache',
      timeout: 2000,     // 2 second timeout
      retries: 1,        // 1 retry
      retryDelay: 300    // 300ms delay between retries
    })

    // Emit success event
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authDebug', {
        detail: { 
          type: 'auth_request_success', 
          data: { 
            url, 
            responseTime: Date.now() - startTime,
            status: response.status 
          } 
        }
      }))
    }

    return response
  } catch (error) {
    // Emit error event
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const errorType = (error as Error).name === 'AbortError' 
        ? 'auth_request_abort' 
        : 'auth_request_error'
      
      window.dispatchEvent(new CustomEvent('authDebug', {
        detail: { 
          type: errorType, 
          data: { 
            url, 
            error: (error as Error).message,
            responseTime: Date.now() - startTime
          } 
        }
      }))
    }

    throw error
  }
}

/**
 * Safe fetch yang tidak throw error untuk AbortError
 */
export async function safeFetch(
  url: string, 
  options: FetchWithTimeoutOptions = {}
): Promise<{ response?: Response; error?: Error }> {
  try {
    const response = await fetchWithTimeout(url, options)
    return { response }
  } catch (error) {
    const err = error as Error
    
    // Don't treat AbortError as real error untuk UX
    if (err.name === 'AbortError') {
      console.debug('Fetch was aborted (likely due to timeout or navigation)')
      return { error: err }
    }
    
    return { error: err }
  }
}

/**
 * Check if error is a network/timeout error yang bisa di-retry
 */
export function isRetryableError(error: Error): boolean {
  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('timeout')
  )
}

/**
 * Create AbortController dengan auto-cleanup
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController
  cleanup: () => void
} {
  const controller = new AbortController()
  
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort()
    }
  }, timeoutMs)

  const cleanup = () => {
    clearTimeout(timeoutId)
  }

  return { controller, cleanup }
}