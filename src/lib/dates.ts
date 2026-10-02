/** All app dates are integer day offsets from local midnight today (negative = past). */
export const DAY = 864e5;

export const TODAY0 = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

export const dayDate = (off: number) => new Date(TODAY0 + off * DAY);

/** Calendar months, clamped to the month's last day (31 Jan + 1 month = 28/29 Feb). Never months × 30. */
export function addMonths(off: number, m: number) {
  const d = dayDate(off);
  const day = d.getDate();
  d.setMonth(d.getMonth() + m);
  if (d.getDate() < day) d.setDate(0);
  return Math.round((d.getTime() - TODAY0) / DAY);
}

/** Day offset of a Date (time of day ignored). */
export function dateToOff(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - TODAY0) / DAY);
}
