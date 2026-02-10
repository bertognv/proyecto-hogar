
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
  Moon
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppData, Task, ShoppingItem, AppTab, Frequency, DayPlanning, UrgentNote, FamilyActivity } from './types';
import { calculateNextDueDate } from './utils/dateUtils';
import { parseISO, isBefore, startOfDay, format, addDays, addMinutes, startOfWeek, isSameDay, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'General', label: 'General', icon: <LayoutGrid size={16} /> },
  { id: 'Limpieza', label: 'Limpieza', icon: <Sparkles size={16} /> },
  { id: 'Mascotas', label: 'Mascotas', icon: <Cat size={16} /> },
  { id: 'Mantenimiento', label: 'Mantenimiento', icon: <Wrench size={16} /> },
  { id: 'Compras', label: 'Compras', icon: <ShoppingBag size={16} /> },
  { id: 'Cocina', label: 'Cocina', icon: <Coffee size={16} /> },
  { id: 'Personal', label: 'Personal', icon: <User size={16} /> },
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
  familyCode: "HOGAR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  isSynced: true,
  familyActivity: [
    { id: '1', user: 'Carmen', action: 'añadió Leche a la compra', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', user: 'Carmen', action: 'completó Cambiar arenero', timestamp: new Date(Date.now() - 7200000).toISOString() }
  ],
  laundry: { isActive: false, reminderSent: false, durationMinutes: 90 },
  weeklyPlanning: INITIAL_PLANNING,
  urgentNotes: [],
  shifts: [],
  tasks: [
    { id: '1', title: 'Dinero para Pilar (Viernes)', category: 'Limpieza', frequency: 'weekly', specificDay: 5, nextDueDate: calculateNextDueDate('weekly', undefined, undefined, 5), completedToday: false, isRepetitive: true, lastModifiedBy: 'Carmen' },
    { id: '2', title: 'Cambiar arenero de las gatas', category: 'Mascotas', frequency: 'periodic', intervalDays: 5, lastCompletedAt: new Date().toISOString(), nextDueDate: calculateNextDueDate('periodic', new Date().toISOString(), 5), completedToday: false, isRepetitive: true, lastModifiedBy: 'Carmen' },
    { id: '3', title: 'Cambiar sábanas', category: 'Limpieza', frequency: 'weekly', intervalDays: 7, nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false, isRepetitive: true },
    { id: '4', title: 'Revision Caldera', category: 'Mantenimiento', frequency: 'periodic', intervalDays: 180, nextDueDate: calculateNextDueDate('periodic', undefined, 180), completedToday: false, isRepetitive: false }
  ],
  shoppingItems: [
    { id: 's1', name: 'Leche', completed: false, category: 'Alimentación', price: 1.20, lastModifiedBy: 'Carmen' },
    { id: 's2', name: 'Arena gatos', completed: false, category: 'Mascotas', price: 8.50, lastModifiedBy: 'Carmen' }
  ]
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('hogar_pro_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [showSyncCenter, setShowSyncCenter] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [editPlanningType, setEditPlanningType] = useState<'sport' | 'meals'>('sport');
  const [urgentInput, setUrgentInput] = useState('');

  // Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>('daily');
  const [newTaskInterval, setNewTaskInterval] = useState(1);
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [isNewTaskRepetitive, setIsNewTaskRepetitive] = useState(true);

  // Filter State
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('Todas');

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const selectedDayDate = addDays(startOfThisWeek, selectedDayIndex);
  const selectedDayISO = format(selectedDayDate, 'yyyy-MM-dd');
  const isShiftDay = data.shifts.includes(selectedDayISO);
  const todayISO = format(today, 'yyyy-MM-dd');
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

  // Sync Simulation
  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const actions = [
        'añadió Fruta a la compra',
        'completó Limpiar microondas',
        'actualizó el planning de mañana',
        'marcó lavadora como tendida'
      ];
      const newActivity: FamilyActivity = {
        id: Date.now().toString(),
        user: 'Carmen',
        action: actions[Math.floor(Math.random() * actions.length)],
        timestamp: new Date().toISOString()
      };
      setData(prev => ({
        ...prev,
        familyActivity: [newActivity, ...prev.familyActivity.slice(0, 4)]
      }));
    }, 1200);
  };

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(data.familyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    const checkLaundry = () => {
      if (data.laundry.isActive && data.laundry.startTime && !data.laundry.reminderSent) {
        const endTime = addMinutes(parseISO(data.laundry.startTime), data.laundry.durationMinutes);
        if (isBefore(endTime, new Date())) {
          setData(prev => ({
            ...prev,
            laundry: { ...prev.laundry, reminderSent: true }
          }));
        }
      }
    };
    const interval = setInterval(checkLaundry, 5000);
    return () => clearInterval(interval);
  }, [data.laundry.isActive, data.laundry.startTime, data.laundry.durationMinutes, data.laundry.reminderSent]);

  useEffect(() => {
    localStorage.setItem('hogar_pro_data', JSON.stringify(data));
  }, [data]);

  const toggleTask = (taskId: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { 
        ...t, 
        completedToday: !t.completedToday,
        lastCompletedAt: !t.completedToday ? new Date().toISOString() : t.lastCompletedAt,
        nextDueDate: !t.completedToday ? calculateNextDueDate(t.frequency, new Date().toISOString(), t.intervalDays, t.specificDay) : t.nextDueDate,
        lastModifiedBy: data.userName
      } : t)
    }));
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

  const toggleShift = (dateStr: string) => {
    setData(prev => ({
      ...prev,
      shifts: prev.shifts.includes(dateStr) 
        ? prev.shifts.filter(s => s !== dateStr) 
        : [...prev.shifts, dateStr]
    }));
  };

  const isLaundryFinished = data.laundry.isActive && data.laundry.startTime && 
    isBefore(addMinutes(parseISO(data.laundry.startTime), data.laundry.durationMinutes), new Date());

  const handleTender = () => {
    const laundryNote: UrgentNote = {
      id: 'laundry-' + Date.now(),
      text: "¡Tender ropa de la lavadora! 🧺",
      createdAt: new Date().toISOString(),
      isResolved: false,
      author: data.userName
    };
    
    setData(prev => ({
      ...prev,
      urgentNotes: [laundryNote, ...prev.urgentNotes],
      laundry: { isActive: false, reminderSent: false, startTime: undefined, durationMinutes: 90 }
    }));
  };

  const handleStartLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: {
        ...prev.laundry,
        isActive: true,
        startTime: new Date().toISOString(),
        reminderSent: false,
        durationMinutes: 90
      }
    }));
  };

  const upcomingTasks = useMemo(() => {
    return data.tasks
      .filter(t => !t.completedToday)
      .sort((a, b) => parseISO(a.nextDueDate).getTime() - parseISO(b.nextDueDate).getTime())
      .slice(0, 3);
  }, [data.tasks]);

  const filteredTasks = useMemo(() => {
    return data.tasks.filter(t => taskCategoryFilter === 'Todas' || t.category === taskCategoryFilter);
  }, [data.tasks, taskCategoryFilter]);

  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-28">
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-[2.5rem] sticky top-0 z-40 border-b border-slate-50">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">
                {format(today, "EEEE, d 'de' MMMM", { locale: es })}
              </p>
              {data.isSynced && (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100/50">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black uppercase tracking-tighter">Sinc: Carmen</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Hogar Gómez-Naveira Mota</h1>
          </div>
          <button onClick={() => setShowSyncCenter(true)} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl active:scale-95 transition-transform flex-shrink-0">
            <Users size={24} />
          </button>
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
            <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 overflow-hidden relative group">
              <Zap size={100} className="absolute -right-10 -top-10 text-white/10 rotate-12" />
              <div className="relative z-10 space-y-5">
                <div className="flex justify-between items-center">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Estado Familiar</p>
                   {isShiftDay && todayIdx === selectedDayIndex && (
                     <span className="bg-orange-400 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter animate-pulse shadow-md">
                       <Stethoscope size={10} /> Carmen de Guardia
                     </span>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Utensils size={14} className="text-emerald-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Menú</span></div>
                    <p className="text-[11px] font-black truncate">{isShiftDay ? (data.weeklyPlanning[todayIdx]?.meals.carmenLunch || 'Individual') : (data.weeklyPlanning[todayIdx]?.meals.lunch || 'No planificado')}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5"><Dumbbell size={14} className="text-orange-300" /><span className="text-[9px] font-bold uppercase text-indigo-100">Deporte</span></div>
                    <p className="text-[11px] font-black truncate">{isShiftDay ? 'Guardia Carmen' : (data.weeklyPlanning[todayIdx]?.sport.carmen || 'No planificado')}</p>
                  </div>
                </div>

                <div className="space-y-2 bg-indigo-900/30 p-3 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-100/70 mb-2">Actividad Carmen</p>
                  {data.familyActivity.slice(0, 2).map(act => (
                    <div key={act.id} className="flex items-center gap-2 text-[11px] font-bold">
                      <div className="w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[9px] font-black">C</div>
                      <span className="truncate flex-1">{act.action}</span>
                      <span className="text-[8px] text-white/40">{format(parseISO(act.timestamp), 'HH:mm')}</span>
                    </div>
                  ))}
                </div>

                {upcomingTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase text-indigo-100/70">Próximas Tareas</p>
                    {upcomingTasks.slice(0, 2).map(t => (
                      <div key={t.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${t.lastModifiedBy === 'Carmen' ? 'bg-orange-400' : 'bg-white/10'}`}>
                          {t.lastModifiedBy === 'Carmen' ? 'C' : 'A'}
                        </div>
                        <p className="text-[10px] font-bold truncate flex-1">{t.title}</p>
                        <span className="text-[8px] font-black opacity-50">{format(parseISO(t.nextDueDate), 'd MMM')}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {data.laundry.isActive ? (
                  <div className={`p-3 rounded-2xl border transition-all ${isLaundryFinished ? 'bg-white/20 border-white/40' : 'bg-indigo-400/20 border-indigo-400/20'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Waves size={16} className={isLaundryFinished ? 'animate-bounce text-emerald-300' : 'animate-pulse text-indigo-200'} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLaundryFinished ? '¡Colada Lista!' : 'Lavando...'}</span>
                      </div>
                      {!isLaundryFinished && (
                        <span className="text-[8px] font-black opacity-60">Termina {format(addMinutes(parseISO(data.laundry.startTime!), data.laundry.durationMinutes), 'HH:mm')}</span>
                      )}
                    </div>
                    {isLaundryFinished ? (
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleTender} className="flex-1 bg-white text-indigo-600 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                          <Wind size={14} /> Tender Ahora
                        </button>
                        <button onClick={() => setData(prev => ({ ...prev, laundry: { ...prev.laundry, isActive: false } }))} className="bg-white/10 p-2.5 rounded-xl text-white">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-white animate-progress"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={handleStartLaundry} className="w-full flex items-center justify-center gap-2 p-3 bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95">
                    <Waves size={16} /> Iniciar Lavadora
                  </button>
                )}
              </div>
            </section>

            {data.urgentNotes.filter(n => !n.isResolved).length > 0 && (
              <div onClick={() => setActiveTab(AppTab.URGENT)} className="bg-rose-500 text-white p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-rose-200 animate-pulse cursor-pointer">
                <div className="flex items-center gap-3"><AlertCircle size={20} /><span className="font-bold text-sm">¡Hay imprevistos!</span></div>
                <ChevronRight size={18} />
              </div>
            )}

            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><CalendarIcon size={20} className="text-indigo-600" /> Planning {fullWeekDays[selectedDayIndex]}</h2>
                <button onClick={() => setActiveTab(AppTab.WEEKLY)} className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">Vista Total</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => { setEditPlanningType('sport'); setShowEditPlanning(true); }} className="bg-orange-50/50 border border-orange-100 p-4 rounded-3xl active:bg-orange-50 cursor-pointer relative">
                  {isShiftDay && <div className="absolute top-0 right-0 bg-orange-500 text-white px-3 py-1 text-[8px] font-black rounded-bl-xl uppercase">Guardia</div>}
                  <div className="flex items-center gap-2 text-orange-600 mb-3"><Dumbbell size={18} /><span className="text-xs font-bold uppercase">Deporte</span></div>
                  <p className="text-[9px] text-orange-400 font-bold uppercase mb-1">C: <span className="text-slate-700 font-bold">{isShiftDay ? 'Guardia 🏥' : (data.weeklyPlanning[selectedDayIndex]?.sport.carmen || '-')}</span></p>
                  <p className="text-[9px] text-orange-400 font-bold uppercase">A: <span className="text-slate-700 font-bold">{data.weeklyPlanning[selectedDayIndex]?.sport.alberto || '-'}</span></p>
                </div>
                <div onClick={() => { setEditPlanningType('meals'); setShowEditPlanning(true); }} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl active:bg-emerald-50 cursor-pointer">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3"><Utensils size={18} /><span className="text-xs font-bold uppercase">Menú</span></div>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase mb-1">Com: <span className="text-slate-700 font-bold">{isShiftDay ? (data.weeklyPlanning[selectedDayIndex]?.meals.carmenLunch || '-') : (data.weeklyPlanning[selectedDayIndex]?.meals.lunch || '-')}</span></p>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase">Cen: <span className="text-slate-700 font-bold">{isShiftDay ? (data.weeklyPlanning[selectedDayIndex]?.meals.carmenDinner || '-') : (data.weeklyPlanning[selectedDayIndex]?.meals.dinner || '-')}</span></p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === AppTab.WEEKLY && (
          <div className="space-y-6 h-full flex flex-col animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800">Plan Semanal</h2>
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2">
                <CalendarRange size={14} /> Sem {format(startOfThisWeek, 'w')}
              </div>
            </div>
            
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
              {/* Header de días */}
              <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
                {weekDaysShort.map((day, idx) => {
                  const dDate = addDays(startOfThisWeek, idx);
                  const isT = isSameDay(dDate, today);
                  return (
                    <div key={idx} className={`py-4 flex flex-col items-center justify-center gap-1 border-r border-slate-50 last:border-r-0 ${isT ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                      <span className="text-[10px] font-black uppercase">{day}</span>
                      <span className="text-sm font-black">{format(dDate, 'd')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Fila Deporte */}
              <div className="grid grid-cols-7 border-b border-slate-50 relative group">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-orange-500 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10 shadow-sm">Sport</div>
                {fullWeekDays.map((_, idx) => {
                  const p = data.weeklyPlanning[idx];
                  const hasS = data.shifts.includes(format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd'));
                  return (
                    <div key={idx} onClick={() => { setSelectedDayIndex(idx); setActiveTab(AppTab.DASHBOARD); }} className={`h-24 p-2 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0 transition-colors active:bg-orange-50 cursor-pointer ${hasS ? 'bg-orange-50/30' : ''}`}>
                      {hasS ? (
                        <Stethoscope size={16} className="text-orange-500 animate-pulse" />
                      ) : (
                        <div className="space-y-1">
                          {p.sport.carmen && <div className="text-[9px] font-black text-slate-600 bg-orange-100/50 px-1 rounded">C</div>}
                          {p.sport.alberto && <div className="text-[9px] font-black text-slate-600 bg-indigo-100/50 px-1 rounded">A</div>}
                          {!p.sport.carmen && !p.sport.alberto && <span className="text-slate-200">-</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fila Comida */}
              <div className="grid grid-cols-7 border-b border-slate-50 relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-emerald-500 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10 shadow-sm">Lunch</div>
                {fullWeekDays.map((_, idx) => {
                  const p = data.weeklyPlanning[idx];
                  const hasS = data.shifts.includes(format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd'));
                  const lunch = hasS ? (p.meals.carmenLunch || 'Indiv') : (p.meals.lunch || '-');
                  return (
                    <div key={idx} onClick={() => { setSelectedDayIndex(idx); setActiveTab(AppTab.DASHBOARD); }} className={`h-28 p-1 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0 transition-colors active:bg-emerald-50 cursor-pointer ${hasS ? 'bg-emerald-50/10' : ''}`}>
                      <Utensils size={12} className="text-emerald-300 mb-1" />
                      <p className="text-[8px] font-bold text-slate-500 leading-tight overflow-hidden line-clamp-3 uppercase tracking-tighter">{lunch}</p>
                    </div>
                  );
                })}
              </div>

              {/* Fila Cena */}
              <div className="grid grid-cols-7 relative flex-1">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 py-1 px-2 bg-indigo-400 text-white text-[7px] font-black uppercase vertical-text rounded-r-lg z-10 shadow-sm">Dinner</div>
                {fullWeekDays.map((_, idx) => {
                  const p = data.weeklyPlanning[idx];
                  const hasS = data.shifts.includes(format(addDays(startOfThisWeek, idx), 'yyyy-MM-dd'));
                  const dinner = hasS ? (p.meals.carmenDinner || 'Indiv') : (p.meals.dinner || '-');
                  return (
                    <div key={idx} onClick={() => { setSelectedDayIndex(idx); setActiveTab(AppTab.DASHBOARD); }} className={`p-1 flex flex-col items-center justify-center text-center border-r border-slate-50 last:border-r-0 transition-colors active:bg-indigo-50 cursor-pointer ${hasS ? 'bg-indigo-50/10' : ''}`}>
                      <Moon size={12} className="text-indigo-300 mb-1" />
                      <p className="text-[8px] font-bold text-slate-500 leading-tight overflow-hidden line-clamp-3 uppercase tracking-tighter">{dinner}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Toca un día para ver detalles</p>
          </div>
        )}

        {activeTab === AppTab.TASKS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800">Tareas</h2>
              <button onClick={() => { setShowAddTask(true); setNewTaskTitle(''); }} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90"><Plus size={24} /></button>
            </div>
            <div className="overflow-x-auto pb-2 -mx-2 px-2 flex gap-2 no-scrollbar">
              <button onClick={() => setTaskCategoryFilter('Todas')} className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${taskCategoryFilter === 'Todas' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Todas</button>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setTaskCategoryFilter(cat.id)} className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${taskCategoryFilter === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredTasks.sort((a,b) => Number(a.completedToday) - Number(b.completedToday)).map(task => (
                <div key={task.id} onClick={() => toggleTask(task.id)} className={`flex items-center gap-4 p-5 bg-white rounded-3xl border transition-all active:scale-95 ${task.completedToday ? 'opacity-50 border-slate-100 bg-slate-50/50' : 'border-slate-100 shadow-sm'}`}>
                  <button className={task.completedToday ? 'text-emerald-500' : 'text-slate-200'}>{task.completedToday ? <CheckCircle2 size={28} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={28} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${task.completedToday ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-500'}`}>
                        {CATEGORIES.find(c => c.id === task.category)?.icon || <LayoutGrid size={16} />}
                      </div>
                      <h3 className={`font-bold truncate text-[15px] transition-all ${task.completedToday ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[8px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-black uppercase tracking-tighter">{task.frequency}</span>
                      <span className="text-[8px] px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 font-black uppercase tracking-tighter">{task.category}</span>
                      {task.lastModifiedBy && <span className="text-[8px] text-orange-400 font-black uppercase tracking-tighter italic">Por {task.lastModifiedBy}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)})); }} className="text-slate-200 hover:text-rose-500 p-2"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === AppTab.SHOPPING && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 px-2">Lista de Compra</h2>
            <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl flex justify-between items-center mb-6">
              <div><p className="text-xs font-bold text-indigo-100 uppercase mb-1">Total</p><p className="text-3xl font-black">{data.shoppingItems.reduce((acc, i) => acc + (i.price || 0), 0).toFixed(2)}€</p></div>
              <div className="text-right"><p className="text-xs font-bold text-indigo-100 uppercase mb-1">Pendiente</p><p className="text-xl font-bold">{data.shoppingItems.filter(i => !i.completed).reduce((acc, i) => acc + (i.price || 0), 0).toFixed(2)}€</p></div>
            </div>
            <ShoppingList 
              items={data.shoppingItems} 
              onToggle={(id) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed, lastModifiedBy: prev.userName} : i)}))}
              onAdd={(name, price) => setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: 'General', lastModifiedBy: prev.userName}]}))}
              onUpdateItem={(updated) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === updated.id ? updated : i)}))}
            />
          </div>
        )}

        {activeTab === AppTab.URGENT && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 px-2 flex items-center gap-3"><AlertCircle className="text-rose-500" size={28} /> Imprevistos</h2>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
              <textarea placeholder="¿Qué ha surgido?" value={urgentInput} onChange={(e) => setUrgentInput(e.target.value)} rows={3} className="w-full px-5 py-4 bg-slate-50 border-none rounded-3xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-rose-100" />
              <button onClick={() => {
                const newNote: UrgentNote = { id: Date.now().toString(), text: urgentInput, createdAt: new Date().toISOString(), isResolved: false, author: data.userName };
                setData(prev => ({ ...prev, urgentNotes: [newNote, ...prev.urgentNotes] }));
                setUrgentInput('');
              }} disabled={!urgentInput.trim()} className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg active:scale-95 disabled:opacity-50">Guardar urgente</button>
            </div>
            <div className="space-y-4">
              {data.urgentNotes.map(note => (
                <div key={note.id} className={`p-5 rounded-3xl border transition-all ${note.isResolved ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-rose-100 shadow-sm border-l-4 border-l-rose-500'}`}>
                  <div className="flex gap-4">
                    <button onClick={() => setData(prev => ({ ...prev, urgentNotes: prev.urgentNotes.map(n => n.id === note.id ? { ...n, isResolved: !n.isResolved } : n) }))} className={`flex-shrink-0 mt-1 ${note.isResolved ? 'text-emerald-500' : 'text-slate-200'}`}>
                      {note.isResolved ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={24} />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-bold text-sm leading-relaxed ${note.isResolved ? 'line-through text-slate-400' : 'text-slate-800'}`}>{note.text}</p>
                      <p className="text-[8px] text-slate-400 mt-2 font-black uppercase tracking-widest">{format(parseISO(note.createdAt), "d MMM, HH:mm")} por {note.author || 'Alberto'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === AppTab.SETTINGS && (
          <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 space-y-8">
            <h2 className="text-2xl font-black text-slate-800">Ajustes</h2>
            <div className="space-y-4">
               <button onClick={() => setShowShiftPicker(true)} className="w-full flex items-center justify-between p-5 bg-orange-50 border border-orange-100 rounded-[2rem] text-orange-700 active:scale-95">
                 <div className="flex items-center gap-3">
                   <div className="bg-orange-500 text-white p-2 rounded-xl"><CalendarDays size={20}/></div>
                   <div className="text-left"><p className="text-xs font-black uppercase tracking-widest">Guardias Carmen</p><p className="text-[10px] font-bold text-orange-400">{data.shifts.length} días marcados</p></div>
                 </div>
                 <ChevronRight size={18} />
               </button>
               <button onClick={() => setShowSyncCenter(true)} className="w-full flex items-center justify-between p-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] text-indigo-700 active:scale-95">
                 <div className="flex items-center gap-3">
                   <div className="bg-indigo-500 text-white p-2 rounded-xl"><CloudSync size={20}/></div>
                   <div className="text-left"><p className="text-xs font-black uppercase tracking-widest">Sincronización Familiar</p><p className="text-[10px] font-bold text-indigo-400">Vinculado con Carmen</p></div>
                 </div>
                 <ChevronRight size={18} />
               </button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tu Nombre</label>
              <input type="text" value={data.userName} onChange={(e) => setData(prev => ({ ...prev, userName: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" />
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center py-4 px-3 safe-bottom shadow-[0_-15px_50px_rgba(0,0,0,0.08)] z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<Home size={20} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.WEEKLY} onClick={() => setActiveTab(AppTab.WEEKLY)} icon={<CalendarRange size={20} />} label="Semana" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CalendarIcon size={20} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.URGENT} onClick={() => setActiveTab(AppTab.URGENT)} icon={<AlertCircle size={20} />} label="Urgente" isUrgentBadge={data.urgentNotes.filter(n => !n.isResolved).length > 0} />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={20} />} label="Compra" />
        <NavButton active={activeTab === AppTab.SETTINGS} onClick={() => setActiveTab(AppTab.SETTINGS)} icon={<Settings size={20} />} label="Ajustes" />
      </nav>

      {showSyncCenter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Users className="text-indigo-600" /> Familia: Carmen & Alberto</h3>
              <button onClick={() => setShowSyncCenter(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] text-center space-y-4 mb-8">
              <p className="text-[10px] font-black uppercase text-indigo-400">Código de tu Hogar</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-3xl font-black text-indigo-700 tracking-tighter">{data.familyCode}</span>
                <button onClick={copyFamilyCode} className={`p-2 rounded-xl transition-all ${copiedCode ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 shadow-sm'}`}>
                  {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-[10px] font-bold text-indigo-300">Comparte este código con Carmen para sincronizar</p>
            </div>
            <button onClick={handleSync} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3">
              <RefreshCw className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Sincronizando...' : 'Forzar Actualización'}
            </button>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-6">Nueva Tarea</h3>
            <div className="space-y-6">
              <input type="text" autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="¿Qué hay que hacer?" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setNewTaskCategory(cat.id)} className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${newTaskCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'weekly', 'monthly', 'periodic'] as Frequency[]).map(f => (
                  <button key={f} onClick={() => setNewTaskFreq(f)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newTaskFreq === f ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{f}</button>
                ))}
              </div>
              <button onClick={() => {
                const newTask: Task = { id: Date.now().toString(), title: newTaskTitle, category: newTaskCategory, frequency: newTaskFreq, nextDueDate: calculateNextDueDate(newTaskFreq, undefined, newTaskInterval), completedToday: false, isRepetitive: true, lastModifiedBy: data.userName };
                setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
                setShowAddTask(false);
              }} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 disabled:opacity-50" disabled={!newTaskTitle.trim()}>Crear Tarea</button>
            </div>
          </div>
        </div>
      )}

      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
              {editPlanningType === 'sport' ? <Dumbbell className="text-orange-500" /> : <Utensils className="text-emerald-500" />}
              Editar {editPlanningType === 'sport' ? 'Deporte' : 'Menú'} {fullWeekDays[selectedDayIndex]}
            </h3>
            <div className="space-y-6">
              {editPlanningType === 'sport' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carmen {isShiftDay && '(Guardia)'}</label>
                    <input disabled={isShiftDay} type="text" value={data.weeklyPlanning[selectedDayIndex].sport.carmen} onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, carmen: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none disabled:opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alberto</label>
                    <input type="text" value={data.weeklyPlanning[selectedDayIndex].sport.alberto} onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, alberto: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comida {isShiftDay && '(Carmen en Guardia)'}</label>
                    <input type="text" value={isShiftDay ? (data.weeklyPlanning[selectedDayIndex].meals.carmenLunch || '') : (data.weeklyPlanning[selectedDayIndex].meals.lunch || '')} onChange={(e) => isShiftDay ? updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenLunch: e.target.value } }) : updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, lunch: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cena</label>
                    <input type="text" value={isShiftDay ? (data.weeklyPlanning[selectedDayIndex].meals.carmenDinner || '') : (data.weeklyPlanning[selectedDayIndex].meals.dinner || '')} onChange={(e) => isShiftDay ? updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, carmenDinner: e.target.value } }) : updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, dinner: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none" />
                  </div>
                </>
              )}
              <button onClick={() => setShowEditPlanning(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl mt-4 active:scale-95">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {showShiftPicker && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
           <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
             <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Guardias de Carmen</h3><button onClick={() => setShowShiftPicker(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button></div>
             <div className="grid grid-cols-7 gap-2 mb-8">
               {['L','M','X','J','V','S','D'].map(d => (<div key={d} className="text-center text-[10px] font-black text-slate-300 mb-2">{d}</div>))}
               {eachDayOfInterval({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }).map((day, idx) => {
                 const dateStr = format(day, 'yyyy-MM-dd');
                 const isSelected = data.shifts.includes(dateStr);
                 const startDayIdx = (startOfMonth(new Date()).getDay() + 6) % 7;
                 return (
                   <button key={dateStr} style={idx === 0 ? { gridColumnStart: startDayIdx + 1 } : {}} onClick={() => toggleShift(dateStr)} className={`h-11 rounded-xl font-bold text-xs transition-all ${isSelected ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{format(day, 'd')}</button>
                 );
               })}
             </div>
             <button onClick={() => setShowShiftPicker(false)} className="w-full py-5 bg-orange-500 text-white font-black rounded-2xl shadow-xl active:scale-95">Confirmar Guardias</button>
           </div>
         </div>
      )}
    </div>
  );
};

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price?: number) => void, onUpdateItem: (item: ShoppingItem) => void }> = ({ items, onToggle, onAdd, onUpdateItem }) => {
  const [n, setN] = useState(''); 
  const [p, setP] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);

  const handleAdd = async () => {
    if (!n.trim()) return;
    let finalPrice = parseFloat(p);
    if (isNaN(finalPrice)) {
      setIsEstimating(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Estima el precio medio en euros (€) de "${n.trim()}" en un supermercado estándar en España. Devuelve SOLO el número con decimales.`,
        });
        const estimated = parseFloat(response.text.trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(estimated)) finalPrice = estimated;
      } catch (e) {
        console.error(e);
      } finally {
        setIsEstimating(false);
      }
    }
    onAdd(n, finalPrice || 0);
    setN('');
    setP('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="relative">
          <input type="text" placeholder="¿Qué necesitas?" value={n} onChange={(e) => setN(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold pr-12 focus:ring-2 focus:ring-indigo-100 outline-none" />
          {isEstimating && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />}
        </div>
        <div className="flex gap-2">
          <input type="number" placeholder="Precio (opcional)" value={p} onChange={(e) => setP(e.target.value)} className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" />
          <button onClick={handleAdd} disabled={!n.trim() || isEstimating} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 disabled:opacity-50 min-w-[56px] flex items-center justify-center">
            {isEstimating ? <RefreshCw className="animate-spin" /> : <Plus size={24} />}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {items.sort((a,b) => Number(a.completed) - Number(b.completed)).map(item => (
          <div key={item.id} className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${item.completed ? 'bg-emerald-50/30 border-emerald-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}>
            <button onClick={() => onToggle(item.id)} className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>
              {item.completed ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={24} />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`font-bold text-sm block truncate ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.name}</span>
              {item.lastModifiedBy && <span className="text-[8px] font-black uppercase text-indigo-300">Añadido por {item.lastModifiedBy}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">{item.price?.toFixed(2)}€</span>
              <button onClick={() => onUpdateItem({...item, completed: false})} className="p-2 text-slate-200 hover:text-rose-500"><Trash2 size={16}/></button>
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

export default App;
