
import { format, addDays, isBefore, isToday, parseISO, startOfDay, getDay } from 'date-fns';

export const calculateNextDueDate = (
  frequency: string, 
  lastCompleted: string | undefined, 
  intervalDays?: number,
  specificDay?: number
): string => {
  const baseDate = lastCompleted ? parseISO(lastCompleted) : new Date();
  let nextDate = startOfDay(new Date());

  switch (frequency) {
    case 'daily':
      nextDate = addDays(baseDate, 1);
      break;
    case 'periodic':
      if (intervalDays) {
        nextDate = addDays(baseDate, intervalDays);
      }
      break;
    case 'weekly':
      // Simplified: if specificDay provided, find next occurrence
      if (specificDay !== undefined) {
        let current = addDays(new Date(), 1);
        while (getDay(current) !== specificDay) {
          current = addDays(current, 1);
        }
        nextDate = current;
      } else {
        nextDate = addDays(baseDate, 7);
      }
      break;
    case 'monthly':
      nextDate = addDays(baseDate, 30);
      break;
  }

  // Ensure next due date isn't in the past if it's a new cycle
  if (isBefore(nextDate, startOfDay(new Date()))) {
    return startOfDay(new Date()).toISOString();
  }

  return startOfDay(nextDate).toISOString();
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayIndex];
};
