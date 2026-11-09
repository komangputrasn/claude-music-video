// Y2K palette — see DESIGN.md §2.
export const C = {
  y2kBlue: '#1E5BFF',
  titleA: '#0A3FD8',
  titleB: '#4B9BFF',
  aqua: '#19C6FF',
  ice: '#BFF3FF',
  bubblegum: '#FF4FB8',
  tangerine: '#FF8A1E',
  lime: '#9BFF3A',
  grape: '#8A4DFF',
  chrome: '#E8ECF4',
  night: '#050A2A',
  windowBeige: '#ECE9D8',
  alertRed: '#E2231A',
  pancakeGold: '#E9B25E',
  pancakeCream: '#FFF0D2',
  sodium: '#FFB347',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** System font stacks (installed locally — never download fonts). */
export const FONTS = {
  ui: 'Tahoma, Verdana, sans-serif',
  web: '"Trebuchet MS", Verdana, sans-serif',
  verdana: 'Verdana, Tahoma, sans-serif',
  heavy: '"Arial Black", Impact, sans-serif',
  impact: 'Impact, "Arial Black", sans-serif',
  comic: '"Comic Sans MS", "Chalkboard", sans-serif',
  papyrus: 'Papyrus, "Herculanum", serif',
  mono: '"Courier New", "Andale Mono", monospace',
  lcd: '"Andale Mono", "Courier New", monospace',
  serif: 'Georgia, serif',
} as const;
