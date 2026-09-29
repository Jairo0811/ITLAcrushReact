export const ITLA_PROGRAMS = [
  { value: 'analitica-datos', label: 'Analítica y Ciencia de los Datos', tone: 'cyan' },
  { value: 'animacion-digital', label: 'Animación Digital', tone: 'pink' },
  { value: 'ciberseguridad', label: 'Ciberseguridad', tone: 'red' },
  { value: 'desarrollo-software', label: 'Desarrollo de Software', tone: 'blue' },
  { value: 'simulaciones-videojuegos', label: 'Desarrollo de Simulaciones Interactivas y Videojuegos', tone: 'violet' },
  { value: 'diseno-industrial', label: 'Diseño Industrial', tone: 'orange' },
  { value: 'energias-renovables', label: 'Energías Renovables', tone: 'green' },
  { value: 'informatica-forense', label: 'Informática Forense', tone: 'slate' },
  { value: 'inteligencia-artificial', label: 'Inteligencia Artificial', tone: 'indigo' },
  { value: 'manufactura-automatizada', label: 'Manufactura Automatizada', tone: 'amber' },
  { value: 'manufactura-dispositivos-medicos', label: 'Manufactura de Dispositivos Médicos', tone: 'teal' },
  { value: 'mecatronica', label: 'Mecatrónica', tone: 'lime' },
  { value: 'multimedia', label: 'Multimedia', tone: 'fuchsia' },
  { value: 'redes-informacion', label: 'Redes de la Información', tone: 'sky' },
  { value: 'seguridad-informatica', label: 'Seguridad Informática', tone: 'rose' },
  { value: 'semiconductores-microelectronica', label: 'Semiconductores y Microelectrónica', tone: 'gold' },
  { value: 'sonido', label: 'Sonido', tone: 'purple' },
  { value: 'telecomunicaciones', label: 'Telecomunicaciones', tone: 'emerald' },
]

export const ITLA_PROGRAM_VALUES = ITLA_PROGRAMS.map((program) => program.value)

export function getProgram(value) {
  return ITLA_PROGRAMS.find((program) => program.value === value) ?? null
}
