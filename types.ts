
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'periodic';

export interface Task {
  id: string;
  title: string;
  category: string;
  frequency: Frequency;
  intervalDays?: number;
  specificDay?: number;
  lastCompletedAt?: string;
  nextDueDate: string;
  completedToday: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  price?: number;
  completed: boolean;
  category: string;
}

export interface LaundryState {
  isActive: boolean;
  startTime?: string;
  reminderSent: boolean;
  durationMinutes: number;
}

export interface DayPlanning {
  sport: {
    carmen: string;
    alberto: string;
  };
  meals: {
    lunch: string;
    dinner: string;
  };
}

export interface UrgentNote {
  id: string;
  text: string;
  createdAt: string;
  isResolved: boolean;
}

export interface AppData {
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  urgentNotes: UrgentNote[];
  userName: string;
  laundry: LaundryState;
  weeklyPlanning: Record<number, DayPlanning>; // 0-6 represent Mon-Sun
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  TASKS = 'tasks',
  URGENT = 'urgent',
  SHOPPING = 'shopping',
  SETTINGS = 'settings'
}
