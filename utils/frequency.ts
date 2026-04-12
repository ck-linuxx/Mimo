import { FrequencyEnum } from 'types';

/**
 * Avança uma data pelo número de períodos definido pela frequência.
 * Não muta a data original — retorna sempre uma nova instância.
 */
export function addByFrequency(date: Date, frequency: FrequencyEnum, count: number): Date {
  const d = new Date(date);
  switch (frequency) {
    case FrequencyEnum.Daily:
      d.setDate(d.getDate() + count);
      break;
    case FrequencyEnum.Weekly:
      d.setDate(d.getDate() + count * 7);
      break;
    case FrequencyEnum.Monthly:
      d.setMonth(d.getMonth() + count);
      break;
    case FrequencyEnum.Yearly:
      d.setFullYear(d.getFullYear() + count);
      break;
  }
  return d;
}
