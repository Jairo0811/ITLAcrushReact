export function BrandLogo({ compact = false }) {
  return (
    <div className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`.trim()}>
      <img
        className="brand-logo__image"
        src="/itla-crush-logo-420.webp"
        alt="ITLA Crush"
        width="420"
        height="210"
        decoding="async"
      />
      {!compact && <small>CONFIESA. CONECTA. COMPARTE.</small>}
    </div>
  )
}

export function Icon({ name, regular = false, className = '' }) {
  return <i className={`${regular ? 'fa-regular' : 'fa-solid'} fa-${name} icon ${className}`.trim()} aria-hidden="true" />
}

export function SkipLink() {
  return <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
}
