
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  ShoppingCart, 
  Calendar as CalendarIcon, 
  Home, 
  Settings, 
  Clock, 
  Trash2, 
  ChevronRight,
  Sparkles,
  Waves,
  Sun,
  Euro,
  Dumbbell,
  Utensils,
  AlertCircle,
  X,
  LayoutGrid,
  ChevronLeft,
  Wand2,
  Loader2,
  Stethoscope,
  CalendarDays,
  Edit2,
  Repeat,
  Zap,
  Cat,
  Wrench,
  ShoppingBag,
  User,
  Coffee,
  Filter,
  Users,
  Share2,
  CloudSync,
  RefreshCw,
  Copy,
  Check,
  CalendarRange,
  Wind,
  Moon,
  ChefHat,
  ShoppingBasket,
  Apple,
  History,
  Activity,
  ArrowRightLeft,
  Download,
  Package,
  Camera,
  MessageSquare,
  Minus,
  Info,
  Timer
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Task, ShoppingItem, AppTab, Frequency, DayPlanning, UrgentNote, FamilyActivity, InventoryItem } from './types';
import { calculateNextDueDate } from './utils/dateUtils';
import { 
  parseISO, 
  isBefore, 
  format, 
  addDays, 
  addMinutes, 
  startOfWeek, 
  isSameDay, 
  eachDayOfInterval, 
  endOfMonth, 
  startOfMonth, 
  addMonths, 
  subMonths, 
  formatDistanceToNow,
  isToday,
  differenceInMinutes
} from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'General', label: 'General', icon: <LayoutGrid size={18} />, color: 'bg-slate-100 text-slate-600' },
  { id: 'Limpieza', label: 'Limpieza', icon: <Sparkles size={18} />, color: 'bg-blue-100 text-blue-600' },
  { id: 'Mascotas', label: 'Mascotas', icon: <Cat size={18} />, color: 'bg-orange-100 text-orange-600' },
  { id: 'Mantenimiento', label: 'Mantenimiento', icon: <Wrench size={18} />, color: 'bg-amber-100 text-amber-600' },
  { id: 'Compras', label: 'Compras', icon: <ShoppingBag size={18} />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'Cocina', label: 'Cocina', icon: <Coffee size={18} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'Personal', label: 'Personal', icon: <User size={18} />, color: 'bg-indigo-100 text-indigo-600' },
];

const INITIAL_PLANNING: Record<number, DayPlanning> = {
  0: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  1: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  2: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  3: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  4: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  5: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
  6: { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } },
};

const DEFAULT_TASKS: Task[] = [
  { id: 't-1', title: 'Cambiar sábanas', category: 'Limpieza', frequency: 'weekly', nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false, lastModifiedBy: 'Sistema' },
  { id: 't-2', title: 'Limpiar arenero gatas', category: 'Mascotas', frequency: 'daily', nextDueDate: calculateNextDueDate('daily', undefined), completedToday: false, lastModifiedBy: 'Sistema' },
  { id: 't-3', title: 'Cambiar albornoces', category: 'Limpieza', frequency: 'weekly', nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false, lastModifiedBy: 'Sistema' },
  { id: 't-4', title: 'Repasar baños', category: 'Limpieza', frequency: 'weekly', nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false, lastModifiedBy: 'Sistema' },
  { id: 't-5', title: 'Mantenimiento plantas', category: 'Mantenimiento', frequency: 'weekly', nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false, lastModifiedBy: 'Sistema' },
];

