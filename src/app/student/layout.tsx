import { AppLayout } from '@/components/shared/AppLayout'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="student">
      {children}
    </AppLayout>
  )
}