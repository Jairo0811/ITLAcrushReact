export const ITLA_PROGRAMS = [
  { value: 'analitica-datos', label: 'Analítica y Ciencia de los Datos', color: '#1786BF' },
  { value: 'animacion-digital', label: 'Animación Digital', color: '#A855F7' },
  { value: 'ciberseguridad', label: 'Ciberseguridad', color: '#1BBDD7' },
  { value: 'desarrollo-software', label: 'Desarrollo de Software', color: '#2593BF' },
  { value: 'simulaciones-videojuegos', label: 'Desarrollo de Simulaciones Interactivas y Videojuegos', color: '#6B22AB' },
  { value: 'diseno-industrial', label: 'Diseño Industrial', color: '#427996' },
  { value: 'energias-renovables', label: 'Energías Renovables', color: '#44CC8A' },
  { value: 'informatica-forense', label: 'Informática Forense', color: '#269EBF' },
  { value: 'inteligencia-artificial', label: 'Inteligencia Artificial', color: '#A87F47' },
  { value: 'manufactura-automatizada', label: 'Manufactura Automatizada', color: '#E2721A' },
  { value: 'manufactura-dispositivos-medicos', label: 'Manufactura de Dispositivos Médicos', color: '#C9590E' },
  { value: 'mecatronica', label: 'Mecatrónica', color: '#DA902E' },
  { value: 'multimedia', label: 'Multimedia', color: '#D93034' },
  { value: 'redes-informacion', label: 'Redes de la Información', color: '#33AF60' },
  { value: 'seguridad-informatica', label: 'Seguridad Informática', color: '#1FA6C5' },
  { value: 'semiconductores-microelectronica', label: 'Semiconductores y Microelectrónica', color: '#22D3EE' },
  { value: 'sonido', label: 'Sonido', color: '#D35055' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones', color: '#3EDA9B' },
]

export const ITLA_PROGRAM_VALUES = ITLA_PROGRAMS.map((program) => program.value)

export function getProgram(value) {
  return ITLA_PROGRAMS.find((program) => program.value === value) ?? null
}
