import React, { useState, useEffect } from 'react';
import { TripData, Itinerary, Activity, SavedTrip } from './types';
import { TripContext } from './views/TripContext';
import { ItineraryPlanner } from './views/ItineraryPlanner';
import { ItineraryOverview } from './views/ItineraryOverview';
import { generateInitialItinerary, regenerateActivity, regenerateDay, suggestGapActivity } from './services/geminiService';
import { LayoutGrid, Calendar, ArrowLeft, Save, FolderOpen, Trash2, Edit2, Clock, MapPin } from 'lucide-react';
import { Logo } from './components/Logo';
import { Modal } from './components/Modal';
import { Button } from './components/Button';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const INITIAL_TRIP_DATA: TripData = {
  destination: '',
  arrivalDate: '',
  arrivalTime: '10:00',
  departureDate: '',
  departureTime: '18:00',
  adults: 2, 
  children: 1, 
  accommodation: '',
  dailyAccommodations: {},
  breakfastTime: '09:00',
  selfDrive: false,
  styles: [],
  mustSees: '',
};

// Fun Dynamic Background Component
const BackgroundDecor = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        {/* Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-green-50/50"></div>
        
        {/* Texture */}
        <div className="absolute inset-0 bg-kiwi-pattern opacity-40"></div>

        {/* Animated Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-blob mix-blend-multiply"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent/30 rounded-full blur-[100px] animate-blob-delay mix-blend-multiply"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] animate-blob-slow mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-primaryLight/30 rounded-full blur-[80px] animate-blob mix-blend-multiply"></div>
    </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<'context' | 'planner' | 'overview'>('context');
  const [tripData, setTripData] = useState<TripData>(INITIAL_TRIP_DATA);
  const [itinerary, setItinerary] = useState<Itinerary>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved Trips State
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [isSavedTripsModalOpen, setIsSavedTripsModalOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load saved trips from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('kw_saved_trips');
    if (stored) {
        try {
            setSavedTrips(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to parse saved trips", e);
        }
    }
  }, []);

  // Save to local storage whenever savedTrips changes
  useEffect(() => {
    localStorage.setItem('kw_saved_trips', JSON.stringify(savedTrips));
  }, [savedTrips]);

  const handleTripContextComplete = async (data: TripData) => {
    setTripData(data);
    setIsGenerating(true);
    setError(null);
    try {
      const generatedItinerary = await generateInitialItinerary(data);
      setItinerary(generatedItinerary);
      setStep('planner');
    } catch (e) {
      console.error(e);
      setError("無法生成行程，請檢查 API Key 或網絡連接。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateItem = async (item: Activity, promptOverride?: string) => {
    try {
      const dayActivities = itinerary.filter(a => a.dayIndex === item.dayIndex && a.id !== item.id);
      const newItem = await regenerateActivity(tripData, item, dayActivities, promptOverride);
      setItinerary(prev => prev.map(a => a.id === item.id ? newItem : a));
    } catch (e) {
      console.error(e);
      alert("更新失敗，請稍後再試。");
    }
  };

  const handleRegenerateDay = async (dayIndex: number) => {
    try {
      const currentDayActivities = itinerary.filter(a => a.dayIndex === dayIndex);
      const newDayActivities = await regenerateDay(tripData, dayIndex, currentDayActivities);
      
      setItinerary(prev => [
        ...prev.filter(a => a.dayIndex !== dayIndex),
        ...newDayActivities
      ]);
    } catch (e) {
      console.error(e);
      alert("更新全日行程失敗。");
    }
  };

  const handleAddItem = async (dayIndex: number, time: string) => {
    try {
        const newItem = await suggestGapActivity(tripData, dayIndex, time, 60);
        setItinerary(prev => [...prev, newItem].sort((a,b) => a.startTime.localeCompare(b.startTime)));
    } catch(e) {
        console.error(e);
    }
  };

  const handleMoveActivity = async (
    activityId: string, 
    newDayIndex: number, 
    newTime: string,
    oldDayIndex: number,
    oldTime: string,
    duration: number
  ) => {
    // Optimistic UI Update
    setItinerary(prev => {
        const updated = prev.map(item => {
            if (item.id === activityId) {
                return { ...item, dayIndex: newDayIndex, startTime: newTime };
            }
            return item;
        });
        return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    // Suggest filling the gap in the old location
    if (oldDayIndex !== newDayIndex || oldTime !== newTime) {
        try {
            const gapActivity = await suggestGapActivity(tripData, oldDayIndex, oldTime, duration);
            setItinerary(prev => [...prev, gapActivity].sort((a, b) => a.startTime.localeCompare(b.startTime)));
        } catch (e) {
            console.error("Failed to auto-fill gap", e);
        }
    }
  };

  // --- Saving Logic ---
  const handleSaveCurrentTrip = () => {
    if (itinerary.length === 0) {
        alert("目前的行程是空的，無法儲存。");
        return;
    }
    const defaultName = `${tripData.destination} 之旅 (${format(new Date(), 'yyyy-MM-dd')})`;
    const name = window.prompt("為您的行程命名：", defaultName);
    
    if (name) {
        const newTrip: SavedTrip = {
            id: uuidv4(),
            name,
            tripData,
            itinerary,
            updatedAt: Date.now()
        };
        setSavedTrips(prev => [newTrip, ...prev]);
        alert("行程已成功儲存到「我的行程庫」！");
    }
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    if (window.confirm("載入此行程將會覆蓋當前未儲存的進度，確定嗎？")) {
        setTripData(trip.tripData);
        setItinerary(trip.itinerary);
        setStep('planner');
        setIsSavedTripsModalOpen(false);
    }
  };

  const handleDeleteTrip = (id: string) => {
    if (window.confirm("確定要刪除這個行程嗎？此操作無法還原。")) {
        setSavedTrips(prev => prev.filter(t => t.id !== id));
    }
  };

  const startEditingName = (trip: SavedTrip) => {
      setEditingTripId(trip.id);
      setEditName(trip.name);
  };

  const saveEditedName = (id: string) => {
      setSavedTrips(prev => prev.map(t => t.id === id ? { ...t, name: editName } : t));
      setEditingTripId(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900">
      <BackgroundDecor />
      
      {/* Top Navigation Bar */}
      {step !== 'context' && (
        <header className="bg-white/80 backdrop-blur-md border-b border-primary/20 sticky top-0 z-50 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 h-18 flex flex-col md:flex-row items-center justify-between py-2 gap-2">
            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                <div className="hover:scale-105 transition-transform cursor-pointer" onClick={() => setStep('context')}>
                  <Logo />
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 border-l-2 pl-6 border-slate-200">
                     <span className="font-extrabold text-slate-800 text-lg">{tripData.destination}</span>
                     <span className="text-slate-300">•</span>
                     <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-full">{tripData.adults} 大 {tripData.children} 小</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto scrollbar-hide pb-1 md:pb-0">
                {/* View Switcher */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl shadow-inner border border-slate-200 flex-none">
                    <button 
                        onClick={() => setStep('planner')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${step === 'planner' ? 'bg-white shadow-md text-primary scale-105 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> <span className="hidden sm:inline">行程細節</span>
                    </button>
                    <button 
                        onClick={() => setStep('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${step === 'overview' ? 'bg-white shadow-md text-primary scale-105 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
                    >
                        <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">行程概覽</span>
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-none">
                    <button 
                        onClick={handleSaveCurrentTrip}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primaryLight hover:text-slate-900 transition-all active:scale-95"
                        title="儲存當前行程"
                    >
                        <Save className="w-4 h-4" /> <span className="hidden sm:inline">儲存</span>
                    </button>
                    
                    <button 
                        onClick={() => setIsSavedTripsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:border-primary/30 hover:text-primary transition-all active:scale-95"
                        title="我的行程庫"
                    >
                        <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">我的行程</span>
                    </button>

                    <button 
                        onClick={() => setStep('context')} 
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="修改設定"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col">
        {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-full shadow-lg z-50 font-bold animate-bounce">
                {error}
            </div>
        )}

        {step === 'context' && (
            <div className="min-h-screen flex flex-col items-center justify-center py-10">
                 <div className="mb-8 scale-150 transform hover:rotate-3 transition-transform duration-500 drop-shadow-2xl">
                     <Logo />
                 </div>
                 <div className="mb-8">
                    <Button variant="secondary" onClick={() => setIsSavedTripsModalOpen(true)} className="rounded-full px-6 py-3 shadow-lg border-2 border-white/50 bg-white/60 backdrop-blur font-bold text-primary hover:bg-white/90">
                        <FolderOpen className="w-5 h-5 mr-2" /> 打開我的行程庫
                    </Button>
                 </div>
                 <TripContext 
                    initialData={tripData} 
                    onComplete={handleTripContextComplete} 
                    isGenerating={isGenerating} 
                />
            </div>
        )}
        
        {step === 'planner' && (
          <ItineraryPlanner 
            tripData={tripData}
            itinerary={itinerary}
            onUpdateItinerary={setItinerary}
            onUpdateTripData={setTripData}
            onRegenerateItem={handleRegenerateItem}
            onRegenerateDay={handleRegenerateDay}
            onAddItem={handleAddItem}
            onMoveActivity={handleMoveActivity}
          />
        )}

        {step === 'overview' && (
            <ItineraryOverview tripData={tripData} itinerary={itinerary} />
        )}
      </main>

      {/* Saved Trips Modal */}
      <Modal
        isOpen={isSavedTripsModalOpen}
        onClose={() => { setIsSavedTripsModalOpen(false); setEditingTripId(null); }}
        title="我的行程庫"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {savedTrips.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                    <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-20 text-primary" />
                    <p className="font-bold">您還沒有儲存任何行程。</p>
                    <p className="text-sm opacity-70">快去計劃您的第一個旅程吧！</p>
                </div>
            ) : (
                savedTrips.map(trip => (
                    <div key={trip.id} className="bg-white border-l-4 border-l-primary border border-slate-100 rounded-r-xl p-4 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden hover:translate-x-1">
                        
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                {editingTripId === trip.id ? (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            autoFocus
                                            className="border border-primary rounded px-2 py-1 text-sm font-bold w-full focus:ring-2 focus:ring-primary/20 outline-none"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                        />
                                        <Button size="sm" onClick={() => saveEditedName(trip.id)} className="h-8 w-8 p-0 bg-primary"><Save className="w-3 h-3"/></Button>
                                    </div>
                                ) : (
                                    <h4 className="font-bold text-slate-800 text-lg mb-1 flex items-center gap-2">
                                        {trip.name}
                                        <button onClick={() => startEditingName(trip)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10">
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    </h4>
                                )}
                                
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-2">
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><MapPin className="w-3 h-3 text-accent"/> {trip.tripData.destination}</span>
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md"><Clock className="w-3 h-3 text-secondary"/> 更新於: {format(trip.updatedAt, 'MM/dd HH:mm')}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 items-center h-full">
                                <Button 
                                    onClick={() => handleLoadTrip(trip)}
                                    className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 text-xs px-4 py-2 h-auto rounded-lg font-bold"
                                >
                                    讀取
                                </Button>
                                <Button 
                                    variant="danger" 
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="px-2 py-2 h-auto rounded-lg bg-red-50 text-red-400 border-0 hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </Modal>
    </div>
  );
};

export default App;