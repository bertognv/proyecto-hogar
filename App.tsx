
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
  ArrowRightLeft
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Task, ShoppingItem, AppTab, Frequency, DayPlanning, UrgentNote, FamilyActivity } from './types';
import { calculateNextDueDate } from './utils/dateUtils';
import { parseISO, isBefore, startOfDay, format, addDays, addMinutes, startOfWeek, isSameDay, eachDayOfInterval, endOfMonth, startOfMonth, isSameMonth, addMonths, subMonths, formatDistanceToNow } from 'date-fns';
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

const INITIAL_DATA: AppData = {
  userName: "Alberto",
  familyCode: "GNM-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  isSynced: true,
  familyActivity: [],
  laundry: { isActive: false, reminderSent: false, durationMinutes: 90 },
  weeklyPlanning: INITIAL_PLANNING,
  urgentNotes: [],
  shifts: [],
  tasks: [],
  shoppingItems: []
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('gnm_hogar_data');
    if (saved) {
      try {
        return { ...INITIAL_DATA, ...JSON.parse(saved) };
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
  const [showSyncCenter, setShowSyncCenter] = useState(false);
  const [showShiftCalendar, setShowShiftCalendar] = useState(false);
  const [isGeneratingMenu, setIsGeneratingMenu] = useState(false);
  const [editPlanningType, setEditPlanningType] = useState<'sport' | 'meals'>('sport');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>('daily');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('Todas');

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const selectedDayDate = addDays(startOfThisWeek, selectedDayIndex);
  const selectedDayISO = format(selectedDayDate, 'yyyy-MM-dd');
  const isShiftDay = data.shifts.includes(selectedDayISO);
  const todayISO = format(today, 'yyyy-MM-dd');
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  useEffect(() => {
    localStorage.setItem('gnm_hogar_data', JSON.stringify(data));
  }, [data]);

  // Simulación de sincronización en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // En una app real esto sería un fetch o un websocket
      // Aquí simplemente refrescamos el estado de sincronización visualmente
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 800);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const logActivity = (action: string) => {
    const newActivity: FamilyActivity = {
      id: Date.now().toString(),
      user: data.userName,
      action: action,
      timestamp: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      familyActivity: [newActivity, ...prev.familyActivity].slice(0, 50) // Mantener últimos 50
    }));
  };

  const handleSuggestMenu = async () => {
    setIsGeneratingMenu(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const prompt = `Como experto chef de hogar para la familia Gómez-Naveira Mota, sugiere un plato para la comida y otro para la cena para un ${fullWeekDays[selectedDayIndex]}. 
      Ten en cuenta que Carmen es médica y si tiene guardia (Estado: ${isShiftDay ? 'EN GUARDIA' : 'Libre'}) necesita algo nutritivo y fácil de transportar o recalentar.
      Responde SOLO con un JSON con el formato: {"lunch": "nombre del plato", "dinner": "nombre del plato"}. No añadas texto extra.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      const result = JSON.parse(response.text.trim());
      
      if (isShiftDay) {
        updatePlanning({
          meals: {
            ...data.weeklyPlanning[selectedDayIndex].meals,
            albertoLunch: result.lunch,
            carmenLunch: result.lunch + ' (Tupper)',
            albertoDinner: result.dinner,
            carmenDinner: 'Cena hospital'
          }
        });
        logActivity(`usó IA para sugerir menú de guardia el ${fullWeekDays[selectedDayIndex]}`);
      } else {
        updatePlanning({
          meals: {
            ...data.weeklyPlanning[selectedDayIndex].meals,
            lunch: result.lunch,
            dinner: result.dinner
          }
        });
        logActivity(`usó IA para sugerir menú el ${fullWeekDays[selectedDayIndex]}`);
      }
    } catch (e) {
      console.error("Error generating menu:", e);
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
    
    if (isSameWeek) {
      setData(prev => ({
        ...prev,
        shifts: newShifts,
        weeklyPlanning: {
          ...prev.weeklyPlanning,
          [dayIdx]: {
            ...prev.weeklyPlanning[dayIdx],
            sport: {
              ...prev.weeklyPlanning[dayIdx].sport,
              carmen: isNowShift ? '🏥 Guardia' : ''
            }
          }
        }
      }));
    } else {
      setData(prev => ({ ...prev, shifts: newShifts }));
    }
    
    logActivity(`${isNowShift ? 'añadió' : 'eliminó'} guardia el día ${format(dateObj, 'd/MM')}`);
  };

  const handleStartLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: { ...prev.laundry, isActive: true, startTime: new Date().toISOString(), reminderSent: false, durationMinutes: 90, startedBy: prev.userName }
    }));
    logActivity('puso una lavadora');
  };

  const handleFinishLaundry = () => {
    setData(prev => ({...prev, laundry: {...prev.laundry, isActive: false}}));
    logActivity('tendió la ropa');
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
      isRepetitive: true,
      lastModifiedBy: data.userName
    };
    setData(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    logActivity(`creó la tarea: ${newTaskTitle}`);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const updatePlanning = (updates: Partial<DayPlanning>) => {
    setData(prev => ({
      ...prev,
      weeklyPlanning: {
        ...prev.weeklyPlanning,
        [selectedDayIndex]: { ...prev.weeklyPlanning[selectedDayIndex], ...updates }
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-28">
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-[2.5rem] sticky top-0 z-40 border-b border-slate-50">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
                {format(today, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
                {isSyncing && <CloudSync size={12} className="text-indigo-400 animate-spin" />}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Hogar GNM</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleUser} className="flex flex-col items-center p-2 bg-slate-50 text-slate-500 rounded-2xl active:scale-95 transition-transform border border-slate-100">
               <User size={18} />
               <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">{data.userName}</span>
            </button>
            <button onClick={() => setShowShiftCalendar(true)} className="p-3 bg-orange-50 text-orange-600 rounded-2xl active:scale-95 transition-transform border border-orange-100">
              <Stethoscope size={24} />
            </button>
          </div>
        </div>

        {activeTab === AppTab.DASHBOARD && (
          <div className="flex justify-between mt-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {weekDaysShort.map((day, idx) => {
              const isActive = selectedDayIndex === idx;
              const dayDate = addDays(startOfThisWeek, idx);
              const isTodayDate = format(dayDate, 'yyyy-MM-dd') === todayISO;
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
            <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
              <Zap size={100} className="absolute -right-10 -top-10 text-white/10 rotate-12" />
              <div className="relative z-10 space-y-5">
                <div className="flex justify-between items-center">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Estado Familiar</p>
                   {isShiftDay && todayIdx === selectedDayIndex && (
                     <span className="bg-orange-400 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter animate-pulse shadow-md">
                       <Stethoscope size={10} /> Guardia Carmen
                     </span>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Utensils size={14} className="text-emerald-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Menú Hoy</span></div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Sun size={10} className="text-emerald-300 shrink-0" />
                            <p className="text-[10px] font-black truncate">
                            {isShiftDay 
                                ? (data.weeklyPlanning[todayIdx]?.meals.albertoLunch || 'Especial')
                                : (data.weeklyPlanning[todayIdx]?.meals.lunch || '-')}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <Moon size={10} className="text-indigo-300 shrink-0" />
                            <p className="text-[10px] font-black truncate">
                            {isShiftDay 
                                ? (data.weeklyPlanning[todayIdx]?.meals.albertoDinner || 'Especial')
                                : (data.weeklyPlanning[todayIdx]?.meals.dinner || '-')}
                            </p>
                        </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Dumbbell size={14} className="text-orange-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Deporte</span></div>
                    <p className="text-[11px] font-black truncate">{isShiftDay ? 'Hospital' : (data.weeklyPlanning[todayIdx]?.sport.carmen || '-')}</p>
                  </div>
                </div>

                {data.laundry.isActive ? (
                  <div className={`p-4 rounded-3xl border transition-all ${isLaundryFinished ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-indigo-400/20 border-indigo-400/20'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Waves size={16} className={isLaundryFinished ? 'animate-bounce text-emerald-300' : 'animate-pulse text-indigo-200'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLaundryFinished ? '¡Colada Lista!' : `Lavando (${data.laundry.startedBy})`}</span>
                      </div>
                      {isLaundryFinished && (
                        <button onClick={handleFinishLaundry} className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2">
                          <Wind size={12} /> Tender
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={handleStartLaundry} className="w-full flex items-center justify-center gap-2 p-3 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">
                    <Waves size={16} /> Iniciar Lavadora
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-600" /> Planning Hoy</h2>
                <button onClick={() => setActiveTab(AppTab.WEEKLY)} className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Plan Semanal</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => { setEditPlanningType('sport'); setShowEditPlanning(true); }} className="bg-orange-50/50 border border-orange-100 p-4 rounded-3xl active:bg-orange-100 cursor-pointer">
                  <div className="flex items-center gap-2 text-orange-600 mb-3"><Dumbbell size={18} /><span className="text-xs font-bold uppercase">Deporte</span></div>
                  <p className="text-[9px] text-orange-400 font-bold uppercase">C: <span className="text-slate-700">{isShiftDay ? '🏥 Hospital' : (data.weeklyPlanning[selectedDayIndex]?.sport.carmen || '-')}</span></p>
                  <p className="text-[9px] text-orange-400 font-bold uppercase">A: <span className="text-slate-700">{data.weeklyPlanning[selectedDayIndex]?.sport.alberto || '-'}</span></p>
                </div>
                <div onClick={() => { setEditPlanningType('meals'); setShowEditPlanning(true); }} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl active:bg-emerald-100 cursor-pointer">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3"><Utensils size={18} /><span className="text-xs font-bold uppercase">Menú Hoy</span></div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-emerald-400 font-bold uppercase truncate flex items-center gap-1">
                        <Sun size={10} /> 
                        <span className="text-slate-700">
                        {isShiftDay 
                            ? (data.weeklyPlanning[selectedDayIndex]?.meals.albertoLunch || '-') 
                            : (data.weeklyPlanning[selectedDayIndex]?.meals.lunch || '-')}
                        </span>
                    </p>
                    <p className="text-[9px] text-indigo-400 font-bold uppercase truncate flex items-center gap-1">
                        <Moon size={10} /> 
                        <span className="text-slate-700">
                        {isShiftDay 
                            ? (data.weeklyPlanning[selectedDayIndex]?.meals.albertoDinner || '-') 
                            : (data.weeklyPlanning[selectedDayIndex]?.meals.dinner || '-')}
                        </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === AppTab.ACTIVITY && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="px-2">
                    <h2 className="text-2xl font-black text-slate-800">Cambios Recientes</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lo que está pasando en el hogar</p>
                </div>
                <div className="space-y-3">
                    {data.familyActivity.length > 0 ? data.familyActivity.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-start active:bg-slate-50 transition-colors">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.user === 'Carmen' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <User size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-700 leading-relaxed">
                                    <span className="font-black text-slate-900">{item.user}</span> {item.action}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 flex items-center gap-1">
                                    <Clock size={10} /> {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true, locale: es })}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center">
                            <History className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-400 font-bold text-sm">No hay cambios registrados todavía</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === AppTab.WEEKLY && (
          <div className="space-y-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-2xl font-black text-slate-800 px-2">Plan Semanal GNM</h2>
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
              <div className="grid grid-cols-7 bg-slate-50/50">
                {weekDaysShort.map((day, idx) => (
                  <div key={idx} className={`py-4 flex flex-col items-center justify-center gap-1 border-r border-slate-50 last:border-r-0 ${isSameDay(addDays(startOfThisWeek, idx), today) ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                    <span className="text-[10px] font-black uppercase">{day}</span>
                    <span className="text-sm font-black">{format(addDays(startOfThisWeek, idx), 'd')}</span>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 border-b border-slate-50 relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-orange-500 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10">Deporte</div>
                {fullWeekDays.map((_, idx) => {
                  const dayDateISO = format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd');
                  const hasShift = data.shifts.includes(dayDateISO);
                  return (
                    <div key={idx} className="h-20 p-2 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0">
                      {hasShift ? <Stethoscope size={14} className="text-orange-400 animate-pulse" /> : <span className="text-[8px] font-bold text-slate-400">{data.weeklyPlanning[idx].sport.carmen ? 'C' : ''}{data.weeklyPlanning[idx].sport.alberto ? ' A' : '' || '-'}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 border-b border-slate-50 relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-emerald-500 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10">Comida</div>
                {fullWeekDays.map((_, idx) => {
                  const dayDateISO = format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd');
                  const hasShift = data.shifts.includes(dayDateISO);
                  const lunchText = hasShift ? data.weeklyPlanning[idx].meals.albertoLunch : data.weeklyPlanning[idx].meals.lunch;
                  return (
                    <div key={idx} className="h-28 p-1 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0 overflow-hidden bg-emerald-50/20">
                      {hasShift && <span className="text-[5px] font-black text-emerald-500 uppercase mb-0.5">A+C (Tupper)</span>}
                      <p className="text-[8px] font-black text-slate-500 uppercase leading-tight line-clamp-3">{lunchText || '-'}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-7 relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-indigo-500 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10">Cena</div>
                {fullWeekDays.map((_, idx) => {
                  const dayDateISO = format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd');
                  const hasShift = data.shifts.includes(dayDateISO);
                  const dinnerText = hasShift ? data.weeklyPlanning[idx].meals.albertoDinner : data.weeklyPlanning[idx].meals.dinner;
                  return (
                    <div key={idx} className="h-28 p-1 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0 overflow-hidden bg-indigo-50/20">
                      {hasShift && <span className="text-[5px] font-black text-indigo-500 uppercase mb-0.5">A+C (Hosp)</span>}
                      <p className="text-[8px] font-black text-slate-500 uppercase leading-tight line-clamp-3">{dinnerText || '-'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === AppTab.TASKS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800">Tareas</h2>
              <button onClick={() => setShowAddTask(true)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90"><Plus size={24} /></button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 px-2 no-scrollbar">
              <button 
                onClick={() => setTaskCategoryFilter('Todas')}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${taskCategoryFilter === 'Todas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
              >
                Todas
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setTaskCategoryFilter(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all ${taskCategoryFilter === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 px-2">
              {filteredTasks.length > 0 ? filteredTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    {CATEGORIES.find(c => c.id === task.category)?.icon || <LayoutGrid size={18} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-sm">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-indigo-400">{task.frequency}</span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                      <span className="text-[8px] font-black uppercase text-slate-400">{task.category}</span>
                    </div>
                  </div>
                  <button onClick={() => {
                      setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)}));
                      logActivity(`eliminó la tarea: ${task.title}`);
                  }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              )) : (
                <div className="py-20 text-center space-y-3">
                  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="text-slate-300" size={32} />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">No hay tareas en esta categoría</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.SHOPPING && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 px-2">Lista de Compra</h2>
            <ShoppingList 
              items={data.shoppingItems} 
              onToggle={(id) => {
                  const item = data.shoppingItems.find(i => i.id === id);
                  setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed} : i)}));
                  if (item) logActivity(`${!item.completed ? 'compró' : 'desmarcó'} ${item.name}`);
              }}
              onAdd={(name, price, category) => {
                  setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: category || 'Alimentación', lastModifiedBy: prev.userName}]}));
                  logActivity(`añadió ${name} a la lista de la compra`);
              }}
            />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center py-4 px-3 safe-bottom shadow-[0_-15px_50px_rgba(0,0,0,0.08)] z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<Home size={20} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.WEEKLY} onClick={() => setActiveTab(AppTab.WEEKLY)} icon={<CalendarRange size={20} />} label="Semana" />
        <NavButton active={activeTab === AppTab.ACTIVITY} onClick={() => setActiveTab(AppTab.ACTIVITY)} icon={<History size={20} />} label="Cambios" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CalendarIcon size={20} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={20} />} label="Compra" />
      </nav>

      {/* MODAL: Calendario de Guardias */}
      {showShiftCalendar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowShiftCalendar(false)}>
          <div className="bg-white w-full max-sm rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Guardias Carmen</h3>
              <button onClick={() => setShowShiftCalendar(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            
            <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-2xl">
              <button onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))} className="p-2 text-indigo-600"><ChevronLeft size={20} /></button>
              <span className="text-sm font-black uppercase text-slate-600">{format(currentCalendarMonth, 'MMMM yyyy', { locale: es })}</span>
              <button onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))} className="p-2 text-indigo-600"><ChevronRight size={20} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-[10px] font-black text-slate-300 text-center py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: (startOfMonth(currentCalendarMonth).getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {calendarDays.map(day => {
                const dayISO = format(day, 'yyyy-MM-dd');
                const isShift = data.shifts.includes(dayISO);
                const isT = isToday(day);
                return (
                  <button
                    key={dayISO}
                    onClick={() => handleToggleShift(dayISO)}
                    className={`h-10 rounded-xl flex flex-col items-center justify-center transition-all relative ${
                      isShift ? 'bg-orange-500 text-white shadow-md' : 
                      isT ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-black">{format(day, 'd')}</span>
                    {isShift && <div className="w-1 h-1 bg-white rounded-full mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Planning */}
      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center" onClick={() => setShowEditPlanning(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white py-2 z-10">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                {editPlanningType === 'sport' ? <Dumbbell className="text-orange-500" /> : <Utensils className="text-emerald-500" />}
                Editar {editPlanningType === 'sport' ? 'Deporte' : 'Menú'}
              </h3>
              {editPlanningType === 'meals' && (
                <button 
                  onClick={handleSuggestMenu} 
                  disabled={isGeneratingMenu}
                  className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all ${isGeneratingMenu ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600 active:scale-95'}`}
                >
                  {isGeneratingMenu ? <RefreshCw className="animate-spin" size={14} /> : <ChefHat size={14} />}
                  Sugerencia IA
                </button>
              )}
            </div>

            <div className="space-y-6">
              {editPlanningType === 'sport' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-orange-400 tracking-wider mb-2 block">Carmen {isShiftDay && '(En Guardia)'}</label>
                    <input 
                      type="text" 
                      placeholder="Caminar, Gimnasio, Descanso..." 
                      disabled={isShiftDay}
                      value={isShiftDay ? '🏥 Guardia' : (data.weeklyPlanning[selectedDayIndex].sport.carmen || '')}
                      onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, carmen: e.target.value } })} 
                      className={`w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-100 outline-none ${isShiftDay ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-2 block">Alberto</label>
                    <input 
                      type="text" 
                      placeholder="Fútbol, Running, Pádel..." 
                      value={data.weeklyPlanning[selectedDayIndex].sport.alberto || ''}
                      onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, alberto: e.target.value } })} 
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isShiftDay ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase text-emerald-500 tracking-wider mb-2 block flex items-center gap-2"><Sun size={12} /> Almuerzo Familiar</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Pasta boloñesa" 
                          value={data.weeklyPlanning[selectedDayIndex].meals.lunch || ''}
                          onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, lunch: e.target.value } })} 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-emerald-100 outline-none" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-2 block flex items-center gap-2"><Moon size={12} /> Cena Familiar</label>
                        <input 
                          type="text" 
                          placeholder="Ej: Ensalada César" 
                          value={data.weeklyPlanning[selectedDayIndex].meals.dinner || ''}
                          onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, dinner: e.target.value } })} 
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" 
                        />
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-orange-50/50 p-4 rounded-[2rem] border border-orange-100 space-y-4">
                        <div className="flex items-center gap-2"><Stethoscope size={16} className="text-orange-500" /><span className="text-[10px] font-black uppercase text-orange-600">Plan Carmen (Hospital)</span></div>
                        <div className="space-y-3">
                            <input 
                            type="text" 
                            placeholder="Comida (Tupper)" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.carmenLunch || ''}
                            onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenLunch: e.target.value } })} 
                            className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl font-bold text-sm outline-none" 
                            />
                            <input 
                            type="text" 
                            placeholder="Cena (Hosp)" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.carmenDinner || ''}
                            onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenDinner: e.target.value } })} 
                            className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl font-bold text-sm outline-none" 
                            />
                        </div>
                      </div>
                      <div className="bg-indigo-50/50 p-4 rounded-[2rem] border border-indigo-100 space-y-4">
                        <div className="flex items-center gap-2"><User size={16} className="text-indigo-500" /><span className="text-[10px] font-black uppercase text-indigo-600">Plan Alberto (Casa)</span></div>
                        <div className="space-y-3">
                            <input 
                            type="text" 
                            placeholder="Comida en casa" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.albertoLunch || ''}
                            onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, albertoLunch: e.target.value } })} 
                            className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none" 
                            />
                            <input 
                            type="text" 
                            placeholder="Cena en casa" 
                            value={data.weeklyPlanning[selectedDayIndex].meals.albertoDinner || ''}
                            onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, albertoDinner: e.target.value } })} 
                            className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl font-bold text-sm outline-none" 
                            />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => {
                  setShowEditPlanning(false);
                  logActivity(`editó el planning del ${fullWeekDays[selectedDayIndex]}`);
              }} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 sticky bottom-0">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Tarea */}
      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center" onClick={() => setShowAddTask(false)}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3"><Plus className="text-indigo-600" /> Nueva Tarea</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Título</label>
                <input 
                  type="text" 
                  placeholder="Ej: Limpiar cristales" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100" 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Frecuencia</label>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setNewTaskFreq(f as Frequency)}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newTaskFreq === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {f === 'daily' ? 'Diaria' : f === 'weekly' ? 'Semanal' : 'Mensual'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">Categoría</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setNewTaskCategory(cat.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${newTaskCategory === cat.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-50 text-slate-400'}`}
                    >
                      {cat.icon}
                      <span className="text-[7px] font-black uppercase tracking-tighter">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleAddTask} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 disabled:opacity-50" disabled={!newTaskTitle.trim()}>Crear Tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price: number, category: string) => void }> = ({ items, onToggle, onAdd }) => {
  const [n, setN] = useState('');
  const [c, setC] = useState('Alimentación');
  const [isEstimating, setIsEstimating] = useState(false);

  const handleAdd = async () => {
    if (!n.trim()) return;
    setIsEstimating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Dime el precio medio aproximado en Euros (€) para "${n.trim()}" en un supermercado en España hoy. Devuelve solo el número con dos decimales.`,
      });
      const price = parseFloat(response.text.trim().replace(/[^0-9.]/g, '')) || 0;
      onAdd(n, price, c);
      setN('');
    } catch (e) {
      onAdd(n, 0, c);
      setN('');
    } finally {
      setIsEstimating(false);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-4 px-2">
      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex gap-2">
          <input type="text" placeholder="¿Qué necesitas?" value={n} onChange={(e) => setN(e.target.value)} className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
          <button onClick={handleAdd} disabled={isEstimating} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 flex items-center justify-center min-w-[56px]">
            {isEstimating ? <RefreshCw className="animate-spin" /> : <Plus size={24} />}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {SHOPPING_CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setC(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all ${c === cat.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400'}`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {(Object.entries(groupedItems) as [string, ShoppingItem[]][]).map(([category, categoryItems]) => (
          <div key={category} className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 px-2">
              {SHOPPING_CATEGORIES.find(sc => sc.id === category)?.icon}
              {category}
            </h4>
            <div className="space-y-2">
              {categoryItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-5 rounded-3xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                  <button onClick={() => onToggle(item.id)} className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>
                    {item.completed ? <CheckCircle2 size={24} fill="currentColor" /> : <Circle size={24} />}
                  </button>
                  <div className="flex-1">
                    <span className={`font-bold text-sm block ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.name}</span>
                    <span className="text-[10px] font-black text-indigo-400">~{item.price?.toFixed(2)}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string, isUrgentBadge?: boolean }> = ({ active, onClick, icon, label, isUrgentBadge }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${active ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
    <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-indigo-50' : ''}`}>
      {icon}
      {isUrgentBadge && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>)}
    </div>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const isToday = (date: Date) => {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
};

export default App;
