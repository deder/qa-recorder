import { useEffect, useRef, useState } from 'react'

// Avatar + menu utilisateur (TopBar). Réglages, dossier de stockage, version.
export default function UserMenu({ version, go, onOpenStorage }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const item = (icon, label, onClick) => (
    <div
      className="hov-grey"
      onClick={() => { setOpen(false); onClick?.() }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: '#000054' }}
    >
      <span style={{ width: 18, textAlign: 'center' }}>{icon}</span>{label}
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        title="Menu"
        style={{ width: 34, height: 34, borderRadius: 100, background: '#0C8CE9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
      >
        RM
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 42, right: 0, width: 220, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: 6, boxShadow: '0 18px 50px rgba(0,0,84,0.22)', zIndex: 4000 }}>
          {item('⚙', 'Réglages', () => go?.('settings'))}
          {item('▦', 'Ouvrir le dossier de stockage', () => onOpenStorage?.())}
          <div style={{ height: 1, background: '#E5E7EB', margin: '6px 4px' }} />
          <div style={{ padding: '6px 12px', fontSize: 11.5, color: '#949DB2' }}>DitBug · v{version || '—'}</div>
        </div>
      )}
    </div>
  )
}
