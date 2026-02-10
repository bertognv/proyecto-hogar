
import React, { useState, useEffect, useMemo } from 'react';
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
  Zap as Power,
  History,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Task, ShoppingItem, AppTab, Frequency, DayPlanning, UrgentNote, FamilyActivity } from './types';
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
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'General', label: 'General', icon: <LayoutGrid size={18} /> },
  { id: 'Limpieza', label: 'Limpieza', icon: <Sparkles size={18} /> },
  { id: 'Mascotas', label: 'Mascotas', icon: <Cat size={18} /> },
  { id: 'Mantenimiento', label: 'Mantenimiento', icon: <Wrench size={18} /> },
  { id: 'Compras', label: 'Compras', icon: <ShoppingBag size={18} /> },
  { id: 'Cocina', label: 'Cocina', icon: <Coffee size={18} /> },
  { id: 'Personal', label: 'Personal', icon: <User size={18} /> },
];

const SHOPPING_CATEGORIES = [
  { id: 'Alimentación', label: 'Alimentación', icon: <Apple size={16} /> },
  { id: 'Limpieza', label: 'Limpieza', icon: <Sparkles size={16} /> },
  { id: 'Higiene', label: 'Higiene', icon: <User size={16} /> },
  { id: 'Mascotas', label: 'Mascotas', icon: <Cat size={16} /> },
  { id: 'Bebidas', label: 'Bebidas', icon: <Coffee size={16} /> },
  { id: 'Hogar', label: 'Hogar', icon: <Home size={16} /> },
  { id: 'Otros', label: 'Otros', icon: <ShoppingBasket size={16} /> },
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

const INITIAL_TASKS: Task[] = [
  { 
    id: 't-1', 
    title: 'Cambiar arenero gatas', 
    category: 'Mascotas', 
    frequency: 'periodic', 
    intervalDays: 5, 
    nextDueDate: calculateNextDueDate('periodic', undefined, 5), 
    completedToday: false,
    isRepetitive: true 
  },
  { 
    id: 't-2', 
    title: 'Cambiar sábanas', 
    category: 'Limpieza', 
    frequency: 'periodic', 
    intervalDays: 10, 
    nextDueDate: calculateNextDueDate('periodic', undefined, 10), 
    completedToday: false,
    isRepetitive: true 
  },
  { 
    id: 't-3', 
    title: 'Limpieza general cocina', 
    category: 'Cocina', 
    frequency: 'weekly', 
    nextDueDate: calculateNextDueDate('weekly', undefined), 
    completedToday: false,
    isRepetitive: true 
  }
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
  tasks: INITIAL_TASKS,
  shoppingItems: []
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('gnm_hogar_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.tasks || parsed.tasks.length === 0) {
          parsed.tasks = INITIAL_TASKS;
        }
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
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>('daily');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('Todas');

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayISO = format(today, 'yyyy-MM-dd');

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

  const handleSuggestMenu = async () => {
    setIsGeneratingMenu(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const dayISO = format(addDays(startOfThisWeek, selectedDayIndex), 'yyyy-MM-dd');
      const isShift = data.shifts.includes(dayISO);
      const prompt = `Sugiere un menú rico y casero para un ${fullWeekDays[selectedDayIndex]} (Comida y Cena). Responde SOLO JSON: {"lunch": "...", "dinner": "..."}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      const result = JSON.parse(response.text.trim());
      
      if (isShift) {
        updatePlanning(selectedDayIndex, {
          meals: {
            ...data.weeklyPlanning[selectedDayIndex].meals,
            albertoLunch: result.lunch,
            carmenLunch: result.lunch + ' (Tupper)',
            albertoDinner: result.dinner,
            carmenDinner: 'Cena hospital'
          }
        });
      } else {
        updatePlanning(selectedDayIndex, {
          meals: {
            ...data.weeklyPlanning[selectedDayIndex].meals,
            lunch: result.lunch,
            dinner: result.dinner
          }
        });
      }
      logActivity(`ha usado la IA para sugerir el menú del ${fullWeekDays[selectedDayIndex]}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingMenu(false);
    }
  };

  const handleToggleShift = (dateISO: string) => {
    const isNowShift = !data.shifts.includes(dateISO);
    let newShifts = isNowShift 
      ? [...data.shifts, dateISO] 
      : data.shifts.filter(s => s !== dateISO);
    
    const dateObj = parseISO(dateISO);
    const dayIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    const isSameWeek = isSameDay(startOfWeek(dateObj, { weekStartsOn: 1 }), startOfThisWeek);
    
    setData(prev => {
        const nextData = { ...prev, shifts: newShifts };
        if (isSameWeek) {
            nextData.weeklyPlanning = {
                ...prev.weeklyPlanning,
                [dayIdx]: {
                    ...prev.weeklyPlanning[dayIdx],
                    sport: {
                        ...prev.weeklyPlanning[dayIdx].sport,
                        carmen: isNowShift ? '🏥 Guardia' : ''
                    }
                }
            };
        }
        return nextData;
    });
    
    logActivity(`${isNowShift ? 'ha añadido' : 'ha quitado'} una guardia para el ${format(dateObj, 'd/MM')}`);
  };

  const handleStartLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: { ...prev.laundry, isActive: true, startTime: new Date().toISOString(), startedBy: prev.userName }
    }));
    logActivity('ha puesto una lavadora 🧺');
  };

  const handleFinishLaundry = () => {
    setData(prev => ({...prev, laundry: {...prev.laundry, isActive: false}}));
    logActivity('ha tendido la ropa 👕');
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

  const updatePlanning = (dayIdx: number, updates: Partial<DayPlanning>) => {
    setData(prev => ({
      ...prev,
      weeklyPlanning: {
        ...prev.weeklyPlanning,
        [dayIdx]: { ...prev.weeklyPlanning[dayIdx], ...updates }
      }
    }));
  };

  const toggleUser = () => {
    const newUser = data.userName === 'Alberto' ? 'Carmen' : 'Alberto';
    setData(prev => ({ ...prev, userName: newUser }));
  };

  const isLaundryFinished = data.laundry.isActive && data.laundry.startTime && 
    isBefore(addMinutes(parseISO(data.laundry.startTime), data.laundry.durationMinutes), new Date());

  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const filteredTasks = useMemo(() => {
    return data.tasks.filter(t => taskCategoryFilter === 'Todas' || t.category === taskCategoryFilter);
  }, [data.tasks, taskCategoryFilter]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentCalendarMonth);
    const end = endOfMonth(currentCalendarMonth);
    return eachDayOfInterval({ start, end });
  }, [currentCalendarMonth]);

  const currentSelectedDayISO = format(addDays(startOfThisWeek, selectedDayIndex), 'yyyy-MM-dd');
  const currentSelectedIsShift = data.shifts.includes(currentSelectedDayISO);

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
              const isTodayDate = isToday(dayDate);
              const dayHasShift = data.shifts.includes(format(dayDate, 'yyyy-MM-dd'));
              return (
                <button key={idx} onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all active:scale-90 relative ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 
                    isTodayDate ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'
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
                <div className="flex justify-between items-center">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Estado Hoy</p>
                   {data.shifts.includes(todayISO) && (
                     <span className="bg-orange-400 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter animate-pulse shadow-md">
                       <Stethoscope size={10} /> Guardia Carmen
                     </span>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Utensils size={14} className="text-emerald-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Menú</span></div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black truncate flex items-center gap-1"><Sun size={10} className="shrink-0" /> {data.shifts.includes(todayISO) ? (data.weeklyPlanning[todayIdx]?.meals.albertoLunch || 'TBD') : (data.weeklyPlanning[todayIdx]?.meals.lunch || 'TBD')}</p>
                        <p className="text-[10px] font-black truncate flex items-center gap-1"><Moon size={10} className="shrink-0" /> {data.shifts.includes(todayISO) ? (data.weeklyPlanning[todayIdx]?.meals.albertoDinner || 'TBD') : (data.weeklyPlanning[todayIdx]?.meals.dinner || 'TBD')}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Dumbbell size={14} className="text-orange-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Deporte</span></div>
                    <p className="text-[10px] font-black truncate">C: {data.shifts.includes(todayISO) ? 'Hospital' : (data.weeklyPlanning[todayIdx]?.sport.carmen || 'Libre')}</p>
                    <p className="text-[10px] font-black truncate">A: {data.weeklyPlanning[todayIdx]?.sport.alberto || 'Libre'}</p>
                  </div>
                </div>

                {data.laundry.isActive ? (
                  <div className={`p-4 rounded-3xl border transition-all ${isLaundryFinished ? 'bg-emerald-500/40 border-emerald-400 shadow-lg scale-105' : 'bg-white/10 border-white/20'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Waves size={16} className={isLaundryFinished ? 'animate-bounce text-emerald-300' : 'animate-pulse text-indigo-200'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLaundryFinished ? '¡Ropa lista para tender!' : `Lavadora de ${data.laundry.startedBy}`}</span>
                      </div>
                      {isLaundryFinished && (
                        <button onClick={handleFinishLaundry} className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2">
                          <Wind size={12} /> Tender
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleStartLaundry} className="w-full flex items-center justify-center gap-2 p-3 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-white/20">
                    <Waves size={16} /> Iniciar Lavadora
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-600" /> Planning Hoy</h2>
                <button onClick={() => setShowEditPlanning(true)} className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Planificar</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setShowEditPlanning(true)} className="bg-orange-50/50 border border-orange-100 p-4 rounded-3xl active:bg-orange-100 cursor-pointer transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-orange-600 mb-3"><Dumbbell size={18} /><span className="text-xs font-bold uppercase">Deporte</span></div>
                  <p className="text-[9px] text-orange-400 font-bold uppercase">C: <span className="text-slate-700">{data.shifts.includes(todayISO) ? '🏥 Guardia' : (data.weeklyPlanning[todayIdx]?.sport.carmen || '-')}</span></p>
                  <p className="text-[9px] text-orange-400 font-bold uppercase">A: <span className="text-slate-700">{data.weeklyPlanning[todayIdx]?.sport.alberto || '-'}</span></p>
                </div>
                <div onClick={() => setShowEditPlanning(true)} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl active:bg-emerald-100 cursor-pointer transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3"><Utensils size={18} /><span className="text-xs font-bold uppercase">Menú Hoy</span></div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-emerald-400 font-bold uppercase truncate flex items-center gap-1"><Sun size={10} /> {data.shifts.includes(todayISO) ? (data.weeklyPlanning[todayIdx]?.meals.albertoLunch || '-') : (data.weeklyPlanning[todayIdx]?.meals.lunch || '-')}</p>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase truncate flex items-center gap-1"><Moon size={10} /> {data.shifts.includes(todayISO) ? (data.weeklyPlanning[todayIdx]?.meals.albertoDinner || '-') : (data.weeklyPlanning[todayIdx]?.meals.dinner || '-')}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === AppTab.ACTIVITY && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="px-2">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Cambios Recientes <History className="text-indigo-600" /></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Historial del hogar en tiempo real</p>
                </div>
                <div className="space-y-3">
                    {data.familyActivity.length > 0 ? data.familyActivity.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-start active:bg-slate-50 transition-all">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${item.user === 'Carmen' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <User size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-700 leading-relaxed">
                                    <span className="font-black text-slate-900">{item.user}</span> {item.action}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 flex items-center gap-1">
                                    <Clock size={10} /> {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true, locale: es })}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center">
                            <Activity className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold text-sm">No hay actividad registrada</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === AppTab.TASKS && (
             <div className="space-y-4 px-2">
                <h2 className="text-2xl font-black text-slate-800">Tareas del Hogar</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {['Todas', ...CATEGORIES.map(c => c.id)].map(c => (
                    <button key={c} onClick={() => setTaskCategoryFilter(c)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex-shrink-0 ${taskCategoryFilter === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                    {filteredTasks.length > 0 ? filteredTasks.map(task => (
                        <div key={task.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 active:bg-slate-50">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                {CATEGORIES.find(cat => cat.id === task.category)?.icon || <LayoutGrid size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800">{task.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-indigo-400">{task.frequency === 'periodic' ? `Cada ${task.intervalDays} días` : task.frequency}</span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                  <span className="text-[9px] font-black uppercase text-slate-400">{task.category}</span>
                                </div>
                            </div>
                            <button onClick={() => {
                                setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)}));
                                logActivity(`ha eliminado la tarea: ${task.title}`);
                            }} className="p-2 text-rose-300 active:text-rose-500"><Trash2 size={18} /></button>
                        </div>
                    )) : (
                        <div className="py-12 text-center text-slate-300">
                          <p className="text-sm font-bold">No hay tareas pendientes aquí</p>
                        </div>
                    )}
                    <button onClick={() => setShowAddTask(true)} className="w-full p-5 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-bold text-sm flex items-center justify-center gap-2 active:bg-slate-50">
                        <Plus size={20} /> Nueva Tarea
                    </button>
                </div>
             </div>
        )}

        {activeTab === AppTab.SHOPPING && (
            <div className="px-2">
                <h2 className="text-2xl font-black text-slate-800 mb-6">Lista de Compra</h2>
                <ShoppingList 
                    items={data.shoppingItems} 
                    onToggle={(id) => {
                        const item = data.shoppingItems.find(i => i.id === id);
                        setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed} : i)}));
                        if (item) logActivity(`${!item.completed ? 'ha comprado' : 'ha desmarcado'} ${item.name}`);
                    }}
                    onAdd={(name, price, category) => {
                        setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: category || 'Alimentación'}]}));
                        logActivity(`ha añadido ${name} a la compra`);
                    }}
                />
            </div>
        )}

        {activeTab === AppTab.WEEKLY && (
            <div className="space-y-6 px-2">
                 <h2 className="text-2xl font-black text-slate-800">Plan de la Semana</h2>
                 <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                        {weekDaysShort.map((d, i) => (
                            <div key={i} className={`py-4 text-center ${isToday(addDays(startOfThisWeek, i)) ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>
                                <p className="text-[10px] font-black">{d}</p>
                                <p className="text-xs font-black">{format(addDays(startOfThisWeek, i), 'd')}</p>
                            </div>
                        ))}
                    </div>
                    {fullWeekDays.map((day, idx) => {
                      const dayISO = format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd');
                      const isShift = data.shifts.includes(dayISO);
                      return (
                        <div key={idx} className="p-4 border-b border-slate-50 last:border-0 flex gap-4">
                           <div className="w-8 text-center shrink-0">
                              <p className="text-[8px] font-black text-slate-300 uppercase">{weekDaysShort[idx]}</p>
                              <p className="text-xs font-black text-slate-400">{format(addDays(startOfThisWeek, idx), 'd')}</p>
                           </div>
                           <div className="flex-1 space-y-1">
                              <p className="text-[10px] font-bold text-slate-800 truncate"><Utensils size={10} className="inline mr-1 text-emerald-400" /> {isShift ? `Alberto: ${data.weeklyPlanning[idx].meals.albertoLunch || 'TBD'} | Carmen: Tupper` : (data.weeklyPlanning[idx].meals.lunch || 'Sin comida')}</p>
                              <p className="text-[10px] font-bold text-slate-500 truncate"><Moon size={10} className="inline mr-1 text-indigo-400" /> {isShift ? `Alberto: ${data.weeklyPlanning[idx].meals.albertoDinner || 'TBD'} | Carmen: Hospital` : (data.weeklyPlanning[idx].meals.dinner || 'Sin cena')}</p>
                           </div>
                        </div>
                      );
                    })}
                    <div className="p-4 bg-slate-50 text-center">
                        <button onClick={() => setShowEditPlanning(true)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                          <Edit2 size={12} /> Editar Semana Completa
                        </button>
                    </div>
                 </div>
            </div>
        )}
      </main>

      {/* BOTÓN FLOTANTE UNIVERSAL */}
      <button onClick={() => setShowEditPlanning(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[60] active:scale-90 transition-transform shadow-indigo-200">
        <Edit2 size={24} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center py-5 px-4 safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<Home size={22} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.WEEKLY} onClick={() => setActiveTab(AppTab.WEEKLY)} icon={<CalendarRange size={22} />} label="Semana" />
        <NavButton active={activeTab === AppTab.ACTIVITY} onClick={() => setActiveTab(AppTab.ACTIVITY)} icon={<History size={22} />} label="Cambios" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CalendarIcon size={22} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={22} />} label="Compra" />
      </nav>

      {/* MODAL DE EDICIÓN DE PLANNING MEJORADO */}
      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center" onClick={() => setShowEditPlanning(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black flex items-center gap-3">Planificar Semana <Edit2 className="text-indigo-600" /></h3>
                <button onClick={() => setShowEditPlanning(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
             </div>
             
             <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Seleccionar Día para Editar</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {weekDaysShort.map((d, i) => (
                      <button key={i} onClick={() => setSelectedDayIndex(i)} className={`px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 transition-all ${selectedDayIndex === i ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                        {fullWeekDays[i]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-indigo-600">{fullWeekDays[selectedDayIndex]}</span>
                    {isGeneratingMenu ? <Loader2 className="animate-spin text-indigo-600" size={16} /> : <button onClick={handleSuggestMenu} className="text-[9px] font-black uppercase bg-white text-indigo-600 px-3 py-1 rounded-full shadow-sm active:scale-95">💡 Sugerencia IA</button>}
                  </div>

                  <div className="space-y-4">
                    {!currentSelectedIsShift ? (
                      <>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><Sun size={12} className="text-emerald-400" /> Comida</label>
                          <input 
                            type="text" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.lunch || ''} 
                            onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, lunch: e.target.value } })}
                            placeholder="Ej: Lentejas" 
                            className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><Moon size={12} className="text-indigo-400" /> Cena</label>
                          <input 
                            type="text" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.dinner || ''} 
                            onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, dinner: e.target.value } })}
                            placeholder="Ej: Ensalada" 
                            className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 space-y-3">
                           <p className="text-[8px] font-black uppercase text-orange-600 flex items-center gap-1"><Stethoscope size={10}/> Carmen (En Guardia)</p>
                           <input 
                              type="text" 
                              value={data.weeklyPlanning[selectedDayIndex].meals.carmenLunch || ''} 
                              onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenLunch: e.target.value } })}
                              placeholder="Tupper Comida" 
                              className="w-full p-2 bg-white rounded-lg border-none font-bold text-xs shadow-sm" 
                           />
                           <input 
                              type="text" 
                              value={data.weeklyPlanning[selectedDayIndex].meals.carmenDinner || ''} 
                              onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenDinner: e.target.value } })}
                              placeholder="Cena Hospital" 
                              className="w-full p-2 bg-white rounded-lg border-none font-bold text-xs shadow-sm" 
                           />
                        </div>
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                           <p className="text-[8px] font-black uppercase text-indigo-600 flex items-center gap-1"><User size={10}/> Alberto (En Casa)</p>
                           <input 
                              type="text" 
                              value={data.weeklyPlanning[selectedDayIndex].meals.albertoLunch || ''} 
                              onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, albertoLunch: e.target.value } })}
                              placeholder="Comida en casa" 
                              className="w-full p-2 bg-white rounded-lg border-none font-bold text-xs shadow-sm" 
                           />
                           <input 
                              type="text" 
                              value={data.weeklyPlanning[selectedDayIndex].meals.albertoDinner || ''} 
                              onChange={(e) => updatePlanning(selectedDayIndex, { meals: { ...data.weeklyPlanning[selectedDayIndex].meals, albertoDinner: e.target.value } })}
                              placeholder="Cena en casa" 
                              className="w-full p-2 bg-white rounded-lg border-none font-bold text-xs shadow-sm" 
                           />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><Dumbbell size={12} className="text-orange-400" /> Dep. Carmen</label>
                        <input 
                          type="text" 
                          value={data.weeklyPlanning[selectedDayIndex].sport.carmen || ''} 
                          onChange={(e) => updatePlanning(selectedDayIndex, { sport: { ...data.weeklyPlanning[selectedDayIndex].sport, carmen: e.target.value } })}
                          placeholder="Ej: Gym" 
                          className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm" 
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><Dumbbell size={12} className="text-indigo-400" /> Dep. Alberto</label>
                        <input 
                          type="text" 
                          value={data.weeklyPlanning[selectedDayIndex].sport.alberto || ''} 
                          onChange={(e) => updatePlanning(selectedDayIndex, { sport: { ...data.weeklyPlanning[selectedDayIndex].sport, alberto: e.target.value } })}
                          placeholder="Ej: Fútbol" 
                          className="w-full p-3 bg-white rounded-xl border-none font-bold text-sm shadow-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => { setShowEditPlanning(false); logActivity(`ha actualizado el planning del ${fullWeekDays[selectedDayIndex]}`); }} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all">Guardar Planning</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR TAREA */}
      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center" onClick={() => setShowAddTask(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
             <h3 className="text-xl font-black mb-6">Nueva Tarea</h3>
             <div className="space-y-4">
                <input type="text" placeholder="Título de la tarea" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-100 outline-none" />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Frecuencia</label>
                    <select value={newTaskFreq} onChange={(e) => setNewTaskFreq(e.target.value as Frequency)} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none">
                       <option value="daily">Diaria</option>
                       <option value="weekly">Semanal</option>
                       <option value="periodic">Periódica (Días)</option>
                       <option value="monthly">Mensual</option>
                    </select>
                  </div>
                  {newTaskFreq === 'periodic' && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">¿Cada cuántos días?</label>
                      <input type="number" placeholder="5" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Categoría</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setNewTaskCategory(c.id)} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${newTaskCategory === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        {c.icon}
                        <span className="text-[7px] font-black uppercase">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAddTask} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95">Crear Tarea</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL CALENDARIO GUARDIAS */}
      {showShiftCalendar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowShiftCalendar(false)}>
          <div className="bg-white w-full max-sm rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Guardias Carmen</h3>
              <button onClick={() => setShowShiftCalendar(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(day => {
                const dayISO = format(day, 'yyyy-MM-dd');
                const isShift = data.shifts.includes(dayISO);
                const isT = isToday(day);
                return (
                  <button key={dayISO} onClick={() => handleToggleShift(dayISO)} className={`h-10 rounded-xl flex flex-col items-center justify-center transition-all ${isShift ? 'bg-orange-500 text-white shadow-md' : isT ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-400'}`}>
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

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price: number, category: string) => void }> = ({ items, onToggle, onAdd }) => {
  const [n, setN] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);

  const handleAdd = async () => {
    if (!n.trim()) return;
    setIsEstimating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Precio medio en España para: ${n.trim()}. Solo número sin símbolo de moneda.`,
      });
      const priceStr = response.text.trim().replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr) || 0;
      onAdd(n, price, 'Alimentación');
      setN('');
    } catch (e) {
      onAdd(n, 0, 'Alimentación');
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
          <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 animate-in fade-in duration-300">
            <button onClick={() => onToggle(item.id)} className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>
              {item.completed ? <CheckCircle2 size={24} fill="currentColor" /> : <Circle size={24} />}
            </button>
            <div className="flex-1">
                <p className={`font-bold text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                <p className="text-[10px] font-black text-indigo-400">~{item.price?.toFixed(2)}€</p>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-12 text-center text-slate-300">
             <ShoppingCart size={32} className="mx-auto mb-2 opacity-20" />
             <p className="text-xs font-bold">La lista está vacía</p>
          </div>
        )}
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
