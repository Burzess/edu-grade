import { Pool } from 'pg'
import { beforeAll, afterAll, beforeEach } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

let testPool: Pool

export const setupTestDatabase = async () => {
  // Create database connection pool for testing
  testPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'edugrade_test',
    user: process.env.POSTGRES_USER || 'edugrade',
    password: process.env.POSTGRES_PASSWORD || 'test_password_123',
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
  })

  // Test connection
  try {
    const client = await testPool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Connected to test database successfully')
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error)
    throw error
  }

  return testPool
}

export const cleanupTestDatabase = async () => {
  if (testPool) {
    await testPool.end()
    console.log('🧹 Test database connection pool closed')
  }
}

export const resetTestData = async () => {
  if (!testPool) {
    throw new Error('Test database not initialized')
  }

  try {
    // Clear all test data in correct order (respecting foreign keys)
    await testPool.query('DELETE FROM jawaban_siswa')
    await testPool.query('DELETE FROM ujian_siswa') 
    await testPool.query('DELETE FROM ujian_soal')
    await testPool.query('DELETE FROM soal')
    await testPool.query('DELETE FROM ujian')
    await testPool.query('DELETE FROM profiles')

    // Re-seed basic test data
    await seedTestData()
    
    console.log('🌱 Test data reset successfully')
  } catch (error) {
    console.error('❌ Failed to reset test data:', error)
    throw error
  }
}

export const seedTestData = async () => {
  if (!testPool) {
    throw new Error('Test database not initialized')
  }

  try {
    // Insert test users
    await testPool.query(`
      INSERT INTO profiles (id, email, full_name, role) VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', 'guru@test.edugrade.com', 'Test Guru', 'guru'),
        ('550e8400-e29b-41d4-a716-446655440002', 'siswa@test.edugrade.com', 'Test Siswa 1', 'siswa'),
        ('550e8400-e29b-41d4-a716-446655440003', 'siswa2@test.edugrade.com', 'Test Siswa 2', 'siswa')
      ON CONFLICT (id) DO NOTHING
    `)

    // Insert test soal
    await testPool.query(`
      INSERT INTO soal (id, question_text, question_type, tags, difficulty_level, created_by) VALUES 
        (
          '550e8400-e29b-41d4-a716-446655440011',
          'Jelaskan konsep pemrograman berorientasi objek (OOP) beserta contohnya dalam bahasa pemrograman yang Anda kuasai.',
          'essay',
          ARRAY['programming', 'oop', 'concepts'],
          'medium',
          '550e8400-e29b-41d4-a716-446655440001'
        ),
        (
          '550e8400-e29b-41d4-a716-446655440012',
          'Manakah dari pilihan berikut yang merupakan bahasa pemrograman?',
          'multiple_choice',
          ARRAY['programming', 'basics'],
          'easy',
          '550e8400-e29b-41d4-a716-446655440001'
        )
      ON CONFLICT (id) DO NOTHING
    `)

    // Update multiple choice options
    await testPool.query(`
      UPDATE soal SET 
        options = '[
          {"id": "a", "text": "JavaScript", "label": "A"},
          {"id": "b", "text": "HTML", "label": "B"}, 
          {"id": "c", "text": "CSS", "label": "C"},
          {"id": "d", "text": "Python", "label": "D"}
        ]'::jsonb, 
        correct_answer = 'a'
      WHERE id = '550e8400-e29b-41d4-a716-446655440012'
    `)

    // Insert test ujian
    await testPool.query(`
      INSERT INTO ujian (id, name, description, duration_minutes, status, created_by) VALUES 
        (
          '550e8400-e29b-41d4-a716-446655440021',
          'Ujian Testing - Pemrograman Dasar',
          'Ujian untuk testing sistem EDU-GRADE',
          60,
          'draft',
          '550e8400-e29b-41d4-a716-446655440001'
        )
      ON CONFLICT (id) DO NOTHING
    `)

    // Link soal to ujian
    await testPool.query(`
      INSERT INTO ujian_soal (ujian_id, soal_id, urutan) VALUES 
        ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 1),
        ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440012', 2)
      ON CONFLICT (ujian_id, soal_id) DO NOTHING
    `)

    console.log('🌱 Test data seeded successfully')
  } catch (error) {
    console.error('❌ Failed to seed test data:', error)
    throw error
  }
}

export const getTestPool = () => {
  if (!testPool) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return testPool
}

// Helper function untuk execute custom queries dalam tests
export const executeQuery = async (query: string, params?: any[]) => {
  const pool = getTestPool()
  const result = await pool.query(query, params)
  return result
}

// Helper function untuk create test user
export const createTestUser = async (userData: {
  email: string
  full_name: string
  role: 'siswa' | 'guru'
  id?: string
}) => {
  const id = userData.id || crypto.randomUUID()
  
  await executeQuery(
    'INSERT INTO profiles (id, email, full_name, role) VALUES ($1, $2, $3, $4)',
    [id, userData.email, userData.full_name, userData.role]
  )
  
  return { id, ...userData }
}

// Helper function untuk create test ujian
export const createTestUjian = async (ujianData: {
  name: string
  description?: string
  duration_minutes?: number
  status?: string
  created_by: string
  id?: string
}) => {
  const id = ujianData.id || crypto.randomUUID()
  
  await executeQuery(
    `INSERT INTO ujian (id, name, description, duration_minutes, status, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      ujianData.name,
      ujianData.description || 'Test ujian',
      ujianData.duration_minutes || 60,
      ujianData.status || 'draft',
      ujianData.created_by
    ]
  )
  
  return { id, ...ujianData }
}

// Global test setup
beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await cleanupTestDatabase()
})

beforeEach(async () => {
  // Reset data sebelum setiap test
  if (process.env.TEST_DATABASE_RESET === 'true') {
    await resetTestData()
  }
})

export default {
  setupTestDatabase,
  cleanupTestDatabase,
  resetTestData,
  seedTestData,
  getTestPool,
  executeQuery,
  createTestUser,
  createTestUjian
}