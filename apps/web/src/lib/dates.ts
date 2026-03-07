/**
 * Date utilities for converting between display formats and stored Unix ms timestamps.
 *
 * Convention:
 *   - DB / API layer uses `number` (Unix ms, e.g. Date.now())
 *   - UI local state uses `Date` objects (for calendar pickers)
 *   - Display text uses `date-fns/format` called at render time
 *
 * Helper summary:
 *   toTimestamp(value)   → number   — normalizes any input to Unix ms
 *   fromTimestamp(ts)    → Date     — Unix ms → Date object
 *   dateToTs(d)          → number   — Date → Unix ms (midnight UTC of that local date)
 *   tsToDate(ts)         → Date     — Unix ms → Date
 *   isoToTs(iso)         → number   — "YYYY-MM-DD" → Unix ms
 *   tsToIso(ts)          → string   — Unix ms → "YYYY-MM-DD"
 */

import { parseISO, format } from 'date-fns';

/** Convert a Date object to Unix ms (start of the day, local midnight). */
export function dateToTs(d: Date): number {
    return d.getTime();
}

/** Convert Unix ms to a Date object. */
export function tsToDate(ts: number): Date {
    return new Date(ts);
}

/** Convert an ISO date string ("YYYY-MM-DD") to Unix ms. */
export function isoToTs(iso: string): number {
    return parseISO(iso).getTime();
}

/** Convert Unix ms to an ISO date string ("YYYY-MM-DD"). */
export function tsToIso(ts: number): string {
    return format(new Date(ts), 'yyyy-MM-dd');
}

/** Convert Unix ms to a display string (e.g. "Mar 4, 2026"). */
export function tsToDisplay(ts: number, fmt = 'MMM d, yyyy'): string {
    return format(new Date(ts), fmt);
}

/**
 * Accepts either a Date or a number (Unix ms) and returns Unix ms.
 * Useful at mutation boundaries where the caller may pass either.
 */
export function toTimestamp(value: Date | number): number {
    return value instanceof Date ? value.getTime() : value;
}
