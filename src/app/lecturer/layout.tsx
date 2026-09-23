import { AppLayout } from '@/components/shared/AppLayout'

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="lecturer">
      {children}
    </AppLayout>
  )
}
