/**
 * Couleurs des séries — palette validée (bande de luminosité, chroma, séparation daltonisme, contraste).
 * Ordre fixe : série 1 = émeraude (période actuelle / CA), série 2 = bleu nuit clair (comparaison / marge).
 */
export const SERIES = {
  primary: '#047857',
  secondary: '#3b5b9a',
} as const

export const AXIS = {
  tick: { fontSize: 12, fill: 'hsl(215 16% 42%)' },
  grid: 'hsl(214 20% 92%)',
}
