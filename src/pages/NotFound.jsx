import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/ui.jsx'

export default function NotFound() {
  return <div className="not-found page-shell"><BrandLogo/><h1>404</h1><p>Esta historia todavía no existe.</p><Link className="button button--primary" to="/home">Volver al inicio</Link></div>
}
