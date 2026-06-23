import logoDark from '../assets/logo-ditbug.png'
import logoLight from '../assets/logo-ditbug-light.png'

// Logo DitBug (image détourée, fond transparent).
// tone 'dark'  : encre foncée + rouge  → pour fonds clairs (barre de titre, panneaux).
// tone 'light' : encre blanche + rouge → pour fonds sombres (barre navy).
export default function Logo({ height = 24, tone = 'dark', style }) {
  return (
    <img
      src={tone === 'light' ? logoLight : logoDark}
      alt="DitBug"
      draggable={false}
      style={{ height, width: 'auto', display: 'block', userSelect: 'none', ...style }}
    />
  )
}
