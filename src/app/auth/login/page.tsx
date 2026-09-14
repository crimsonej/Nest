'use client'

import { Suspense } from 'react'
import { AuthStage } from '@/components/shared/AuthStage'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-xs text-text-muted">Loading workspace auth...</div>}>
      <AuthStage initialMode="login" />
    </Suspense>
  )
}