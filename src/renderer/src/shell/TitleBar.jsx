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
      <div style={{ width: 16, height: 16, borderRadius: 4, background: '#000054', color: '#fff', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>QA</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#353538' }}>QA Session Recorder &amp; Reviewer</div>
      <div className="no-drag" style={{ marginLeft: 'auto', display: 'flex', height: 34 }}>
        <button className="hov-grey2" style={ctrl} onClick={() => api.win.minimize()}>─</button>
        <button className="hov-grey2" style={{ ...ctrl, fontSize: 11 }} onClick={() => api.win.toggleMaximize()}>▢</button>
        <button className="hov-close" style={ctrl} onClick={() => api.win.close()}>✕</button>
      </div>
    </div>
  )
}
