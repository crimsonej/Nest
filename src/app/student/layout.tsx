import { AppLayout } from '@/components/shared/AppLayout'
import { StudentSidebar } from '@/components/student/StudentSidebar'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="student">
      {children}
    </AppLayout>
  )
}