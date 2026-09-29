import { Link } from 'react-router-dom'
import './legal.css'

const sections = [
  {
    id: 'terminos',
    icon: '◇',
    title: 'Términos de Uso',
    intro: 'ITLA Crush es un espacio comunitario. Al crear una cuenta o utilizar la plataforma aceptas usarla de forma responsable.',
    items: [
      'No publiques amenazas, acoso, difamación, injurias, discriminación, suplantación de identidad ni contenido ilegal.',
      'No compartas credenciales, datos privados, conversaciones privadas, imágenes sensibles ni información personal de terceros sin autorización.',
      'Cada usuario es responsable del contenido publicado desde su cuenta y de mantener sus credenciales protegidas.',
      'ITLA Crush puede ocultar o retirar contenido, limitar funciones o suspender cuentas cuando existan incumplimientos de estas normas.',
    ],
  },
  {
    id: 'privacidad',
    icon: '◉',
    title: 'Privacidad y anonimato',
    intro: 'Puedes expresarte de forma anónima frente a la comunidad, pero el anonimato público no equivale a anonimato ante la plataforma.',
    items: [
      'Cuando una confesión se publica como anónima, otros usuarios no reciben tu nombre, correo ni identificador interno.',
      'La plataforma conserva internamente la asociación entre la cuenta autenticada y el contenido para seguridad, moderación, prevención de abuso y trazabilidad.',
      'El acceso administrativo a información de identidad debe limitarse a personal autorizado y a finalidades legítimas de operación, seguridad o cumplimiento legal.',
      'La información no debe utilizarse para exponer públicamente a quien haya publicado de forma anónima.',
    ],
  },
  {
    id: 'comunidad',
    icon: '♡',
    title: 'Normas de la Comunidad',
    intro: 'La libertad para confesar no elimina la responsabilidad de respetar a las demás personas.',
    items: [
      'Conecta con respeto: evita humillaciones, hostigamiento, amenazas, campañas de odio o ataques dirigidos.',
      'No suplantes a estudiantes, docentes, empleados, organizaciones ni terceros.',
      'No uses ITLA Crush para revelar secretos, datos personales o contenido privado de otras personas.',
      'Usa las herramientas de reporte y bloqueo cuando una publicación o una cuenta viole estas reglas.',
    ],
  },
  {
    id: 'moderacion',
    icon: '⚑',
    title: 'Moderación y seguridad',
    intro: 'Los reportes permiten proteger a la comunidad sin eliminar la trazabilidad necesaria para investigar abusos.',
    items: [
      'El contenido reportado puede pasar a revisión, ocultarse preventivamente o retirarse.',
      'La plataforma puede conservar metadatos mínimos de moderación incluso cuando un contenido deja de ser visible.',
      'Las sanciones pueden incluir advertencias, limitaciones, suspensión temporal o desactivación de cuenta.',
      'Los requerimientos de autoridades competentes deben gestionarse mediante el proceso legal aplicable y con acceso restringido.',
    ],
  },
]

export default function LegalPage({ focus }) {
  return (
    <div className="legal-page page-shell">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <img src="/itla-crush-logo.webp" alt="ITLA Crush" />
        </Link>
        <Link to="/" className="button button--soft">← Volver</Link>
      </header>

      <main className="legal-content">
        <section className="legal-hero glass-card">
          <span className="legal-kicker">SEGURIDAD · PRIVACIDAD · RESPETO</span>
          <h1>Reglas claras para conectar con confianza.</h1>
          <p>Estos principios explican cómo funciona el anonimato, qué esperamos de la comunidad y cómo protegemos la plataforma.</p>
          <div className="legal-highlight">
            <strong>Anónimo para la comunidad ≠ anónimo para la plataforma.</strong>
            <span>Tu identidad puede permanecer oculta frente a otros usuarios, mientras la asociación interna con tu cuenta se conserva para seguridad y moderación.</span>
          </div>
        </section>

        <nav className="legal-nav glass-card" aria-label="Secciones legales">
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        </nav>

        <div className="legal-grid">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className={`legal-card glass-card ${focus === section.id ? 'legal-card--focus' : ''}`}>
              <div className="legal-icon" aria-hidden="true">{section.icon}</div>
              <h2>{section.title}</h2>
              <p>{section.intro}</p>
              <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ))}
        </div>

        <section className="legal-law glass-card">
          <h2>Marco de seguridad digital</h2>
          <p>
            ITLA Crush se diseña teniendo en cuenta obligaciones de seguridad, privacidad y uso responsable de sistemas de información,
            incluyendo principios relevantes de la Ley No. 53-07 de la República Dominicana. Esta página describe las reglas operativas
            de la plataforma y no sustituye asesoría jurídica profesional.
          </p>
        </section>

        <footer className="legal-footer">
          <span>ITLA Crush · Confiesa. Conecta. Comparte.</span>
          <div>
            <Link to="/terminos">Términos</Link>
            <Link to="/privacidad">Privacidad</Link>
            <Link to="/normas">Normas</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
