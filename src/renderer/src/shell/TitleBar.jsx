import Logo from './Logo.jsx'

const api = window.api

const ctrl = {
  width: 46,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#595987',
  fontSize: 13,
}

export default function TitleBar() {
  return (
    <div
      className="drag"
      style={{
        height: 34,
        flex: 'none',
        background: '#ECEEF2',
        borderBottom: '1px solid #DADCE3',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        gap: 10,
        userSelect: 'none',
      }}
    >
      <Logo height={24} tone="dark" />
      <div className="no-drag" style={{ marginLeft: 'auto', display: 'flex', height: 34 }}>
        <button className="hov-grey2" style={ctrl} onClick={() => api.win.minimize()}>─</button>
        <button className="hov-grey2" style={{ ...ctrl, fontSize: 11 }} onClick={() => api.win.toggleMaximize()}>▢</button>
        <button className="hov-close" style={ctrl} onClick={() => api.win.close()}>✕</button>
      </div>
    </div>
  )
}
