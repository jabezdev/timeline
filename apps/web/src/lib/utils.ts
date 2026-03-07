import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SubProject } from "@/types/timeline";
import { parseISO, isAfter } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function packSubProjects(subProjects: SubProject[]): SubProject[][] {
  if (!subProjects || subProjects.length === 0) return [];

  // Sort by start date
  const sorted = [...subProjects].sort((a, b) =>
    parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
  );

  const lanes: SubProject[][] = [];

  for (const sub of sorted) {
    let placed = false;

    // Try to fit in existing lanes
    for (const lane of lanes) {
      const lastInLane = lane[lane.length - 1];
      // Check if this subproject starts after the last one ends
      if (isAfter(parseISO(sub.startDate), parseISO(lastInLane.endDate))) {
        lane.push(sub);
        placed = true;
        break;
      }
    }

    if (!placed) {
      lanes.push([sub]);
    }
  }

  return lanes;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers / environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