const INITIAL_DATA: AppData = {
  userName: "Alberto",
  familyCode: "GNM-PRO",
  isSynced: true,
  familyActivity: [],
  laundry: { isActive: false, reminderSent: false, durationMinutes: 90 },
  weeklyPlanning: INITIAL_PLANNING,
  urgentNotes: [],
  shifts: [],
  tasks: DEFAULT_TASKS,
  shoppingItems: [],
  inventoryItems: [
    { id: 'inv-1', name: 'Huevos', quantity: 12, unit: 'unidades', category: 'Cocina', lastUpdatedBy: 'Sistema', lastUpdatedAt: new Date().toISOString() },
    { id: 'inv-2', name: 'Leche', quantity: 6, unit: 'litros', category: 'Cocina', lastUpdatedBy: 'Sistema', lastUpdatedAt: new Date().toISOString() }
  ]
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('gnm_hogar_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.inventoryItems) parsed.inventoryItems = INITIAL_DATA.inventoryItems;
        if (!parsed.tasks || parsed.tasks.length === 0) parsed.tasks = DEFAULT_TASKS;
        if (!parsed.weeklyPlanning) parsed.weeklyPlanning = INITIAL_PLANNING;
        if (!parsed.laundry) parsed.laundry = INITIAL_DATA.laundry;
        return { ...INITIAL_DATA, ...parsed };
      } catch (e) {
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditPlanning, setShowEditPlanning] = useState(false);
  const [showShiftCalendar, setShowShiftCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState(1);
  const [newInvUnit, setNewInvUnit] = useState('unidades');
  const [newInvCategory, setNewInvCategory] = useState('Cocina');
  const [newInvComment, setNewInvComment] = useState('');
  const [newInvImage, setNewInvImage] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>('daily');
  const [newTaskCategory, setNewTaskCategory] = useState('General');

  // Filtro de tareas
  const [taskFilter, setTaskFilter] = useState<string>('all');

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });

  const laundryTimeRemaining = useMemo(() => {
    if (!data.laundry.isActive || !data.laundry.startTime) return 0;
    const start = parseISO(data.laundry.startTime);
    const elapsed = differenceInMinutes(new Date(), start);
    return Math.max(0, data.laundry.durationMinutes - elapsed);
  }, [data.laundry]);

  useEffect(() => {
    localStorage.setItem('gnm_hogar_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 1200);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const logActivity = (action: string) => {
    const newActivity: FamilyActivity = {
      id: Math.random().toString(36).substring(2, 9),
      user: data.userName,
      action: action,
      timestamp: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      familyActivity: [newActivity, ...prev.familyActivity].slice(0, 40)
    }));
  };

  const updatePlanning = (dayIdx: number, updates: { sport?: Partial<DayPlanning['sport']>, meals?: Partial<DayPlanning['meals']> }) => {
    setData(prev => {
      const currentDay = prev.weeklyPlanning[dayIdx] || { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } };
      const newDay: DayPlanning = {
        ...currentDay,
        sport: { ...currentDay.sport, ...(updates.sport || {}) },
        meals: { ...currentDay.meals, ...(updates.meals || {}) }
      };
      return {
        ...prev,
        weeklyPlanning: { ...prev.weeklyPlanning, [dayIdx]: newDay }
      };
    });
  };

  const handleToggleShift = (dateISO: string) => {
    const isNowShift = !data.shifts.includes(dateISO);
    let newShifts = isNowShift ? [...data.shifts, dateISO] : data.shifts.filter(s => s !== dateISO);
    const dateObj = parseISO(dateISO);
    const dayIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    const isSameWeek = isSameDay(startOfWeek(dateObj, { weekStartsOn: 1 }), startOfThisWeek);
    
    setData(prev => ({ ...prev, shifts: newShifts }));
    if (isSameWeek) {
      updatePlanning(dayIdx, { sport: { carmen: isNowShift ? '🏥 Guardia' : '' } });
    }
    logActivity(`${isNowShift ? 'ha añadido' : 'ha quitado'} una guardia para el ${format(dateObj, 'd/MM')}`);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      category: newTaskCategory,
      frequency: newTaskFreq,
      nextDueDate: calculateNextDueDate(newTaskFreq, undefined),
      completedToday: false,
      lastModifiedBy: data.userName
    };
    setData(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    logActivity(`ha creado la tarea: ${newTaskTitle}`);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const startLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: {
        isActive: true,
        startTime: new Date().toISOString(),
        reminderSent: false,
        durationMinutes: 90,
        startedBy: prev.userName
      }
    }));
    logActivity('ha puesto una lavadora 🧺');
  };

  const stopLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: { ...prev.laundry, isActive: false, startTime: undefined }
    }));
    logActivity('ha terminado/quitado la lavadora');
  };

  const handleAddInventory = () => {
    if (!newInvName.trim()) return;
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: newInvName,
      quantity: newInvQty,
      unit: newInvUnit,
      category: newInvCategory,
      comments: newInvComment,
      image: newInvImage,
      lastUpdatedBy: data.userName,
      lastUpdatedAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, inventoryItems: [newItem, ...prev.inventoryItems] }));
    logActivity(`ha añadido ${newInvName} al almacén (${newInvQty} ${newInvUnit})`);
    resetInvForm();
    setShowAddInventory(false);
  };

  const updateInvQty = (id: string, delta: number) => {
    setData(prev => {
      const itemToUpdate = prev.inventoryItems.find(i => i.id === id);
      if (!itemToUpdate) return prev;
      
      const newQty = Math.max(0, itemToUpdate.quantity + delta);
      return {
        ...prev,
        inventoryItems: prev.inventoryItems.map(item => 
          item.id === id ? { ...item, quantity: newQty, lastUpdatedBy: prev.userName, lastUpdatedAt: new Date().toISOString() } : item
        )
      };
    });
    const item = data.inventoryItems.find(i => i.id === id);
    if (item) logActivity(`ha actualizado el stock de ${item.name}`);
  };

  const deleteInventoryItem = (id: string) => {
    const item = data.inventoryItems.find(i => i.id === id);
    setData(prev => ({ ...prev, inventoryItems: prev.inventoryItems.filter(i => i.id !== id) }));
    if (item) logActivity(`ha eliminado ${item.name} del almacén`);
    setSelectedInventoryItem(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewInvImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetInvForm = () => {
    setNewInvName('');
    setNewInvQty(1);
    setNewInvUnit('unidades');
    setNewInvCategory('Cocina');
    setNewInvComment('');
    setNewInvImage(undefined);
  };

  const toggleUser = () => {
    const newUser = data.userName === 'Alberto' ? 'Carmen' : 'Alberto';
    setData(prev => ({ ...prev, userName: newUser }));
  };

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return data.tasks;
    return data.tasks.filter(t => t.category === taskFilter);
  }, [data.tasks, taskFilter]);

  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const currentSelectedPlanning = data.weeklyPlanning[selectedDayIndex] || { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } };
  const currentSelectedIsShift = data.shifts.includes(format(addDays(startOfThisWeek, selectedDayIndex), 'yyyy-MM-dd'));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-32">
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-[2.5rem] sticky top-0 z-40 border-b border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-indigo-400 animate-ping' : 'bg-emerald-500'}`}></div>
                <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.1em]">
                   {isSyncing ? 'Sincronizando...' : 'Conectado • ' + data.userName}
                </p>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Hogar GNM</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleUser} className="flex flex-col items-center p-2 bg-slate-50 text-indigo-600 rounded-2xl active:scale-95 transition-transform border border-slate-100 shadow-sm">
               <ArrowRightLeft size={16} />
               <span className="text-[7px] font-black uppercase mt-0.5">Perfil</span>
            </button>
            <button onClick={() => setShowShiftCalendar(true)} className="p-3 bg-orange-50 text-orange-600 rounded-2xl active:scale-95 transition-transform border border-orange-100 shadow-sm">
              <Stethoscope size={24} />
            </button>
          </div>
        </div>

        {activeTab === AppTab.DASHBOARD && (
          <div className="flex justify-between mt-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {weekDaysShort.map((day, idx) => {
              const isActive = selectedDayIndex === idx;
              const dayDate = addDays(startOfThisWeek, idx);
              const dayHasShift = data.shifts.includes(format(dayDate, 'yyyy-MM-dd'));
              return (
                <button key={idx} onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all active:scale-90 relative ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold mb-1">{day}</span>
                  <span className="text-sm font-black">{format(dayDate, 'd')}</span>
                  {dayHasShift && (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${isActive ? 'bg-white border-white' : 'bg-orange-400 border-slate-50'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {activeTab === AppTab.DASHBOARD && (
          <>
            <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative animate-in fade-in slide-in-from-top-4 duration-500">
              <Zap size={100} className="absolute -right-10 -top-10 text-white/10 rotate-12" />
              <div className="relative z-10 space-y-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Estado {fullWeekDays[selectedDayIndex]}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Utensils size={14} className="text-emerald-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Menú</span></div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black truncate"><Sun size={10} className="inline mr-1" /> {currentSelectedIsShift ? (currentSelectedPlanning.meals?.albertoLunch || 'TBD') : (currentSelectedPlanning.meals?.lunch || 'TBD')}</p>
                        <p className="text-[10px] font-black truncate"><Moon size={10} className="inline mr-1" /> {currentSelectedIsShift ? (currentSelectedPlanning.meals?.albertoDinner || 'TBD') : (currentSelectedPlanning.meals?.dinner || 'TBD')}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Dumbbell size={14} className="text-orange-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Deporte</span></div>
                    <p className="text-[10px] font-black truncate">C: {currentSelectedIsShift ? 'Guardia' : (currentSelectedPlanning.sport?.carmen || 'Libre')}</p>
                    <p className="text-[10px] font-black truncate">A: {currentSelectedPlanning.sport?.alberto || 'Libre'}</p>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-600" /> Planning Semanal</h2>
                <button onClick={() => setShowEditPlanning(true)} className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Planificar</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setShowEditPlanning(true)} className="bg-orange-50/50 border border-orange-100 p-4 rounded-3xl active:bg-orange-100 cursor-pointer transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-orange-600 mb-3"><Dumbbell size={18} /><span className="text-xs font-bold uppercase">Deporte</span></div>
                  <p className="text-[9px] text-orange-400 font-bold uppercase truncate">C: <span className="text-slate-700">{currentSelectedIsShift ? '🏥 Guardia' : (currentSelectedPlanning.sport?.carmen || '-')}</span></p>
                  <p className="text-[9px] text-orange-400 font-bold uppercase truncate">A: <span className="text-slate-700">{currentSelectedPlanning.sport?.alberto || '-'}</span></p>
                </div>
                <div onClick={() => setShowEditPlanning(true)} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl active:bg-emerald-100 cursor-pointer transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3"><Utensils size={18} /><span className="text-xs font-bold uppercase">Menú</span></div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-emerald-400 font-bold uppercase truncate flex items-center gap-1"><Sun size={10} /> {currentSelectedIsShift ? (currentSelectedPlanning.meals?.albertoLunch || '-') : (currentSelectedPlanning.meals?.lunch || '-')}</p>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase truncate flex items-center gap-1"><Moon size={10} /> {currentSelectedIsShift ? (currentSelectedPlanning.meals?.albertoDinner || '-') : (currentSelectedPlanning.meals?.dinner || '-')}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === AppTab.WEEKLY && (
          <div className="space-y-6 px-2 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Semana Completa <CalendarRange className="text-indigo-600" /></h2>
            <div className="space-y-4">
              {fullWeekDays.map((day, idx) => {
                const dayISO = format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd');
                const isShift = data.shifts.includes(dayISO);
                const plan = data.weeklyPlanning[idx] || { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } };
                return (
                  <div key={idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm ${isShift ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                      {weekDaysShort[idx]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase text-slate-400">{day}</span>
                        {isShift && <span className="text-[8px] font-black uppercase text-orange-500 flex items-center gap-1"><Stethoscope size={8} /> Guardia</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-4">
                           <p className="text-[11px] font-bold text-slate-600 truncate"><Sun size={10} className="inline mr-1 text-emerald-500" /> {plan.meals?.lunch || '-'}</p>
                           <p className="text-[11px] font-bold text-slate-600 truncate"><Moon size={10} className="inline mr-1 text-indigo-500" /> {plan.meals?.dinner || '-'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           { (plan.sport?.carmen || isShift) && (
                             <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                               <Dumbbell size={9} /> C: {isShift ? 'Guardia' : plan.sport?.carmen}
                             </span>
                           )}
                           { plan.sport?.alberto && (
                             <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                               <Dumbbell size={9} /> A: {plan.sport?.alberto}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === AppTab.TASKS && (
          <div className="space-y-6 px-2 animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Tareas <CheckCircle2 className="text-indigo-600" /></h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hogar y mantenimiento</p>
              </div>
              <button onClick={() => setShowAddTask(true)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Plus size={20} />
              </button>
            </div>

            {/* FILTRO DE CATEGORÍAS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
               <button 
                  onClick={() => setTaskFilter('all')} 
                  className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${taskFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
               >
                  Todas
               </button>
               {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setTaskFilter(cat.id)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${taskFilter === cat.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
               ))}
            </div>

            {/* LAVADORA SECTION (Solo se muestra en 'all' o en categorías lógicas como Limpieza) */}
            {(taskFilter === 'all' || taskFilter === 'Limpieza') && (
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 text-slate-50 group-hover:text-indigo-50 transition-colors">
                    <Waves size={100} />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${data.laundry.isActive ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                          <Timer size={28} />
                      </div>
                      <div>
                          <h3 className="font-black text-slate-800">Lavadora</h3>
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            {data.laundry.isActive ? `En curso • Quedan ${laundryTimeRemaining} min` : 'Sin actividad'}
                          </p>
                      </div>
                    </div>
                    {data.laundry.isActive ? (
                      <button onClick={stopLaundry} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95">Terminar</button>
                    ) : (
                      <button onClick={startLaundry} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95">Poner</button>
                    )}
                </div>
              </div>
            )}

            <div className="space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-1">
                  {taskFilter === 'all' ? 'Lista de Pendientes' : `Tareas de ${taskFilter}`}
               </h3>
              {filteredTasks.length > 0 ? filteredTasks.map(task => {
                const category = CATEGORIES.find(c => c.id === task.category);
                return (
                  <div key={task.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:shadow-md">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${category?.color || 'bg-slate-100 text-slate-400'}`}>
                      {category?.icon || <LayoutGrid size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black uppercase text-indigo-400/80">{task.frequency === 'periodic' ? `Cada ${task.intervalDays} días` : (task.frequency === 'daily' ? 'Diario' : 'Semanal')}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{task.category}</span>
                      </div>
                    </div>
                    <button onClick={() => { setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)})); logActivity(`ha eliminado la tarea: ${task.title}`); }} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              }) : (
                <div className="py-20 text-center">
                   <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-100" />
                   <p className="text-sm font-bold text-slate-300">No hay tareas en esta categoría</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.INVENTORY && (
          <div className="px-2 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">Almacén <Package className="text-amber-500" /></h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de recursos y despensa</p>
              </div>
              <button onClick={() => setShowAddInventory(true)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Plus size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {data.inventoryItems.length > 0 ? data.inventoryItems.map(item => (
                <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col active:shadow-md transition-all">
                   <div onClick={() => setSelectedInventoryItem(item)} className="aspect-square bg-slate-50 relative overflow-hidden group">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Package size={48} />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-black text-slate-800 border border-slate-100 uppercase">
                         {item.category}
                      </div>
                   </div>
                   <div className="p-4 space-y-3">
                      <div onClick={() => setSelectedInventoryItem(item)}>
                        <h4 className="font-black text-slate-800 text-sm truncate">{item.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit}</p>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1">
                         <button onClick={(e) => { e.stopPropagation(); updateInvQty(item.id, -1); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-rose-500 active:scale-90"><Minus size={14} /></button>
                         <span className="text-xs font-black text-slate-700">{item.quantity}</span>
                         <button onClick={(e) => { e.stopPropagation(); updateInvQty(item.id, 1); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-emerald-500 active:scale-90"><Plus size={14} /></button>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="col-span-2 py-20 text-center text-slate-300">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold">El almacén está vacío</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.ACTIVITY && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="px-2">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Cambios Recientes <History className="text-indigo-600" /></h2>
                </div>
                <div className="space-y-3">
                    {data.familyActivity.length > 0 ? data.familyActivity.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-start">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.user === 'Carmen' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <User size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-700 leading-relaxed"><span className="font-black text-slate-900">{item.user}</span> {item.action}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true, locale: es })}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center text-slate-300">No hay actividad reciente</div>
                    )}
                </div>
            </div>
        )}

        {activeTab === AppTab.SHOPPING && (
            <div className="px-2">
                <h2 className="text-2xl font-black text-slate-800 mb-6">Lista de Compra</h2>
                <ShoppingList items={data.shoppingItems} onToggle={(id) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed} : i)}))} onAdd={(name, price) => setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: 'Alimentación'}]}))} />
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center py-5 px-4 safe-bottom shadow-lg z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<Home size={22} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.WEEKLY} onClick={() => setActiveTab(AppTab.WEEKLY)} icon={<CalendarRange size={22} />} label="Semana" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CalendarIcon size={22} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={22} />} label="Compra" />
        <NavButton active={activeTab === AppTab.INVENTORY} onClick={() => setActiveTab(AppTab.INVENTORY)} icon={<Package size={22} />} label="Almacén" />
        <NavButton active={activeTab === AppTab.ACTIVITY} onClick={() => setActiveTab(AppTab.ACTIVITY)} icon={<History size={22} />} label="Cambios" />
      </nav>

      {/* MODAL DETALLE INVENTARIO */}
      {selectedInventoryItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6" onClick={() => setSelectedInventoryItem(null)}>
          <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="aspect-video w-full bg-slate-100 relative">
              {selectedInventoryItem.image ? (
                <img src={selectedInventoryItem.image} alt={selectedInventoryItem.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package size={64} />
                </div>
              )}
              <button onClick={() => setSelectedInventoryItem(null)} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur rounded-full text-slate-800 shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{selectedInventoryItem.category}</span>
                <h3 className="text-2xl font-black text-slate-800 mt-2">{selectedInventoryItem.name}</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">{selectedInventoryItem.quantity} {selectedInventoryItem.unit} disponibles</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => deleteInventoryItem(selectedInventoryItem.id)} className="flex-1 p-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:bg-rose-100">
                  <Trash2 size={16} /> Eliminar
                </button>
                <button onClick={() => setSelectedInventoryItem(null)} className="flex-1 p-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-indigo-700">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR ALMACÉN */}
      {showAddInventory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center" onClick={() => { setShowAddInventory(false); resetInvForm(); }}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3">Nuevo en Almacén <Package className="text-amber-500" /></h3>
                <button onClick={() => { setShowAddInventory(false); resetInvForm(); }} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
             </div>
             <div className="space-y-6">
                <div className="flex gap-4">
                  <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 overflow-hidden shrink-0 cursor-pointer">
                    {newInvImage ? <img src={newInvImage} className="w-full h-full object-cover" /> : <><Camera size={24} /><span className="text-[7px] font-black uppercase">Foto</span></>}
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <input type="text" placeholder="Nombre del producto" value={newInvName} onChange={e => setNewInvName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-indigo-100" />
                    <select value={newInvCategory} onChange={e => setNewInvCategory(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none text-xs">
                       <option value="Cocina">Cocina / Comida</option>
                       <option value="Limpieza">Limpieza</option>
                       <option value="Higiene">Higiene</option>
                       <option value="Mascotas">Mascotas</option>
                       <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input type="number" placeholder="Cant." value={newInvQty} onChange={e => setNewInvQty(parseInt(e.target.value) || 0)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none" />
                   <input type="text" placeholder="Unidad" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-none text-xs" />
                </div>
                <button onClick={handleAddInventory} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">Añadir al almacén</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR TAREA */}
      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center" onClick={() => setShowAddTask(false)}>
          <div className="bg-white w-full max-md rounded-t-[3rem] p-8 pb-12 shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Nueva Tarea</h3>
                <button onClick={() => setShowAddTask(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
             </div>
             <div className="space-y-4">
                <input type="text" placeholder="¿Qué hay que hacer?" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)} className="p-3 bg-slate-50 rounded-xl font-bold text-xs">
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                  <select value={newTaskFreq} onChange={e => setNewTaskFreq(e.target.value as Frequency)} className="p-3 bg-slate-50 rounded-xl font-bold text-xs">
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="periodic">Periódica</option>
                  </select>
                </div>
                <button onClick={handleAddTask} className="w-full p-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">Crear Tarea</button>
             </div>
          </div>
        </div>
      )}

      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center" onClick={() => setShowEditPlanning(false)}>
          <div className="bg-white w-full max-md rounded-t-[3rem] p-8 pb-12 shadow-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3">Planificar Semana <Edit2 className="text-indigo-600" /></h3>
                <button onClick={() => setShowEditPlanning(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
             </div>
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Día a Editar</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {weekDaysShort.map((d, i) => (
                      <button key={i} onClick={() => setSelectedDayIndex(i)} className={`px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 transition-all ${selectedDayIndex === i ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                        {fullWeekDays[i]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4">
                  <input type="text" value={currentSelectedPlanning.meals?.lunch || ''} onChange={(e) => updatePlanning(selectedDayIndex, { meals: { lunch: e.target.value } })} placeholder="Comida" className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm" />
                  <input type="text" value={currentSelectedPlanning.meals?.dinner || ''} onChange={(e) => updatePlanning(selectedDayIndex, { meals: { dinner: e.target.value } })} placeholder="Cena" className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={currentSelectedPlanning.sport?.carmen || ''} onChange={(e) => updatePlanning(selectedDayIndex, { sport: { carmen: e.target.value } })} placeholder="Dep. Carmen" className="w-full p-3 bg-white rounded-xl border-none font-bold text-xs shadow-sm" />
                    <input type="text" value={currentSelectedPlanning.sport?.alberto || ''} onChange={(e) => updatePlanning(selectedDayIndex, { sport: { alberto: e.target.value } })} placeholder="Dep. Alberto" className="w-full p-3 bg-white rounded-xl border-none font-bold text-xs shadow-sm" />
                  </div>
                </div>
                <button onClick={() => setShowEditPlanning(false)} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">Guardar Planning</button>
             </div>
          </div>
        </div>
      )}

      {showShiftCalendar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowShiftCalendar(false)}>
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Guardias Carmen</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentCalendarMonth(prev => subMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={16} /></button>
                <span className="text-[10px] font-black uppercase text-slate-500 min-w-[80px] text-center">{format(currentCalendarMonth, 'MMMM yyyy', { locale: es })}</span>
                <button onClick={() => setCurrentCalendarMonth(prev => addMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ start: startOfMonth(currentCalendarMonth), end: endOfMonth(currentCalendarMonth) }).map(day => {
                const dayISO = format(day, 'yyyy-MM-dd');
                const isShift = data.shifts.includes(dayISO);
                return (
                  <button key={dayISO} onClick={() => handleToggleShift(dayISO)} className={`h-10 rounded-xl flex flex-col items-center justify-center transition-all ${isShift ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                    <span className="text-[11px] font-black">{format(day, 'd')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price: number) => void }> = ({ items, onToggle, onAdd }) => {
  const [n, setN] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const handleAdd = async () => {
    if (!n.trim()) return;
    setIsEstimating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Precio medio en España para: ${n.trim()}. Solo número sin símbolo de moneda.` });
      const price = parseFloat(response.text.trim().replace(/[^0-9.]/g, '')) || 0;
      onAdd(n, price);
      setN('');
    } catch (e) {
      onAdd(n, 0);
      setN('');
    } finally {
      setIsEstimating(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <input type="text" placeholder="Añadir producto..." value={n} onChange={(e) => setN(e.target.value)} className="flex-1 bg-transparent font-bold outline-none" />
        <button onClick={handleAdd} disabled={isEstimating} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md active:scale-90 flex items-center justify-center min-w-[48px]">
          {isEstimating ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <button onClick={() => onToggle(item.id)} className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>
              {item.completed ? <CheckCircle2 size={24} fill="currentColor" /> : <Circle size={24} />}
            </button>
            <div className="flex-1">
                <p className={`font-bold text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                <p className="text-[10px] font-black text-indigo-400">~{item.price?.toFixed(2)}€</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
    <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-indigo-50 shadow-sm' : ''}`}>
      {icon}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
