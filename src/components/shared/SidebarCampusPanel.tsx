'use client'

import Image from 'next/image'
import { Building2, MapPin } from 'lucide-react'

export function SidebarCampusPanel() {
  return (
    <div className="workspace-campus-panel relative z-10 mx-3.5 mt-3.5 h-[96px] overflow-hidden rounded-xl" aria-label="Campus workspace">
      <Image
        src="/campus-building.jpg"
        alt=""
        fill
        sizes="240px"
        className="object-cover object-center"
      />
      <div className="workspace-campus-overlay absolute inset-0" />
      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/25 bg-white/10">
            <Building2 className="h-3.5 w-3.5" />
          </span>
          NEST Campus Network
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <MapPin className="h-3 w-3 text-white/80" />
          Kampala Campus
        </div>
      </div>
    </div>
  )
}
