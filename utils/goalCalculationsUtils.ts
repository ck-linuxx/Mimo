import type { FinancialGoal } from 'types/financialGoal';

/** Returns the number of full calendar months between two dates (min 1). */
export function calcMonthsRange(start: Date, finish: Date): number {
  return Math.max(
    1,
    (finish.getFullYear() - start.getFullYear()) * 12 +
      (finish.getMonth() - start.getMonth()),
  );
}

/**
 * Monthly savings needed to reach a goal over the period from `start` to `finish`.
 * Used in forms (goalCreate / goalEdit / goalDetail) where the period is user-defined.
 * Returns null when the goal is already achieved, the target is invalid, or the
 * finish date precedes the start date.
 */
export function calcMonthlyInstallment(
  target: number,
  current: number,
  start: Date,
  finish: Date,
): number | null {
  if (target <= 0 || finish <= start || current >= target) return null;
  return (target - current) / calcMonthsRange(start, finish);
}

/**
 * Monthly savings needed to reach a goal over its defined period (`startAt` -> `finishAt`).
 * Falls back to `new Date()` as the start date only when `startAt` is not set.
 */
export function calcMonthlyNeeded(goal: FinancialGoal): {
  monthlyNeeded: number;
  isAchieved: boolean;
} {
  const isAchieved = goal.targetAmount === 0 || goal.currentAmount >= goal.targetAmount;
  if (isAchieved) return { monthlyNeeded: 0, isAchieved: true };

  let remainingMonths = 1;
  try {
    const startDate = goal.startAt ? new Date(goal.startAt) : new Date();
    remainingMonths = calcMonthsRange(startDate, new Date(goal.finishAt!));
  } catch {
    remainingMonths = 1;
  }

  const monthlyNeeded = Math.max(0, goal.targetAmount - goal.currentAmount) / remainingMonths;
  return { monthlyNeeded, isAchieved: false };
}
