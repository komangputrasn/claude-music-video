/**
 * Y2K UI kit — theme: window metrics, title-bar themes, UI colours and font stacks (system fonts only).
 *
 * API
 *   WIN               window metrics in CSS px at scale 1 (frame, titleH, radii, control size...)
 *   TITLE_THEMES      title-bar colour themes: blue (default), inactive, gold, pink, lime, silver, red, night
 *   UIC               UI colours (beige body, bevel light/shadow, button border, text...)
 *   UIF               font families (Tahoma etc.) + font() helper re-export
 *   AQUA_COLORS       gel-button colour ramps (aqua, lime, bubblegum, tangerine, grape, graphite, red)
 *
 * Usage
 *   import {WIN, TITLE_THEMES} from '../lib/ui/theme';
 *   const bodyTop = WIN.titleH; // y where the window body starts
 */
import {C, FONTS} from '../palette';

export const WIN = {
  /** blue frame thickness on the sides and bottom */
  frame: 4,
  /** title bar height (window body starts here) */
  titleH: 34,
  /** outer corner radii */
  rTop: 10,
  rBottom: 5,
  /** title bar control button size / gap / right margin */
  ctrl: 24,
  ctrlGap: 3,
  ctrlMargin: 6,
  titleFontSize: 16,
  titleIcon: 20,
} as const;

export type TitleThemeName = 'blue' | 'inactive' | 'gold' | 'pink' | 'lime' | 'silver' | 'red' | 'night';
export type TitleTheme = {
  /** title bar horizontal gradient left -> right */
  title: [string, string];
  /** side/bottom frame gradient left -> right */
  frame: [string, string];
  /** 1px outer edge */
  edge: string;
  text: string;
  textShadow: string;
  /** min/max button gradient (top, bottom) */
  btn: [string, string, string];
};

export const TITLE_THEMES: Record<TitleThemeName, TitleTheme> = {
  blue: {
    title: [C.titleA, C.titleB],
    frame: [C.titleA, '#3B86F6'],
    edge: '#05218A',
    text: '#FFFFFF',
    textShadow: 'rgba(0,14,80,0.85)',
    btn: ['#8EC0FF', '#2F6DEB', '#2A62E0'],
  },
  inactive: {
    title: ['#6886DC', '#A6C2F6'],
    frame: ['#6886DC', '#9CB8F0'],
    edge: '#4A63A8',
    text: '#F2F6FF',
    textShadow: 'rgba(30,50,120,0.6)',
    btn: ['#C5D8FA', '#88A6E6', '#8AA8E8'],
  },
  gold: {
    title: ['#B86200', '#FFC93D'],
    frame: ['#B86200', '#F5B027'],
    edge: '#6E3A00',
    text: '#FFFFFF',
    textShadow: 'rgba(90,40,0,0.85)',
    btn: ['#FFE39A', '#E79A12', '#E0920E'],
  },
  pink: {
    title: ['#B5127A', C.bubblegum],
    frame: ['#B5127A', '#F45AB8'],
    edge: '#6A0647',
    text: '#FFFFFF',
    textShadow: 'rgba(90,0,50,0.85)',
    btn: ['#FFB6E3', '#E0409F', '#D83A98'],
  },
  lime: {
    title: ['#2F8A0C', '#8BE83A'],
    frame: ['#2F8A0C', '#74D22C'],
    edge: '#1B5205',
    text: '#FFFFFF',
    textShadow: 'rgba(10,60,0,0.85)',
    btn: ['#C9FF9A', '#5DBB22', '#56B21E'],
  },
  silver: {
    title: ['#6F7A90', '#D9DFEA'],
    frame: ['#7C879C', '#C9D0DD'],
    edge: '#3F4757',
    text: '#FFFFFF',
    textShadow: 'rgba(20,30,50,0.85)',
    btn: ['#F4F7FC', '#A9B3C4', '#A4AEC0'],
  },
  red: {
    title: ['#9E0B05', '#FF5A47'],
    frame: ['#9E0B05', '#E8432F'],
    edge: '#5A0402',
    text: '#FFFFFF',
    textShadow: 'rgba(70,0,0,0.85)',
    btn: ['#FFB0A4', '#D93A26', '#D23322'],
  },
  night: {
    title: ['#1A1466', '#6B4BFF'],
    frame: ['#1A1466', '#5A3FE0'],
    edge: '#0A0730',
    text: '#FFFFFF',
    textShadow: 'rgba(0,0,40,0.9)',
    btn: ['#B9A8FF', '#5B3FE6', '#5539DE'],
  },
};

export const UIC = {
  body: C.windowBeige,
  bevelLight: '#FFFFFF',
  bevelShadow: '#ACA899',
  bevelDark: '#716F64',
  text: '#101010',
  textDisabled: '#A8A492',
  btnBorder: '#1C3F7E',
  btnBorderDisabled: '#C3C1B4',
  focus: '#6C9BF6',
  hot: '#F7B03A',
  link: '#0033CC',
  white: '#FFFFFF',
} as const;

export const UIF = {
  ui: FONTS.ui,
  web: FONTS.web,
  verdana: FONTS.verdana,
  heavy: FONTS.heavy,
  impact: FONTS.impact,
  comic: FONTS.comic,
  mono: FONTS.mono,
  serif: FONTS.serif,
  papyrus: FONTS.papyrus,
} as const;

export type AquaColor = 'aqua' | 'lime' | 'bubblegum' | 'tangerine' | 'grape' | 'graphite' | 'red' | 'gold';
/** [dark top, mid, light bottom glow, border, outer glow] */
export const AQUA_COLORS: Record<AquaColor, [string, string, string, string, string]> = {
  aqua: ['#0A5FC4', '#16A2F2', '#9BEFFF', '#043F8C', C.aqua],
  lime: ['#2C8C08', '#69D11C', '#DCFFA8', '#1A5A03', C.lime],
  bubblegum: ['#B80C74', '#FF4FB8', '#FFC9EC', '#7A0650', C.bubblegum],
  tangerine: ['#C24E00', '#FF8A1E', '#FFDDA6', '#7E3200', C.tangerine],
  grape: ['#4E1CC0', '#8A4DFF', '#DCCBFF', '#33118A', C.grape],
  graphite: ['#3E4552', '#7F899C', '#E6EBF3', '#272C35', '#BFD0EA'],
  red: ['#9C0C05', '#E2231A', '#FFA394', '#610502', '#FF5A47'],
  gold: ['#A85A00', '#F2A900', '#FFF0A0', '#6A3800', '#FFD54A'],
};
