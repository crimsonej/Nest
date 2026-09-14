'use client'

import { Suspense } from 'react'
import { AuthStage } from '@/components/shared/AuthStage'

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-xs text-text-muted">Loading workspace auth...</div>}>
      <AuthStage initialMode="register" />
    </Suspense>
  )
}