import { AppLayout } from '@/components/shared/AppLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="admin">{children}</AppLayout>
}