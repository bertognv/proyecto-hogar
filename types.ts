
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'periodic';

export interface FamilyActivity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

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
  isRepetitive?: boolean;
  lastModifiedBy?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  price?: number;
  completed: boolean;
  category: string;
  lastModifiedBy?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  image?: string; // base64 string
  comments?: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface LaundryState {
  isActive: boolean;
  startTime?: string;
  reminderSent: boolean;
  durationMinutes: number;
  startedBy?: string;
}

export interface DayPlanning {
  sport: {
    carmen: string;
    alberto: string;
  };
  meals: {
    lunch: string;
    dinner: string;
    carmenLunch?: string;
    albertoLunch?: string;
    carmenDinner?: string;
    albertoDinner?: string;
  };
}

export interface UrgentNote {
  id: string;
  text: string;
  createdAt: string;
  isResolved: boolean;
  author?: string;
}

export interface AppData {
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  inventoryItems: InventoryItem[];
  urgentNotes: UrgentNote[];
  userName: string;
  laundry: LaundryState;
  weeklyPlanning: Record<number, DayPlanning>;
  shifts: string[];
  familyCode: string;
  isSynced: boolean;
  familyActivity: FamilyActivity[];
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  WEEKLY = 'weekly',
  TASKS = 'tasks',
  INVENTORY = 'inventory',
  SHOPPING = 'shopping',
  ACTIVITY = 'activity'
}
