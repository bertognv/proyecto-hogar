
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
  Timer,
  Smartphone,
  Bell,
  CheckCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
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
        if (!parsed.urgentNotes) parsed.urgentNotes = [];
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditPlanning, setShowEditPlanning] = useState(false);
  const [showShiftCalendar, setShowShiftCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const laundryTimeRemaining = useMemo(() => {
    if (!data.laundry.isActive || !data.laundry.startTime) return 0;
    const start = parseISO(data.laundry.startTime);
    const elapsed = differenceInMinutes(new Date(), start);
    return Math.max(0, data.laundry.durationMinutes - elapsed);
  }, [data.laundry, today]);

  useEffect(() => {
    if (data.laundry.isActive && laundryTimeRemaining === 0 && !data.laundry.reminderSent) {
      const laundryNoteId = 'laundry-urgent-note';
      const exists = data.urgentNotes.some(n => n.id === laundryNoteId);
      
      if (!exists) {
        const laundryNote: UrgentNote = {
          id: laundryNoteId,
          text: "Tender la ropa 🧺",
          createdAt: new Date().toISOString(),
          isResolved: false,
          author: "Sistema"
        };
        
        setData(prev => ({
          ...prev,
          urgentNotes: [laundryNote, ...prev.urgentNotes],
          laundry: { ...prev.laundry, reminderSent: true }
        }));
        
        logActivity('Ciclo de lavadora finalizado. Pendiente de tender.');
      }
    }
  }, [laundryTimeRemaining, data.laundry.isActive, data.laundry.reminderSent]);

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return data.tasks;
    return data.tasks.filter(t => t.category === taskFilter);
  }, [data.tasks, taskFilter]);

  const shoppingTotal = useMemo(() => {
    return data.shoppingItems.reduce((acc, item) => acc + (item.price || 0), 0);
  }, [data.shoppingItems]);

  useEffect(() => {
    localStorage.setItem('gnm_hogar_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 800);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const logActivity = (action: string) => {
    const newActivity: FamilyActivity = {
      id: Math.random().toString(36).substring(2, 9),
      user: data.userName,
      action: action,
      timestamp: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      familyActivity: [newActivity, ...prev.familyActivity].slice(0, 50)
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
    showToast(isNowShift ? 'Guardia añadida' : 'Guardia eliminada');
  };

  const handleSaveTask = () => {
    if (!newTaskTitle.trim()) return;
    
    if (editingTask) {
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === editingTask.id ? {
          ...t,
          title: newTaskTitle,
          category: newTaskCategory,
          frequency: newTaskFreq,
          lastModifiedBy: prev.userName
        } : t)
      }));
      logActivity(`ha editado la tarea: ${newTaskTitle}`);
      showToast('Tarea actualizada correctamente');
    } else {
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
      showToast('Tarea guardada correctamente');
    }
    
    setNewTaskTitle('');
    setEditingTask(null);
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
    showToast('Lavadora iniciada (90 min)');
  };

  const stopLaundry = () => {
    setData(prev => ({
      ...prev,
      laundry: { ...prev.laundry, isActive: false, startTime: undefined, reminderSent: false }
    }));
    setData(prev => ({
      ...prev,
      urgentNotes: prev.urgentNotes.filter(n => n.id !== 'laundry-urgent-note')
    }));
    logActivity('ha finalizado la gestión de la colada');
    showToast('Lavadora detenida');
  };

  const handleResolveUrgentNote = (id: string) => {
    if (id === 'laundry-urgent-note') {
      stopLaundry();
      logActivity('ha tendido la ropa');
      showToast('¡Ropa tendida!');
    } else {
      setData(prev => ({
        ...prev,
        urgentNotes: prev.urgentNotes.filter(n => n.id !== id)
      }));
      showToast('Nota resuelta');
    }
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
    logActivity(`ha añadido ${newInvName} al almacén`);
    showToast('Producto añadido al almacén');
    resetInvForm();
    setShowAddInventory(false);
  };

  const handleUpdateInventory = () => {
    if (!selectedInventoryItem || !newInvName.trim()) return;
    setData(prev => ({
      ...prev,
      inventoryItems: prev.inventoryItems.map(item => item.id === selectedInventoryItem.id ? {
        ...item,
        name: newInvName,
        category: newInvCategory,
        quantity: newInvQty,
        unit: newInvUnit,
        comments: newInvComment,
        image: newInvImage || item.image,
        lastUpdatedBy: prev.userName,
        lastUpdatedAt: new Date().toISOString()
      } : item)
    }));
    logActivity(`ha actualizado los detalles de ${newInvName}`);
    showToast('Stock actualizado correctamente');
    setSelectedInventoryItem(null);
    setShowAddInventory(false);
  };

  const updateInvQty = (id: string, delta: number) => {
    let itemName = "";
    setData(prev => {
      const itemToUpdate = prev.inventoryItems.find(i => i.id === id);
      if (!itemToUpdate) return prev;
      itemName = itemToUpdate.name;
      const newQty = Math.max(0, itemToUpdate.quantity + delta);
      return {
        ...prev,
        inventoryItems: prev.inventoryItems.map(item => 
          item.id === id ? { ...item, quantity: newQty, lastUpdatedBy: prev.userName, lastUpdatedAt: new Date().toISOString() } : item
        )
      };
    });
    showToast(`${delta > 0 ? '+1' : '-1'} ${itemName}`);
  };

  const deleteInventoryItem = (id: string) => {
    const item = data.inventoryItems.find(i => i.id === id);
    setData(prev => ({ ...prev, inventoryItems: prev.inventoryItems.filter(i => i.id !== id) }));
    if (item) logActivity(`ha eliminado ${item.name} del almacén`);
    showToast('Producto eliminado');
    setSelectedInventoryItem(null);
    setShowAddInventory(false);
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

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskFreq(task.frequency);
    setNewTaskCategory(task.category);
    setShowAddTask(true);
  };

  const openEditInventory = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setNewInvName(item.name);
    setNewInvCategory(item.category);
    setNewInvQty(item.quantity);
    setNewInvUnit(item.unit);
    setNewInvComment(item.comments || '');
    setNewInvImage(item.image);
    setShowAddInventory(true);
  };

  const toggleUser = () => {
    const newUser = data.userName === 'Alberto' ? 'Carmen' : 'Alberto';
    setData(prev => ({ ...prev, userName: newUser }));
    showToast(`Perfil de ${newUser}`);
  };

  const weekDaysShort = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const fullWeekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const currentSelectedPlanning = data.weeklyPlanning[selectedDayIndex] || { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } };
  const currentSelectedIsShift = data.shifts.includes(format(addDays(startOfThisWeek, selectedDayIndex), 'yyyy-MM-dd'));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative pb-32">
      {/* TOAST NOTIFICATION */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 transform ${toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0 pointer-events-none'}`}>
         <div className="bg-slate-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 border border-white/10">
            <Bell size={18} className="text-indigo-400" />
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
         </div>
      </div>

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
            {/* BANNER DE GUARDIA PERSISTENTE */}
            {currentSelectedIsShift && (
              <section className="bg-orange-50 border border-orange-100 rounded-[2.5rem] p-6 flex items-center gap-5 shadow-sm animate-in zoom-in-95 duration-500">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-100">
                   <Stethoscope size={28} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-orange-900 leading-tight">Guardia de Carmen 🏥</h3>
                   <p className="text-[11px] font-medium text-orange-700/80 mt-1">El horario de comidas y deporte se ha ajustado para hoy.</p>
                </div>
              </section>
            )}

            {data.urgentNotes.length > 0 && (
              <section className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-2 px-2">
                   <AlertCircle size={16} className="text-rose-500" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Imprevistos y Avisos</h3>
                </div>
                {data.urgentNotes.map(note => (
                  <div key={note.id} className="bg-rose-50 border border-rose-100 rounded-[2rem] p-5 flex items-center justify-between shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm"><Zap size={24} /></div>
                        <div>
                           <p className="text-sm font-black text-rose-900">{note.text}</p>
                           <p className="text-[9px] font-bold text-rose-400 uppercase">Aviso generado por {note.author}</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleResolveUrgentNote(note.id)} 
                        className="px-5 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-90 transition-transform shadow-md"
                      >
                        {note.id === 'laundry-urgent-note' ? 'Tender' : 'Cerrar'}
                     </button>
                  </div>
                ))}
              </section>
            )}

            {deferredPrompt && (
              <section className="bg-indigo-100 border border-indigo-200 rounded-[2rem] p-5 flex items-center justify-between animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm"><Smartphone size={24} /></div>
                  <div>
                    <p className="text-xs font-black text-indigo-900">App para el móvil</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Instala Hogar GNM en tu inicio</p>
                  </div>
                </div>
                <button onClick={handleInstallClick} className="p-3 bg-indigo-600 text-white rounded-xl shadow-md active:scale-90 transition-transform"><Download size={20} /></button>
              </section>
            )}

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

            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Waves size={20} className="text-blue-500" /> Lavadora</h2>
                {data.laundry.isActive && <span className="text-[9px] font-black text-blue-500 animate-pulse uppercase">En proceso...</span>}
              </div>
              
              {!data.laundry.isActive ? (
                <button onClick={startLaundry} className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-3xl active:scale-95 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white"><Clock size={18} /></div>
                    <div className="text-left">
                      <p className="text-sm font-black text-blue-800">Poner Lavadora</p>
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Duración: 90 min</p>
                    </div>
                  </div>
                  <Plus size={20} className="text-blue-600" />
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-xs font-black text-slate-800">Colada por {data.laundry.startedBy}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Faltan aprox. {laundryTimeRemaining} min</p>
                     </div>
                     <button onClick={stopLaundry} className="p-2 bg-rose-50 text-rose-500 rounded-xl active:scale-90"><Trash2 size={16} /></button>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.max(5, 100 - (laundryTimeRemaining / 90 * 100))}%` }}
                    ></div>
                  </div>
                  {laundryTimeRemaining === 0 && (
                    <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 text-emerald-600 border border-emerald-100 animate-bounce mt-2 shadow-sm">
                       <CheckCircle2 size={24} />
                       <span className="text-xs font-black uppercase">¡Lavadora terminada! Tender ropa.</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === AppTab.WEEKLY && (
          <div className="px-2 space-y-6 animate-in fade-in duration-500 pb-10">
             <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Planning Semanal <CalendarRange className="text-indigo-600" /></h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de menús y deporte</p>
             </div>
             <div className="space-y-4">
                {fullWeekDays.map((dayName, idx) => {
                  const dayPlanning = data.weeklyPlanning[idx] || { sport: { carmen: '', alberto: '' }, meals: { lunch: '', dinner: '' } };
                  const dayDate = addDays(startOfThisWeek, idx);
                  const isDayShift = data.shifts.includes(format(dayDate, 'yyyy-MM-dd'));
                  
                  return (
                    <div key={idx} onClick={() => { setSelectedDayIndex(idx); setShowEditPlanning(true); }} className={`bg-white rounded-[2rem] border transition-all active:scale-[0.98] ${isDayShift ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'} shadow-sm p-5 space-y-4 cursor-pointer hover:shadow-md`}>
                       <div className="flex justify-between items-center">
                          <h4 className={`text-sm font-black uppercase tracking-wider ${isDayShift ? 'text-orange-600' : 'text-slate-800'}`}>{dayName} {format(dayDate, 'd')}</h4>
                          {isDayShift && <div className="bg-orange-500 text-white p-1.5 rounded-lg shadow-sm shadow-orange-100"><Stethoscope size={14} /></div>}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-emerald-500"><Utensils size={14} /><span className="text-[9px] font-black uppercase">Menú</span></div>
                             <div className="text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 min-h-[40px] flex flex-col justify-center">
                                <p className="truncate line-clamp-1"><Sun size={8} className="inline mr-1 opacity-50" /> {dayPlanning.meals?.lunch || '-'}</p>
                                <p className="truncate line-clamp-1"><Moon size={8} className="inline mr-1 opacity-50" /> {dayPlanning.meals?.dinner || '-'}</p>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 text-orange-500"><Dumbbell size={14} /><span className="text-[9px] font-black uppercase">Deporte</span></div>
                             <div className="text-[10px] font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 min-h-[40px] flex flex-col justify-center">
                                <p className="truncate line-clamp-1 text-rose-500"><User size={8} className="inline mr-1 opacity-50" /> C: {isDayShift ? 'Guardia' : (dayPlanning.sport?.carmen || '-')}</p>
                                <p className="truncate line-clamp-1 text-indigo-500"><User size={8} className="inline mr-1 opacity-50" /> A: {dayPlanning.sport?.alberto || '-'}</p>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hogar GNM</p>
              </div>
              <button onClick={() => { setEditingTask(null); resetInvForm(); setShowAddTask(true); }} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Plus size={24} />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
               <button onClick={() => setTaskFilter('all')} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${taskFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>Todas</button>
               {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setTaskFilter(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${taskFilter === cat.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>
                    {cat.icon} {cat.label}
                  </button>
               ))}
            </div>

            <div className="space-y-4">
              {filteredTasks.length > 0 ? filteredTasks.map(task => {
                const category = CATEGORIES.find(c => c.id === task.category);
                return (
                  <div key={task.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group transition-all active:bg-slate-50">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${category?.color || 'bg-slate-100 text-slate-400'}`}>
                      {category?.icon || <LayoutGrid size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-black uppercase text-indigo-400/80">{task.frequency === 'daily' ? 'Diario' : 'Semanal'}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{task.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => openEditTask(task)} className="p-3 bg-slate-50 text-slate-400 rounded-xl active:text-indigo-600 active:bg-indigo-50"><Edit2 size={18} /></button>
                        <button onClick={() => { setData(prev => ({...prev, tasks: prev.tasks.filter(t => t.id !== task.id)})); logActivity(`ha borrado la tarea: ${task.title}`); showToast('Tarea eliminada'); }} className="p-3 bg-slate-50 text-slate-300 rounded-xl active:text-rose-600 active:bg-rose-50"><Trash2 size={18} /></button>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-20 text-center text-slate-300">No hay tareas aquí</div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.INVENTORY && (
          <div className="px-2 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">Almacén <Package className="text-amber-500" /></h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stock familiar</p>
              </div>
              <button onClick={() => { setSelectedInventoryItem(null); resetInvForm(); setShowAddInventory(true); }} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
                <Plus size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {data.inventoryItems.length > 0 ? data.inventoryItems.map(item => (
                <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col active:shadow-md transition-all">
                   <div onClick={() => openEditInventory(item)} className="aspect-square bg-slate-50 relative overflow-hidden group">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
                      <div onClick={() => openEditInventory(item)}>
                        <h4 className="font-black text-slate-800 text-sm truncate">{item.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.quantity} {item.unit}</p>
                      </div>
                      <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-1 shadow-inner border border-slate-100">
                         <button 
                            onClick={(e) => { e.stopPropagation(); updateInvQty(item.id, -1); }} 
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-rose-500 active:scale-90 border border-slate-100"
                            aria-label="Restar cantidad"
                         >
                            <Minus size={20} strokeWidth={3} />
                         </button>
                         <span className="text-sm font-black text-slate-800 w-8 text-center tabular-nums">{item.quantity}</span>
                         <button 
                            onClick={(e) => { e.stopPropagation(); updateInvQty(item.id, 1); }} 
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-emerald-500 active:scale-90 border border-slate-100"
                            aria-label="Sumar cantidad"
                         >
                            <Plus size={20} strokeWidth={3} />
                         </button>
                      </div>
                   </div>
                </div>
              )) : (
                <div className="col-span-2 py-20 text-center text-slate-300">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-bold">Stock vacío</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.SHOPPING && (
            <div className="px-2">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Lista de Compra <ShoppingCart className="text-emerald-500" /></h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total estimado en lista</p>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-5 py-3 rounded-2xl text-base font-black shadow-sm flex items-center gap-2 border border-emerald-200">
                        <Euro size={18} />
                        {shoppingTotal.toFixed(2)}€
                    </div>
                </div>
                <ShoppingList 
                  items={data.shoppingItems} 
                  onToggle={(id) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.map(i => i.id === id ? {...i, completed: !i.completed} : i)}))} 
                  onAdd={(name, price) => setData(prev => ({...prev, shoppingItems: [...prev.shoppingItems, {id: Date.now().toString(), name, price: price || 0, completed: false, category: 'Alimentación'}]}))} 
                  onDelete={(id) => setData(prev => ({...prev, shoppingItems: prev.shoppingItems.filter(i => i.id !== id)}))}
                />
            </div>
        )}

        {activeTab === AppTab.ACTIVITY && (
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                <div className="px-2">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">Historial <History className="text-indigo-600" /></h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Últimos cambios en el hogar</p>
                </div>
                <div className="space-y-3 px-2">
                    {data.familyActivity.length > 0 ? data.familyActivity.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex gap-4 items-start">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.user === 'Carmen' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                <User size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-700 leading-relaxed"><span className="font-black text-slate-900">{item.user}</span> {item.action}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">{formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true, locale: es })}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center text-slate-300 uppercase font-black text-xs tracking-widest">Sin actividad</div>
                    )}
                </div>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center py-4 px-2 safe-bottom shadow-2xl z-50">
        <NavButton active={activeTab === AppTab.DASHBOARD} onClick={() => setActiveTab(AppTab.DASHBOARD)} icon={<Home size={20} />} label="Inicio" />
        <NavButton active={activeTab === AppTab.WEEKLY} onClick={() => setActiveTab(AppTab.WEEKLY)} icon={<CalendarRange size={20} />} label="Semana" />
        <NavButton active={activeTab === AppTab.TASKS} onClick={() => setActiveTab(AppTab.TASKS)} icon={<CheckCircle2 size={20} />} label="Tareas" />
        <NavButton active={activeTab === AppTab.INVENTORY} onClick={() => setActiveTab(AppTab.INVENTORY)} icon={<Package size={20} />} label="Stock" />
        <NavButton active={activeTab === AppTab.SHOPPING} onClick={() => setActiveTab(AppTab.SHOPPING)} icon={<ShoppingCart size={20} />} label="Compra" />
        <NavButton active={activeTab === AppTab.ACTIVITY} onClick={() => setActiveTab(AppTab.ACTIVITY)} icon={<History size={20} />} label="Cambios" />
      </nav>

      {/* MODALES REUTILIZADOS */}
      {showAddInventory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center" onClick={() => { setShowAddInventory(false); resetInvForm(); setSelectedInventoryItem(null); }}>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">{selectedInventoryItem ? 'Editar Stock' : 'Añadir Stock'}</h3>
                <button onClick={() => { setShowAddInventory(false); resetInvForm(); setSelectedInventoryItem(null); }} className="p-3 bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             <div className="space-y-6">
                <div className="flex gap-4">
                  <div onClick={() => fileInputRef.current?.click()} className="w-28 h-28 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 overflow-hidden shrink-0 cursor-pointer">
                    {newInvImage ? <img src={newInvImage} className="w-full h-full object-cover" /> : <><Camera size={28} /><span className="text-[8px] font-black uppercase">Foto</span></>}
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <input type="text" placeholder="¿Qué producto es?" value={newInvName} onChange={e => setNewInvName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none outline-none text-sm" />
                    <select value={newInvCategory} onChange={e => setNewInvCategory(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none text-xs">
                       <option value="Cocina">Cocina / Comida</option>
                       <option value="Limpieza">Limpieza</option>
                       <option value="Mascotas">Mascotas</option>
                       <option value="Higiene">Higiene</option>
                       <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Cantidad</label>
                     <input type="number" value={newInvQty} onChange={e => setNewInvQty(parseInt(e.target.value) || 0)} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Unidad</label>
                     <input type="text" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none text-xs" />
                   </div>
                </div>
                <div className="flex gap-3">
                   {selectedInventoryItem && (
                     <button onClick={() => deleteInventoryItem(selectedInventoryItem.id)} className="p-5 bg-rose-50 text-rose-500 rounded-2xl active:scale-95 transition-all"><Trash2 size={24} /></button>
                   )}
                   <button onClick={selectedInventoryItem ? handleUpdateInventory : handleAddInventory} className="flex-1 p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-[0.1em] text-xs">
                      Guardar en Almacén
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-end justify-center" onClick={() => { setShowAddTask(false); setEditingTask(null); }}>
          <div className="bg-white w-full max-md rounded-t-[3rem] p-8 pb-12 shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
                <button onClick={() => { setShowAddTask(false); setEditingTask(null); }} className="p-3 bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             <div className="space-y-5">
                <input type="text" placeholder="Ej: Cambiar filtro aire" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none text-sm" />
                <div className="grid grid-cols-2 gap-4">
                    <select value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs border-none outline-none">
                      {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                    <select value={newTaskFreq} onChange={e => setNewTaskFreq(e.target.value as Frequency)} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs border-none outline-none">
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="periodic">Cada X días</option>
                    </select>
                </div>
                <button onClick={handleSaveTask} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-[0.1em] text-xs">
                   Confirmar Tarea
                </button>
             </div>
          </div>
        </div>
      )}

      {showEditPlanning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center" onClick={() => setShowEditPlanning(false)}>
          <div className="bg-white w-full max-md rounded-t-[3rem] p-8 pb-12 shadow-2xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">{fullWeekDays[selectedDayIndex]}</h3>
                <button onClick={() => setShowEditPlanning(false)} className="p-3 bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
             </div>
             <div className="space-y-6">
                <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Comida</label>
                    <input type="text" value={data.weeklyPlanning[selectedDayIndex]?.meals?.lunch || ''} onChange={(e) => updatePlanning(selectedDayIndex, { meals: { lunch: e.target.value } })} placeholder="¿Qué comemos?" className="w-full p-4 bg-white rounded-xl border-none font-bold text-sm shadow-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Cena</label>
                    <input type="text" value={data.weeklyPlanning[selectedDayIndex]?.meals?.dinner || ''} onChange={(e) => updatePlanning(selectedDayIndex, { meals: { dinner: e.target.value } })} placeholder="¿Qué cenamos?" className="w-full p-4 bg-white rounded-xl border-none font-bold text-sm shadow-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-slate-400 ml-1">Dep. Carmen</label>
                      <input type="text" value={data.weeklyPlanning[selectedDayIndex]?.sport?.carmen || ''} onChange={(e) => updatePlanning(selectedDayIndex, { sport: { carmen: e.target.value } })} placeholder="Dep. Carmen" className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs shadow-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7px] font-black uppercase text-slate-400 ml-1">Dep. Alberto</label>
                      <input type="text" value={data.weeklyPlanning[selectedDayIndex]?.sport?.alberto || ''} onChange={(e) => updatePlanning(selectedDayIndex, { sport: { alberto: e.target.value } })} placeholder="Dep. Alberto" className="w-full p-4 bg-white rounded-xl border-none font-bold text-xs shadow-sm outline-none" />
                    </div>
                  </div>
                </div>
                <button onClick={() => { setShowEditPlanning(false); logActivity(`ha actualizado el planning del ${fullWeekDays[selectedDayIndex]}`); showToast('Semana guardada'); }} className="w-full p-5 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-xs">Guardar Planning</button>
             </div>
          </div>
        </div>
      )}

      {showShiftCalendar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowShiftCalendar(false)}>
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-3"><Stethoscope className="text-orange-500" /> Guardias Carmen</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentCalendarMonth(prev => subMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={20} /></button>
                <span className="text-[10px] font-black uppercase text-slate-500 min-w-[80px] text-center">{format(currentCalendarMonth, 'MMM yy', { locale: es })}</span>
                <button onClick={() => setCurrentCalendarMonth(prev => addMonths(prev, 1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {eachDayOfInterval({ start: startOfMonth(currentCalendarMonth), end: endOfMonth(currentCalendarMonth) }).map(day => {
                const dayISO = format(day, 'yyyy-MM-dd');
                const isShift = data.shifts.includes(dayISO);
                return (
                  <button key={dayISO} onClick={() => handleToggleShift(dayISO)} className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all ${isShift ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>
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

const ShoppingList: React.FC<{ items: ShoppingItem[]; onToggle: (id: string) => void; onAdd: (name: string, price: number) => void; onDelete: (id: string) => void }> = ({ items, onToggle, onAdd, onDelete }) => {
  const [n, setN] = useState('');
  const [p, setP] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  
  const handleAdd = async () => {
    if (!n.trim()) return;
    let finalPrice = parseFloat(p);
    
    if (isNaN(finalPrice) || finalPrice <= 0) {
      setIsEstimating(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ 
          model: 'gemini-3-flash-preview', 
          contents: `Estima el precio medio aproximado en un supermercado estándar en España para este producto: "${n.trim()}". Devuelve el precio como un número.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                estimatedPrice: {
                  type: Type.NUMBER,
                  description: "El precio estimado en euros (EUR) para una unidad estándar."
                }
              },
              required: ["estimatedPrice"]
            }
          }
        });
        const result = JSON.parse(response.text.trim());
        finalPrice = result.estimatedPrice || 0;
      } catch (e) {
        console.error("Error estimando precio:", e);
        finalPrice = 0;
      } finally {
        setIsEstimating(false);
      }
    }

    onAdd(n, finalPrice);
    setN('');
    setP('');
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="¿Qué falta?" 
            value={n} 
            onChange={(e) => setN(e.target.value)} 
            className="flex-1 bg-slate-50 p-4 rounded-xl font-bold outline-none border-none text-sm" 
          />
          <div className="relative w-32">
            <input 
              type="number" 
              placeholder="0.00" 
              value={p} 
              onChange={(e) => setP(e.target.value)} 
              className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none border-none text-sm pr-6" 
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">€</span>
          </div>
        </div>
        <button 
          onClick={handleAdd} 
          disabled={isEstimating} 
          className="w-full p-4 bg-indigo-600 text-white rounded-2xl shadow-md active:scale-95 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]"
        >
          {isEstimating ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
          {isEstimating ? 'Estimando...' : 'Añadir a la lista'}
        </button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-300">
            <button onClick={() => onToggle(item.id)} className={item.completed ? 'text-emerald-500' : 'text-slate-200'}>
              {item.completed ? <CheckCircle2 size={28} fill="currentColor" /> : <Circle size={28} />}
            </button>
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${item.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
                <p className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
                  <Euro size={10} /> {item.price?.toFixed(2)}€
                </p>
            </div>
            <button onClick={() => onDelete(item.id)} className="p-3 text-slate-200 hover:text-rose-500 transition-colors active:bg-rose-50 rounded-xl"><Trash2 size={18} /></button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-20 text-center text-slate-300 opacity-50">
            <ShoppingBasket size={64} className="mx-auto mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Lista vacía</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-300 flex-1 ${active ? 'text-indigo-600 scale-105' : 'text-slate-300'}`}>
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-50 shadow-sm' : ''}`}>
      {icon}
    </div>
    <span className="text-[7px] font-black uppercase tracking-tight">{label}</span>
  </button>
);

export default App;
