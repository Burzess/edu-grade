import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { DemoDataService, DEMO_UJIAN, DEMO_SOAL, DEMO_UJIAN_SISWA, DEMO_JAWABAN_SISWA, DEMO_PROFILES } from '@/lib/demo/demo-data'

/**
 * Mock Supabase client yang akan menggantikan semua operasi database
 * dengan data demo ketika DEMO_MODE aktif
 */
class UniversalSupabaseClient {
  private isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  private realClient: any

  constructor() {
    if (!this.isDemoMode) {
      this.realClient = createSupabaseClient()
    }
  }

  // Auth methods
  get auth() {
    if (this.isDemoMode) {
      return {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: () => Promise.resolve({ data: null, error: { message: 'Demo mode: signUp disabled' } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Demo mode: use demo login' } }),
        signOut: () => Promise.resolve({ error: null })
      }
    }
    return this.realClient.auth
  }

  // Table operations
  from(table: string) {
    if (this.isDemoMode) {
      return new DemoTable(table)
    }
    return this.realClient.from(table)
  }

  // Channel methods for real-time (disabled in demo)
  channel(name: string) {
    if (this.isDemoMode) {
      return {
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {}
      }
    }
    return this.realClient.channel(name)
  }

  removeChannel(channel: any) {
    if (this.isDemoMode) {
      return
    }
    return this.realClient.removeChannel(channel)
  }
}

class DemoTable {
  constructor(private tableName: string) {}

  select(columns: string = '*', options?: any) {
    return new DemoQueryBuilder(this.tableName, 'select', columns, undefined, options)
  }

  insert(data: any) {
    return new DemoQueryBuilder(this.tableName, 'insert', '*', data)
  }

  update(data: any) {
    return new DemoQueryBuilder(this.tableName, 'update', '*', data)
  }

  delete() {
    return new DemoQueryBuilder(this.tableName, 'delete')
  }
}

class DemoQueryBuilder {
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private selectColumns: string = '*'

  constructor(
    private tableName: string,
    private operation: 'select' | 'insert' | 'update' | 'delete',
    private columns: string = '*',
    private data?: any,
    private options?: any
  ) {
    this.selectColumns = columns
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value })
    return this
  }

  not(column: string, operator: string, value: any) {
    this.filters.push({ column, operator: 'not', value: { op: operator, val: value } })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: 'lte', value })
    return this
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: 'lt', value })
    return this
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: 'gt', value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  single() {
    return this.executeQuery(true)
  }

  select(columns: string, options?: any) {
    this.selectColumns = columns
    this.options = options
    return this
  }

  // Execute query dan return mock result
  async executeQuery(single = false): Promise<{ data: any; error: any; count?: number }> {
    try {
      let result: any[] = []

      // Get data berdasarkan table
      switch (this.tableName) {
        case 'profiles':
          result = [...DEMO_PROFILES]
          break
        case 'ujian':
          result = [...DEMO_UJIAN]
          break
        case 'soal':
          result = [...DEMO_SOAL]
          break
        case 'ujian_siswa':
          result = [...DEMO_UJIAN_SISWA]
          break
        case 'jawaban_siswa':
          result = [...DEMO_JAWABAN_SISWA]
          break
        case 'ujian_soal':
          // Mock ujian_soal relationships
          result = []
          break
        default:
          console.log(`Demo mode: Table ${this.tableName} not mocked, returning empty result`)
          return { data: null, error: null }
      }

      // Apply filters
      for (const filter of this.filters) {
        result = result.filter(item => {
          const itemValue = item[filter.column as keyof typeof item]
          
          switch (filter.operator) {
            case 'eq':
              return itemValue === filter.value
            case 'neq':
              return itemValue !== filter.value
            case 'not':
              const notOp = filter.value.op
              const notVal = filter.value.val
              if (notOp === 'eq') return itemValue !== notVal
              return true
            case 'in':
              return filter.value.includes(itemValue)
            case 'gte':
              return itemValue >= filter.value
            case 'lte':
              return itemValue <= filter.value
            case 'lt':
              return itemValue < filter.value
            case 'gt':
              return itemValue > filter.value
            default:
              return true
          }
        })
      }

      // Apply ordering
      if (this.orderBy) {
        result.sort((a, b) => {
          const aValue = a[this.orderBy!.column as keyof typeof a]
          const bValue = b[this.orderBy!.column as keyof typeof b]
          
          if (aValue < bValue) return this.orderBy!.ascending ? -1 : 1
          if (aValue > bValue) return this.orderBy!.ascending ? 1 : -1
          return 0
        })
      }

      // Apply range/limit
      if (this.rangeFrom !== null && this.rangeTo !== null) {
        result = result.slice(this.rangeFrom, this.rangeTo + 1)
      } else if (this.limitCount) {
        result = result.slice(0, this.limitCount)
      }

      // Handle single result
      if (single) {
        return { 
          data: result.length > 0 ? result[0] : null, 
          error: result.length === 0 ? { code: 'PGRST116', message: 'No rows found' } : null 
        }
      }

      // Handle operations
      switch (this.operation) {
        case 'select':
          const count = this.options?.count === 'exact' ? result.length : undefined
          return { data: result, error: null, count }
        
        case 'insert':
          // Simulate successful insert
          console.log('Demo: Simulated INSERT to', this.tableName, this.data)
          return { data: [{ ...this.data, id: `demo-insert-${Date.now()}` }], error: null }
        
        case 'update':
          // Simulate successful update
          console.log('Demo: Simulated UPDATE to', this.tableName, this.data)
          return { data: result.map(item => ({ ...item, ...this.data })), error: null }
        
        case 'delete':
          // Simulate successful delete
          console.log('Demo: Simulated DELETE from', this.tableName)
          return { data: result, error: null }
        
        default:
          return { data: result, error: null }
      }

    } catch (error) {
      console.error('Demo query error:', error)
      return { data: null, error: { message: 'Demo query error' } }
    }
  }

  // Make it thenable
  then(callback: (result: { data: any; error: any; count?: number }) => void) {
    return this.executeQuery().then(callback)
  }
}

// Export the universal client
export function createClient() {
  return new UniversalSupabaseClient()
}

// Re-export untuk backward compatibility
export { createClient as default }
