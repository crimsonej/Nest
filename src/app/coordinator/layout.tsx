import { AppLayout } from '@/components/shared/AppLayout'
import { CoordinatorSidebar } from '@/components/coordinator/CoordinatorSidebar'

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="coordinator">
      {children}
    </AppLayout>
  )
}