import { useEffect } from 'react'

// Modale de confirmation intégrée (remplace window.confirm — jamais de dialogue natif).
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
      else if (e.key === 'Enter') onConfirm?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  const confirmColor = danger ? '#E64C35' : '#000054'
  const confirmHover = danger ? 'hov-red' : 'hov-navy'

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(13,15,25,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: '90vw', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 70px rgba(0,0,84,0.28)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, flex: 'none', borderRadius: 100, background: danger ? '#FDECEA' : '#E5F2FD', color: danger ? '#E64C35' : '#0C8CE9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{danger ? '⚠' : 'ⓘ'}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#000054' }}>{title}</div>
        </div>
        {message && <div style={{ fontSize: 13.5, color: '#595987', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{message}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button className="hov-grey" onClick={onCancel} style={{ height: 40, padding: '0 18px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#fff', color: '#000054', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{cancelLabel}</button>
          <button className={confirmHover} onClick={onConfirm} style={{ height: 40, padding: '0 18px', borderRadius: 8, background: confirmColor, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
