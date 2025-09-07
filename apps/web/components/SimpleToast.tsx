'use client'

import React from 'react'

export default function SimpleToast() {
  const [msg, setMsg] = React.useState<string | null>(null)
  React.useEffect(() => {
    const handler = (e: any) => {
      const m = e?.detail?.message
      if (!m) return
      setMsg(m)
      const t = setTimeout(() => setMsg(null), 2000)
      return () => clearTimeout(t)
    }
    window.addEventListener('toast' as any, handler)
    return () => window.removeEventListener('toast' as any, handler)
  }, [])

  if (!msg) return null
  return (
    <div className="fixed bottom-20 left-4 z-50 px-3 py-2 rounded-md shadow bg-black/80 text-white text-sm">
      {msg}
    </div>
  )
}

