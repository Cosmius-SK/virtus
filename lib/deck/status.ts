/**
 * The status vocabulary, and the colours it is drawn in.
 *
 * Its own file because the editing screen needs the names and must not pull the
 * renderer's palette into the browser bundle with them — and because these
 * colours are the one part of a document that a house style must NOT change.
 * Green reads as fine, amber as watch it, red as it is not fine. That is the
 * only convention nobody has to be taught, and a firm whose brand colour is red
 * does not get to make "Delayed" look calm.
 */
export const STATUS = {
  'Not Started': '6D6D6D',
  'On Track': '0F7F40',
  'In Progress': '008555',
  'At Risk': 'FBC150',
  Delayed: 'EE2724',
  Completed: '00497F',
  Closed: '1A1A1A',
} as const;

export type StatusName = keyof typeof STATUS;
export const STATUS_NAMES = Object.keys(STATUS) as StatusName[];
