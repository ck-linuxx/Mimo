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
 * Monthly savings needed from today to reach a goal.
 * Used in the home card where "from now" is more relevant than "from start date".
 */
export function calcMonthlyNeeded(goal: FinancialGoal): {
  monthlyNeeded: number;
  isAchieved: boolean;
} {
  const isAchieved = goal.targetAmount === 0 || goal.currentAmount >= goal.targetAmount;
  if (isAchieved) return { monthlyNeeded: 0, isAchieved: true };

  let remainingMonths = 1;
  try {
    remainingMonths = calcMonthsRange(new Date(), new Date(goal.finishAt!));
  } catch {
    remainingMonths = 1;
  }

  const monthlyNeeded = Math.max(0, goal.targetAmount - goal.currentAmount) / remainingMonths;
  return { monthlyNeeded, isAchieved: false };
}
