
import React, { useState, useEffect } from 'react';
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
  ChevronLeft
} from 'lucide-react';
import { AppData, Task, ShoppingItem, AppTab, Frequency, DayPlanning, UrgentNote } from './types';
import { calculateNextDueDate } from './utils/dateUtils';
import { parseISO, isBefore, startOfDay, format, addDays, addMinutes, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

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
  userName: "Familia",
  laundry: { isActive: false, reminderSent: false, durationMinutes: 90 },
  weeklyPlanning: INITIAL_PLANNING,
  urgentNotes: [],
  tasks: [
    { id: '1', title: 'Dinero para Pilar (Viernes)', category: 'Limpieza', frequency: 'weekly', specificDay: 5, nextDueDate: calculateNextDueDate('weekly', undefined, undefined, 5), completedToday: false },
    { id: '2', title: 'Cambiar arenero de las gatas', category: 'Mascotas', frequency: 'periodic', intervalDays: 5, lastCompletedAt: new Date().toISOString(), nextDueDate: calculateNextDueDate('periodic', new Date().toISOString(), 5), completedToday: false },
    { id: '3', title: 'Cambiar sábanas', category: 'Dormitorio', frequency: 'weekly', intervalDays: 7, nextDueDate: calculateNextDueDate('weekly', undefined), completedToday: false },
    { id: '4', title: 'Cambiar albornoces', category: 'Baño', frequency: 'periodic', intervalDays: 10, nextDueDate: calculateNextDueDate('periodic', undefined, 10), completedToday: false }
  ],
  shoppingItems: [
    { id: 's1', name: 'Leche', completed: false, category: 'Alimentación', price: 1.20 },
    { id: 's2', name: 'Arena gatos', completed: false, category: 'Mascotas', price: 8.50 }
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
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [editPlanningType, setEditPlanningType] = useState<'sport' | 'meals'>('sport');
  const [urgentInput, setUrgentInput] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>('daily');
  const [newTaskInterval, setNewTaskInterval] = useState(1);

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
        nextDueDate: !t.completedToday ? calculateNextDueDate(t.frequency, new Date().toISOString(), t.intervalDays, t.specificDay) : t.nextDueDate
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

  const addUrgentNote = () => {
    if (!urgentInput.trim()) return;
    const newNote: UrgentNote = {
      id: Date.now().toString(),
      text: urgentInput,
      createdAt: new Date().toISOString(),
      isResolved: false
    };
    setData(prev => ({ ...prev, urgentNotes: [newNote, ...prev.urgentNotes] }));
    setUrgentInput('');
  };

  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-28">
      {/* HEADER TIPO APP NATIVA */}
      <header className="bg-white px-6 pt-12 pb-6 shadow-sm rounded-b-[2.5rem] sticky top-0 z-40 border-b border-slate-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
              {format(today, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">HogarPro</h1>
          </div>
          <button 
            onClick={() => setActiveTab(AppTab.SETTINGS)}
            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl active:scale-95 transition-transform"
          >
            <Sparkles size={24} />
          </button>
        </div>

        {activeTab === AppTab.DASHBOARD && !showWeeklySummary && (
          <div className="flex justify-between mt-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {weekDaysShort.map((day, idx) => {
              const isActive = selectedDayIndex === idx;
              const dayDate = addDays(startOfThisWeek, idx);
              const isTodayDate = format(dayDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all active:scale-90 ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 
                    isTodayDate ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold mb-1">{day}</span>
                  <span className="text-sm font-black">{format(dayDate, 'd')}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {activeTab === AppTab.DASHBOARD && (
          <>
            {data.urgentNotes.filter(n => !n.isResolved).length > 0 && (
              <div 
                onClick={() => setActiveTab(AppTab.URGENT)}
                className="bg-rose-500 text-white p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-rose-200 animate-pulse cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} />
                  <span className="font-bold text-sm">¡Hay imprevistos urgentes!</span>
                </div>
                <ChevronRight size={18} />
              </div>
            )}

            {!showWeeklySummary ? (
              <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <CalendarIcon size={20} className="text-indigo-600" />
                    Planning {fullWeekDays[selectedDayIndex]}
                  </h2>
                  <button 
                    onClick={() => setShowWeeklySummary(true)}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider active:bg-slate-200"
                  >
                    <LayoutGrid size={14} /> Vista Total
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div onClick={() => { setEditPlanningType('sport'); setShowEditPlanning(true); }} className="bg-orange-50/50 border border-orange-100 p-4 rounded-3xl active:bg-orange-50 cursor-pointer">
                    <div className="flex items-center gap-2 text-orange-600 mb-3"><Dumbbell size={18} /><span className="text-xs font-bold uppercase">Deporte</span></div>
                    <div className="space-y-2">
                      <div><p className="text-[9px] text-orange-400 font-bold uppercase tracking-tighter">Carmen</p><p className="text-sm font-bold text-slate-700 truncate">{data.weeklyPlanning[selectedDayIndex]?.sport.carmen || '---'}</p></div>
                      <div><p className="text-[9px] text-orange-400 font-bold uppercase tracking-tighter">Alberto</p><p className="text-sm font-bold text-slate-700 truncate">{data.weeklyPlanning[selectedDayIndex]?.sport.alberto || '---'}</p></div>
                    </div>
                  </div>
                  <div onClick={() => { setEditPlanningType('meals'); setShowEditPlanning(true); }} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl active:bg-emerald-50 cursor-pointer">
                    <div className="flex items-center gap-2 text-emerald-600 mb-3"><Utensils size={18} /><span className="text-xs font-bold uppercase">Menú</span></div>
                    <div className="space-y-2">
                      <div><p className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">Comida</p><p className="text-sm font-bold text-slate-700 truncate">{data.weeklyPlanning[selectedDayIndex]?.meals.lunch || '---'}</p></div>
                      <div><p className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">Cena</p><p className="text-sm font-bold text-slate-700 truncate">{data.weeklyPlanning[selectedDayIndex]?.meals.dinner || '---'}</p></div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 space-y-4 animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-2">
                  <button onClick={() => setShowWeeklySummary(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><ChevronLeft /></button>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Planning Semanal</h2>
                  <div className="w-8"></div>
                </div>
                <div className="space-y-3">
                  {fullWeekDays.map((dayName, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest mb-2 border-b border-indigo-100 pb-1">{dayName}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-[10px]">
                          <p className="font-bold text-slate-400 uppercase">Deporte</p>
                          <p className="text-slate-700">C: <span className="font-bold">{data.weeklyPlanning[idx]?.sport.carmen || '-'}</span></p>
                          <p className="text-slate-700">A: <span className="font-bold">{data.weeklyPlanning[idx]?.sport.alberto || '-'}</span></p>
                        </div>
                        <div className="text-[10px]">
                          <p className="font-bold text-slate-400 uppercase">Menú</p>
                          <p className="text-slate-700">Com: <span className="font-bold">{data.weeklyPlanning[idx]?.meals.lunch || '-'}</span></p>
                          <p className="text-slate-700">Cen: <span className="font-bold">{data.weeklyPlanning[idx]?.meals.dinner || '-'}</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowWeeklySummary(false)} className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl mt-4 active:scale-95 transition-transform">Cerrar</button>
              </section>
            )}

            <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${data.laundry.isActive ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    <Waves size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-none mb-1">Lavandería</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-black">Estado colada</p>
                  </div>
                </div>
                {!data.laundry.isActive ? (
                  <button onClick={() => setData(prev => ({ ...prev, laundry: { ...prev.laundry, isActive: true, startTime: new Date().toISOString() } }))} className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl active:scale-95">Iniciar</button>
                ) : (
                  <button onClick={() => setData(prev => ({ ...prev, laundry: { ...prev.laundry, isActive: false, startTime: undefined } }))} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl flex items-center gap-1 active:scale-95"><Sun size={14} /> Tender</button>
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === AppTab.URGENT && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 px-2 flex items-center gap-3">
              <AlertCircle className="text-rose-500" size={28} />
              Imprevistos
            </h2>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
              <textarea placeholder="¿Qué ha surgido?" value={urgentInput} onChange={(e) => setUrgentInput(e.target.value)} rows={3} className="w-full px-5 py-4 bg-slate-50 border-none rounded-3xl focus:ring-2 focus:ring-rose-500 font-medium text-slate-700" />
              <button onClick={addUrgentNote} disabled={!urgentInput.trim()} className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg active:scale-95 disabled:opacity-50">Guardar urgente</button>
            </div>
            <div className="space-y-4">
              {data.urgentNotes.length === 0 ? (
                <div className="text-center py-12"><div className="bg-emerald-50 text-emerald-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div><p className="text-slate-400 font-bold">¡Todo bajo control!</p></div>
              ) : (
                data.urgentNotes.map(note => (
                  <div key={note.id} className={`p-5 rounded-3xl border transition-all relative ${note.isResolved ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-rose-100 shadow-sm border-l-4 border-l-rose-500'}`}>
                    <div className="flex gap-4">
                      <button onClick={() => setData(prev => ({ ...prev, urgentNotes: prev.urgentNotes.map(n => n.id === note.id ? { ...n, isResolved: !n.isResolved } : n) }))} className={`flex-shrink-0 mt-1 ${note.isResolved ? 'text-emerald-500' : 'text-slate-200'}`}>{note.isResolved ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={24} />}</button>
                      <div className="flex-1">
                        <p className={`font-bold text-sm leading-relaxed ${note.isResolved ? 'line-through text-slate-400' : 'text-slate-800'}`}>{note.text}</p>
                        <p className="text-[9px] text-slate-400 mt-2 font-black uppercase tracking-widest">{format(parseISO(note.createdAt), "d MMM, HH:mm")}</p>
                      </div>
                      <button onClick={() => setData(prev => ({ ...prev, urgentNotes: prev.urgentNotes.filter(n => n.id !== note.id) }))} className="text-slate-200 hover:text-rose-500"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.TASKS && (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-800">Tareas</h2>
              <button onClick={() => setShowAddTask(true)} className="p-3 bg-indigo-600 text-white rounded-2xl active:scale-90"><Plus size={24} /></button>
            </div>
            <div className="space-y-3">
              {data.tasks.sort((a, b) => {
                if (a.completedToday !== b.completedToday) return a.completedToday ? 1 : -1;
                return parseISO(a.nextDueDate).getTime() - parseISO(b.nextDueDate).getTime();
              }).map(task => (
                <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)}))} showDetails />
              ))}
            </div>
          </div>
        )}

        {activeTab === AppTab.SHOPPING && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 px-2">Compra</h2>
            <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl shadow-indigo-100 flex justify-between items-center mb-6">
              <div><p className="text-xs font-bold text-indigo-100 uppercase mb-1">Total</p><p className="text-3xl font-black">{data.shoppingItems.reduce((acc, i) => acc + (i.price || 0), 0).toFixed(2)}€</p></div>
              <div className="text-right"><p className="text-xs font-bold text-indigo-100 uppercase mb-1">Falta</p><p className="text-xl font-bold">{data.shoppingItems.filter(i => !i.completed).reduce((acc, i) => acc + (i.price || 0), 0).toFixed(2)}€</p></div>
            </div>
            <ShoppingList 
              items={data.shoppingItems} 
              onToggle={(id) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed} : i)}))}
              onAdd={(name, price) => setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: 'Gral'}]}))}
            />
          </div>
        )}

        {activeTab === AppTab.SETTINGS && (
          <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 space-y-6">
            <h2 className="text-2xl font-black text-slate-800">Ajustes</h2>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Familiar</label>
              <input type="text" value={data.userName} onChange={(e) => setData(prev => ({ ...prev, userName: e.target.value }))} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" />
            </div>
            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">HogarPro Play Store Edition</p>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center py-4 px-3 safe-bottom shadow-[0_-15px_50px_rgba(0,0,0,0.08)] z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => { setActiveTab(AppTab.DASHBOARD); setShowWeeklySummary(false); }} icon={<Home size={20} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CalendarIcon size={20} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.URGENT} onClick={() => setActiveTab(AppTab.URGENT)} icon={<AlertCircle size={20} />} label="Urgente" isUrgentBadge={data.urgentNotes.filter(n => !n.isResolved).length > 0} />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={20} />} label="Compra" />
        <NavButton active={activeTab === AppTab.SETTINGS} onClick={() => setActiveTab(AppTab.SETTINGS)} icon={<Settings size={20} />} label="Ajustes" />
      </nav>

      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
              {editPlanningType === 'sport' ? <Dumbbell className="text-orange-500" /> : <Utensils className="text-emerald-500" />}
              Editar {editPlanningType === 'sport' ? 'Deporte' : 'Menú'} {weekDaysShort[selectedDayIndex]}
            </h3>
            <div className="space-y-6">
              {editPlanningType === 'sport' ? (
                <>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carmen</label><input type="text" value={data.weeklyPlanning[selectedDayIndex].sport.carmen} onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, carmen: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alberto</label><input type="text" value={data.weeklyPlanning[selectedDayIndex].sport.alberto} onChange={(e) => updatePlanning({ sport: { ...data.weeklyPlanning[selectedDayIndex].sport, alberto: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /></div>
                </>
              ) : (
                <>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comida</label><input type="text" value={data.weeklyPlanning[selectedDayIndex].meals.lunch} onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, lunch: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cena</label><input type="text" value={data.weeklyPlanning[selectedDayIndex].meals.dinner} onChange={(e) => updatePlanning({ meals: { ...data.weeklyPlanning[selectedDayIndex].meals, dinner: e.target.value } })} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /></div>
                </>
              )}
              <button onClick={() => setShowEditPlanning(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl mt-4 active:scale-95 transition-transform">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-6">Nueva Tarea</h3>
            <div className="space-y-6">
              <input type="text" autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="¿Qué hay que hacer?" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" />
              <div className="grid grid-cols-2 gap-2">
                {(['daily', 'weekly', 'monthly', 'periodic'] as Frequency[]).map(f => (
                  <button key={f} onClick={() => setNewTaskFreq(f)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${newTaskFreq === f ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    {f === 'daily' ? 'Diaria' : f === 'weekly' ? 'Semanal' : f === 'monthly' ? 'Mensual' : 'X Días'}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 pt-2">
                <button onClick={() => setShowAddTask(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl">Cerrar</button>
                <button onClick={() => {
                   const newTask: Task = { id: Date.now().toString(), title: newTaskTitle, category: 'General', frequency: newTaskFreq, intervalDays: newTaskFreq === 'periodic' ? newTaskInterval : undefined, nextDueDate: calculateNextDueDate(newTaskFreq, undefined, newTaskInterval), completedToday: false };
                   setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
                   setNewTaskTitle(''); setShowAddTask(false);
                }} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95">Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TaskItem: React.FC<{ task: Task; onToggle: () => void; onDelete?: () => void; showDetails?: boolean }> = ({ task, onToggle, onDelete, showDetails }) => {
  const isOverdue = isBefore(parseISO(task.nextDueDate), startOfDay(new Date())) && !task.completedToday;
  return (
    <div className={`flex items-center gap-4 p-5 bg-white rounded-3xl border transition-all active:scale-95 ${task.completedToday ? 'opacity-50 border-slate-100 bg-slate-50/50' : 'border-slate-100 shadow-sm'}`}>
      <button onClick={onToggle} className={`flex-shrink-0 ${task.completedToday ? 'text-emerald-500' : 'text-slate-200'}`}>{task.completedToday ? <CheckCircle2 size={28} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={28} />}</button>
      <div className="flex-1 min-w-0" onClick={onToggle}>
        <h3 className={`font-bold truncate text-sm ${task.completedToday ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 font-black uppercase">{task.frequency}</span>
          {showDetails && <span className={`text-[9px] font-black uppercase ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}><Clock size={10} className="inline mr-1" /> {format(parseISO(task.nextDueDate), 'd MMM')}</span>}
        </div>
      </div>
      {onDelete && <button onClick={onDelete} className="text-slate-200 hover:text-rose-500"><Trash2 size={18} /></button>}
    </div>
  );
};

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price?: number) => void }> = ({ items, onToggle, onAdd }) => {
  const [n, setN] = useState(''); const [p, setP] = useState('');
  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4"><input type="text" placeholder="Producto" value={n} onChange={(e) => setN(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /><div className="flex gap-2"><input type="number" placeholder="€" value={p} onChange={(e) => setP(e.target.value)} className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold" /><button onClick={() => { onAdd(n, parseFloat(p)); setN(''); setP(''); }} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90" disabled={!n}><Plus size={24} /></button></div></div>
      <div className="space-y-3">{items.sort((a,b) => Number(a.completed) - Number(b.completed)).map(item => (<div key={item.id} onClick={() => onToggle(item.id)} className={`flex items-center gap-4 p-5 rounded-3xl border transition-all active:scale-95 ${item.completed ? 'bg-emerald-50/30 border-emerald-100 opacity-60' : 'bg-white border-slate-100 shadow-sm'}`}><div className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>{item.completed ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-emerald-500 rounded-full" /> : <Circle size={24} />}</div><span className={`flex-1 font-bold text-sm ${item.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.name}</span>{item.price ? <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl">{item.price.toFixed(2)}€</span> : null}</div>))}</div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string, isUrgentBadge?: boolean }> = ({ active, onClick, icon, label, isUrgentBadge }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${active ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><div className={`p-2 rounded-xl transition-colors ${active ? 'bg-indigo-50' : ''}`}>{icon}{isUrgentBadge && (<span className="absolute top-1 right-1 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>)}</div><span className="text-[8px] font-black uppercase tracking-widest">{label}</span></button>
);

export default App;
