import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../storage'

export function usePhotoUrl(photoId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    setUrl(null)
    if (!photoId) return
    getPhotoUrl(photoId).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      revoked = u
      setUrl(u)
    })
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [photoId])

  return url
}
