'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, User, GraduationCap } from 'lucide-react'

interface AuthLoadingProps {
  message?: string
  role?: 'guru' | 'siswa' | null
}

// Komponen AuthLoading dihapus sesuai permintaan user
export function AuthLoading() {
  return null
}

// Komponen loading minimal untuk inline usage
export function InlineAuthLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-3">
        <motion.div
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}