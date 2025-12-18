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
