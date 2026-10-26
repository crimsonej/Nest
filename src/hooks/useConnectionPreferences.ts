'use client'

import { useEffect, useState } from 'react'

interface NetworkInformation extends EventTarget {
  effectiveType?: string
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}

export function useRoutePrefetchEnabled() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const navigatorWithConnection = navigator as NavigatorWithConnection
    const connection = navigatorWithConnection.connection

    function updatePreference() {
      const saveData = navigatorWithConnection.connection?.saveData === true
      const slowConnection = ['slow-2g', '2g'].includes(
        navigatorWithConnection.connection?.effectiveType || ''
      )
      setEnabled(!saveData && !slowConnection)
    }

    updatePreference()
    connection?.addEventListener('change', updatePreference)

    return () => connection?.removeEventListener('change', updatePreference)
  }, [])

  return enabled
}