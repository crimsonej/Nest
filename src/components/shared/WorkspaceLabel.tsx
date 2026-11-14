'use client'

import { usePathname } from 'next/navigation'

/** Names the workspace from the URL, so pages shared by admins and coordinators show the right label. */
export function WorkspaceLabel() {
  const pathname = usePathname()
  return <>{pathname?.startsWith('/admin') ? 'Administrator Workspace' : 'Coordinator Workspace'}</>
}
