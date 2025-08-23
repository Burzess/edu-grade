// Circuit breaker hook untuk mencegah infinite API calls
import { useRef, useCallback } from 'react'

interface CircuitBreakerOptions {
  maxFailures: number
  resetTimeout: number
  failureThreshold: number
}

interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

export function useCircuitBreaker(options: CircuitBreakerOptions) {
  const { maxFailures = 5, resetTimeout = 30000, failureThreshold = 3 } = options
  
  const state = useRef<CircuitBreakerState>({
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  })

  const canExecute = useCallback(() => {
    const now = Date.now()
    const currentState = state.current

    // If circuit is open, check if we should reset
    if (currentState.state === 'OPEN') {
      if (now - currentState.lastFailureTime >= resetTimeout) {
        console.log('🔄 Circuit breaker: Transitioning to HALF_OPEN')
        currentState.state = 'HALF_OPEN'
        currentState.failures = 0
        return true
      }
      console.log('⚡ Circuit breaker: BLOCKED - Too many failures')
      return false
    }

    // If too many consecutive failures, open circuit
    if (currentState.failures >= maxFailures) {
      console.log('⚡ Circuit breaker: OPENING - Max failures reached')
      currentState.state = 'OPEN'
      currentState.lastFailureTime = now
      return false
    }

    return true
  }, [maxFailures, resetTimeout])

  const onSuccess = useCallback(() => {
    if (state.current.state === 'HALF_OPEN') {
      console.log('✅ Circuit breaker: CLOSING - Recovery successful')
      state.current.state = 'CLOSED'
    }
    state.current.failures = 0
  }, [])

  const onFailure = useCallback(() => {
    state.current.failures += 1
    state.current.lastFailureTime = Date.now()
    
    console.log(`❌ Circuit breaker: Failure ${state.current.failures}/${maxFailures}`)
    
    if (state.current.failures >= failureThreshold && state.current.state === 'CLOSED') {
      console.log('⚡ Circuit breaker: OPENING due to failure threshold')
      state.current.state = 'OPEN'
    }
  }, [maxFailures, failureThreshold])

  const reset = useCallback(() => {
    console.log('🔄 Circuit breaker: Manual RESET')
    state.current.failures = 0
    state.current.state = 'CLOSED'
    state.current.lastFailureTime = 0
  }, [])

  const getState = useCallback(() => ({
    ...state.current
  }), [])

  return {
    canExecute,
    onSuccess,
    onFailure,
    reset,
    getState,
    isOpen: state.current.state === 'OPEN'
  }
}

// Rate limiter hook untuk membatasi frequency calls
export function useRateLimiter(maxCalls: number = 10, windowMs: number = 60000) {
  const calls = useRef<number[]>([])

  const canExecute = useCallback(() => {
    const now = Date.now()
    
    // Remove calls outside the time window
    calls.current = calls.current.filter(callTime => now - callTime < windowMs)
    
    // Check if we're under the limit
    if (calls.current.length >= maxCalls) {
      console.log(`🚫 Rate limiter: Blocked - ${calls.current.length}/${maxCalls} calls in window`)
      return false
    }
    
    // Record this call
    calls.current.push(now)
    return true
  }, [maxCalls, windowMs])

  const reset = useCallback(() => {
    calls.current = []
  }, [])

  return {
    canExecute,
    reset,
    currentCalls: calls.current.length
  }
}
