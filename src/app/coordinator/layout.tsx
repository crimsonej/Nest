import { AppLayout } from '@/components/shared/AppLayout'

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="coordinator">
      {children}
    </AppLayout>
  )
}