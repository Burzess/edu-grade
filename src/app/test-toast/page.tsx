'use client'

import { Button } from "@/components/ui/button"
import { toastSuccess, toastError, toastInfo } from "@/lib/toast"

export default function TestToastPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Test Toast Notifications</h1>
      
      <div className="space-y-4">
        <Button 
          onClick={() => toastSuccess('Berhasil!', 'Data berhasil disimpan')}
          className="bg-green-600 hover:bg-green-700"
        >
          Test Success Toast
        </Button>
        
        <Button 
          onClick={() => toastError('Error', 'Anda sudah terdaftar di kelas ini')}
          variant="destructive"
        >
          Test Error Toast
        </Button>
        
        <Button 
          onClick={() => toastInfo('Info', 'Proses sedang berlangsung')}
          variant="outline"
        >
          Test Info Toast
        </Button>
      </div>
    </div>
  )
}