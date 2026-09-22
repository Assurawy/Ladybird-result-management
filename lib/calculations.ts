// ============================================================================
// Ported 1:1 from the original source/04-engine.js so result totals, grades
// and positions come out identical to the live Firestore app. Do not "fix"
// or simplify this without checking it against the original first — subtle
// rounding/tie-break differences here are exactly what section 17 of the
// migration brief warns about.
// ============================================================================
import type { AssessmentComponent, GradingBand } from "@prisma/client";

export type ScoreComponents = Record<string, number | null | undefined>;

export type SubjectTotal = {
  total: number;
  isComplete: boolean;
  missingComponents: string[];
  hasAbsent: boolean;
  hasExcused: boolean;
  anyEntered: boolean;
};

export function computeSubjectTotal(
  components: ScoreComponents,
  attendanceState: "ABSENT" | "EXCUSED" | null | undefined,
  schemeComponents: AssessmentComponent[]
): SubjectTotal {
  if (attendanceState === "ABSENT") {
    return { total: 0, isComplete: true, missingComponents: [], hasAbsent: true, hasExcused: false, anyEntered: false };
  }
  if (attendanceState === "EXCUSED") {
    return { total: 0, isComplete: true, missingComponents: [], hasAbsent: false, hasExcused: true, anyEntered: false };
  }

  let total = 0;
  const missing: string[] = [];
  let anyEntered = false;

  for (const c of schemeComponents.filter((c) => c.active).sort((a, b) => a.order - b.order)) {
    const v = components?.[c.id];
    if (v === undefined || v === null) {
      missing.push(c.name);
      continue;
    }
    const num = Number(v);
    if (Number.isNaN(num)) {
      missing.push(c.name);
      continue;
    }
    anyEntered = true;
    total += (num / c.maxScore) * c.weight;
  }

  total = Math.round(total * 100) / 100;

  return {
    total,
    isComplete: missing.length === 0,
    missingComponents: missing,
    hasAbsent: false,
    hasExcused: false,
    anyEntered,
  };
}

export function gradeFor(total: number, bands: GradingBand[]): { grade: string; remark: string; point: number | null } {
  for (const b of bands) {
    if (total >= b.min && total <= b.max) return { grade: b.grade, remark: b.remark, point: b.point };
  }
  return { grade: "-", remark: "", point: null };
}

export type TieMethod = "competition" | "dense" | "ordinal";

// Ported 1:1 from assignPositions() in source/04-engine.js. Mutates nothing —
// returns a Map from the row's index (in the array you passed) to its
// position, or null if it was excluded from ranking (valueFn returned
// null/undefined for it, e.g. an incomplete result).
export function assignPositions<T>(rows: T[], valueFn: (row: T) => number | null | undefined, tieMethod: TieMethod = "competition"): (number | null)[] {
  const ranked = rows
    .map((r, idx) => ({ r, v: valueFn(r), idx }))
    .filter((x): x is { r: T; v: number; idx: number } => x.v !== null && x.v !== undefined)
    .sort((a, b) => b.v - a.v);

  const positions: (number | null)[] = rows.map(() => null);
  let lastValue: number | null = null;
  let lastPosition = 0;

  ranked.forEach((entry, i) => {
    let position: number;
    if (tieMethod === "ordinal") {
      position = i + 1;
    } else if (tieMethod === "dense") {
      if (entry.v !== lastValue) lastPosition += 1;
      position = lastPosition;
    } else {
      // competition (1,2,2,4)
      if (entry.v !== lastValue) lastPosition = i + 1;
      position = lastPosition;
    }
    lastValue = entry.v;
    positions[entry.idx] = position;
  });

  return positions;
}
