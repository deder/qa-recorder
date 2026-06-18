import { useEffect } from 'react'

// ↑ / ↓ : chapitre précédent / suivant · Espace : lecture/pause
export function useKeyboardNav({ onPrev, onNext, onTogglePlay }) {
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        onPrev()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        onNext()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onTogglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPrev, onNext, onTogglePlay])
}
