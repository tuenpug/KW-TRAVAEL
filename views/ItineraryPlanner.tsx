import React, { useState } from 'react';
import { TripData, Itinerary, Activity } from '../types';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { MapPin, Clock, Star, RefreshCw, X, Plus, Home, Trash2, GripVertical, ExternalLink, Navigation, Edit, Info, Timer, ImageOff, Sparkles } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { generateCustomImage } from '../services/geminiService';

interface ItineraryPlannerProps {
  tripData: TripData;
  itinerary: Itinerary;
  onUpdateItinerary: (newItinerary: Itinerary) => void;
  onUpdateTripData: (newData: TripData) => void;
  onRegenerateItem: (item: Activity, prompt?: string) => Promise<void>;
  onRegenerateDay: (dayIndex: number) => Promise<void>;
  onAddItem: (dayIndex: number, time: string) => Promise<void>;
  onMoveActivity: (id: string, newDay: number, newTime: string, oldDay: number, oldTime: string, duration: number) => Promise<void>;
}

const START_HOUR = 7;
const END_HOUR = 23;
const HOURS_COUNT = END_HOUR - START_HOUR + 1;
const PIXELS_PER_HOUR = 160; 
const HEADER_HEIGHT = 80; // Fixed header height

// --- Activity Card Component ---
const ActivityCard: React.FC<{
  activity: Activity;
  isShort: boolean;
  draggedId: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onToggleStar: (e: React.MouseEvent, id: string, rating: number) => void;
  style: React.CSSProperties;
}> = ({ activity, isShort, draggedId, onDragStart, onClick, onToggleStar, style }) => {
    
    const [imgError, setImgError] = useState(false);
    
    const cardGradient = (type: string) => {
        switch (type) {
            case 'food': return 'bg-white border-orange-200 shadow-orange-100/50';
            case 'sight': return 'bg-white border-sky-200 shadow-sky-100/50';
            case 'shopping': return 'bg-white border-pink-200 shadow-pink-100/50';
            default: return 'bg-white border-emerald-200 shadow-emerald-100/50';
        }
    };

    const typeColor = (type: string) => {
         switch (type) {
            case 'food': return 'text-orange-600 bg-orange-50';
            case 'sight': return 'text-sky-600 bg-sky-50';
            case 'shopping': return 'text-pink-600 bg-pink-50';
            default: return 'text-emerald-600 bg-emerald-50';
        }
    }

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, activity.id)}
            onClick={onClick}
            className={`
                absolute w-full px-1 z-10 transition-all duration-300 select-none cursor-pointer
                ${draggedId === activity.id ? 'opacity-50 z-50 scale-105' : 'hover:z-20 hover:scale-[1.02]'}
            `}
            style={style}
        >
            <div className={`
                w-full h-full rounded-xl border shadow-sm group/card overflow-hidden flex flex-col
                ${cardGradient(activity.type)}
            `}>
                {isShort ? (
                    <div className="flex h-full items-center p-2 gap-3 bg-white/95 backdrop-blur-sm">
                         <div className="w-10 h-10 flex-none rounded-lg overflow-hidden relative shadow-sm bg-slate-100">
                            {!imgError ? (
                                <img 
                                    src={activity.imageUrl} 
                                    onError={() => setImgError(true)}
                                    className="w-full h-full object-cover pointer-events-none" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageOff className="w-4 h-4" />
                                </div>
                            )}
                         </div>
                         <div className="min-w-0 flex-1">
                             <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-bold text-xs text-slate-800 truncate">{activity.title}</h4>
                                <span className="text-[10px] font-bold text-slate-400">{activity.startTime}</span>
                             </div>
                             <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${typeColor(activity.type)}`}>
                                 {activity.type.toUpperCase()}
                             </span>
                         </div>
                    </div>
                ) : (
                    <>
                        <div className="h-[60%] relative overflow-hidden bg-slate-100">
                            {!imgError ? (
                                <img 
                                    src={activity.imageUrl} 
                                    onError={() => setImgError(true)}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                    <span className="text-xs font-bold flex flex-col items-center gap-1">
                                        <ImageOff className="w-6 h-6" />
                                        No Image
                                    </span>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                            
                            <div className="absolute top-2 left-2">
                                <span className="bg-black/30 backdrop-blur text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                                    {activity.startTime}
                                </span>
                            </div>

                            <button 
                                onClick={(e) => onToggleStar(e, activity.id, activity.rating)}
                                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/20 transition-colors"
                            >
                                <Star className={`w-4 h-4 drop-shadow-md transition-transform active:scale-125 ${activity.rating === 5 ? 'fill-yellow-400 text-yellow-400' : 'text-white/60 hover:text-white'}`} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-2.5 bg-white flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{activity.title}</h4>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium">
                                    <Clock className="w-3 h-3" /> {activity.durationMinutes} min
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${typeColor(activity.type)}`}>
                                    {activity.type}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  tripData,
  itinerary,
  onUpdateItinerary,
  onUpdateTripData,
  onRegenerateItem,
  onRegenerateDay,
  onAddItem,
  onMoveActivity
}) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null); 
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [promptMode, setPromptMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const days = Array.from({ length: differenceInDays(tripData.arrivalDate, tripData.departureDate) }, (_, i) => i);
  const hours = Array.from({ length: HOURS_COUNT }, (_, i) => i + START_HOUR);

  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    setDraggedActivityId(activityId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', activityId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDayIndex: number, targetHour: number) => {
    e.preventDefault();
    const activityId = e.dataTransfer.getData('text/plain');
    if (!activityId) return;
    
    const activity = itinerary.find(a => a.id === activityId);
    if (!activity) return;

    const targetTime = `${targetHour.toString().padStart(2, '0')}:00`;

    if (activity.dayIndex === targetDayIndex && parseInt(activity.startTime.split(':')[0]) === targetHour) {
        setDraggedActivityId(null);
        return;
    }

    onMoveActivity(
        activity.id,
        targetDayIndex,
        targetTime,
        activity.dayIndex,
        activity.startTime,
        activity.durationMinutes
    );
    
    setDraggedActivityId(null);
  };

  const getActivitiesForDay = (dayIndex: number) => {
    return itinerary.filter(a => a.dayIndex === dayIndex);
  };

  // --- Calculations for Positioning ---
  const calculateTop = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      const hoursFromStart = (h - START_HOUR) + (m / 60);
      return hoursFromStart * PIXELS_PER_HOUR;
  };

  const calculateHeight = (durationMinutes: number) => {
      return (durationMinutes / 60) * PIXELS_PER_HOUR;
  };

  const toggleStar = (e: React.MouseEvent, id: string, current: number) => {
    e.stopPropagation();
    const newRating = current === 5 ? 0 : 5;
    const newItinerary = itinerary.map(a => a.id === id ? { ...a, rating: newRating } : a);
    onUpdateItinerary(newItinerary);
  };

  const handleDelete = (id: string) => {
    onUpdateItinerary(itinerary.filter(a => a.id !== id));
    setSelectedActivity(null);
  };

  const handleDetailsUpdate = (field: 'startTime' | 'durationMinutes', value: string) => {
    if (selectedActivity) {
      let updated = { ...selectedActivity };
      if (field === 'startTime') {
        updated.startTime = value;
      } else if (field === 'durationMinutes') {
        updated.durationMinutes = parseInt(value) || 30;
      }

      const newItinerary = itinerary.map(a => a.id === selectedActivity.id ? updated : a)
        .sort((a,b) => a.startTime.localeCompare(b.startTime));
      
      onUpdateItinerary(newItinerary);
      setSelectedActivity(updated);
    }
  }

  const handleRegenerateClick = async (item: Activity) => {
    setIsRegenerating(item.id);
    await onRegenerateItem(item, promptMode ? customPrompt : undefined);
    setIsRegenerating(null);
    setPromptMode(false);
    setCustomPrompt('');
    setSelectedActivity(null);
  };
  
  const handleRegenerateDayClick = async (dayIndex: number) => {
    if (window.confirm("重新生成這整天的行程？(已標記 5 星的項目將會保留)")) {
        setIsRegenerating(`day-${dayIndex}`);
        await onRegenerateDay(dayIndex);
        setIsRegenerating(null);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!selectedActivity) return;
    setIsGeneratingImage(true);
    
    // Call service to generate real AI image
    const aiImageUrl = await generateCustomImage(selectedActivity.title, tripData.destination);
    
    if (aiImageUrl) {
        const updated = { ...selectedActivity, imageUrl: aiImageUrl };
        const newItinerary = itinerary.map(a => a.id === selectedActivity.id ? updated : a);
        onUpdateItinerary(newItinerary);
        setSelectedActivity(updated);
    } else {
        alert("圖片生成失敗，請稍後再試 (可能受 API 配額限制)");
    }
    
    setIsGeneratingImage(false);
  };

  const handleAccommodationChange = (dayIndex: number, val: string) => {
    onUpdateTripData({
        ...tripData,
        dailyAccommodations: {
            ...tripData.dailyAccommodations,
            [dayIndex]: val
        }
    });
  };

  return (
    <div className="h-full flex flex-col bg-transparent relative overflow-hidden">
      
      {/* Scrollable Container - NO Padding Top to allow sticky top-0 to work correctly */}
      <div className="flex-1 overflow-auto pb-10 relative">
        <div className="flex min-w-max px-4">
            
            {/* Sticky Time Column */}
            <div className="sticky left-0 z-40 flex flex-col w-14 mr-2 bg-transparent pointer-events-none group">
                 {/* Spacer to push time down to match header height */}
                 <div style={{ height: HEADER_HEIGHT }} className="flex-none"></div>
                 
                 <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/60 overflow-hidden pointer-events-auto">
                    {hours.map(h => (
                        <div key={h} className="border-b border-slate-100 text-[10px] font-bold text-slate-400 text-center flex items-start justify-center" style={{ height: PIXELS_PER_HOUR }}>
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded -mt-2.5 shadow-sm">{h}:00</span>
                        </div>
                    ))}
                 </div>
            </div>

            {/* Day Columns */}
            {days.map(dayIndex => {
                const date = addDays(parseISO(tripData.arrivalDate), dayIndex);
                const dayActivities = getActivitiesForDay(dayIndex);
                
                return (
                    <div key={dayIndex} className="w-80 flex-none flex flex-col mr-6 relative group/col">

                        {/* WATERMARK BACKGROUND */}
                        <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
                            <div className="sticky top-48 h-fit text-center opacity-10 mix-blend-multiply">
                                <div className="text-4xl font-black text-slate-400 tracking-widest uppercase mb-[-1.5rem]">DAY</div>
                                <div className="text-[12rem] font-black text-slate-400 leading-none tracking-tighter shadow-white drop-shadow-sm">
                                    {(dayIndex + 1).toString().padStart(2, '0')}
                                </div>
                            </div>
                        </div>
                        
                        {/* 1. Sticky Header - Fully opaque background + top-0 */}
                        <div className="sticky top-0 z-50 pt-2 pb-2 bg-background border-b border-slate-200 shadow-md -mx-1 px-1 rounded-b-xl" style={{ height: HEADER_HEIGHT }}> 
                             <div className="bg-white rounded-xl border border-primary/20 p-2 flex justify-between items-center h-full shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary text-white text-sm font-black px-2.5 py-1.5 rounded-lg shadow-sm">D{dayIndex + 1}</div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800">{format(date, 'MMM dd')}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{format(date, 'EEEE')}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleRegenerateDayClick(dayIndex)}
                                    disabled={!!isRegenerating}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                    title="重新生成全日行程"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating === `day-${dayIndex}` ? 'animate-spin' : ''}`} />
                                </button>
                             </div>
                        </div>

                        {/* 2. Scrollable Accommodation Input */}
                        <div className="mb-2 mt-2 relative group/input px-1 z-20">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400">
                                    <Home className="w-3.5 h-3.5" />
                                </div>
                                <input 
                                    className="w-full bg-white/60 border border-slate-200 rounded-lg py-1.5 pl-8 pr-2 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-primary/50 focus:bg-white outline-none transition-all placeholder:text-slate-400 shadow-sm"
                                    value={tripData.dailyAccommodations[dayIndex] || tripData.accommodation}
                                    onChange={(e) => handleAccommodationChange(dayIndex, e.target.value)}
                                    placeholder="住宿地點..."
                                />
                            </div>
                        </div>

                        {/* 3. Timeline Grid */}
                        <div className="relative w-full z-10 bg-slate-50/50 rounded-2xl border border-slate-200" style={{ height: HOURS_COUNT * PIXELS_PER_HOUR }}>
                            
                            {/* Grid Lines */}
                            {hours.map(hour => (
                                <div 
                                    key={hour}
                                    className="absolute w-full border-b border-slate-200/60 z-0 group/slot"
                                    style={{ 
                                        top: (hour - START_HOUR) * PIXELS_PER_HOUR, 
                                        height: PIXELS_PER_HOUR 
                                    }}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, dayIndex, hour)}
                                >
                                    {/* Half-hour dashed line */}
                                    <div className="absolute top-1/2 w-full border-b border-dashed border-slate-300/40"></div>

                                    {/* Add Button Area */}
                                    <div className="absolute inset-0 opacity-0 group-hover/slot:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                        <button 
                                            onClick={() => onAddItem(dayIndex, `${hour.toString().padStart(2, '0')}:00`)}
                                            className="bg-primary/90 text-white p-2 rounded-full shadow-lg pointer-events-auto hover:scale-110 transition-transform"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Activities */}
                            {dayActivities.map(activity => {
                                const top = calculateTop(activity.startTime);
                                const height = calculateHeight(activity.durationMinutes);
                                const isShort = activity.durationMinutes < 45;

                                return (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        isShort={isShort}
                                        draggedId={draggedActivityId}
                                        onDragStart={handleDragStart}
                                        onClick={() => setSelectedActivity(activity)}
                                        onToggleStar={toggleStar}
                                        style={{ top: `${top}px`, height: `${Math.max(height, 30)}px` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            
            <div className="w-10 flex-none"></div>
        </div>
      </div>

      {/* Activity Details Modal */}
      <Modal
        isOpen={!!selectedActivity}
        onClose={() => { setSelectedActivity(null); setPromptMode(false); }}
        title="行程詳情"
        footer={
            <div className="flex w-full items-center gap-3">
                <Button variant="danger" onClick={() => selectedActivity && handleDelete(selectedActivity.id)} className="px-3 rounded-xl shadow-lg shadow-red-500/20">
                    <Trash2 className="w-4 h-4" />
                </Button>
                <div className="h-8 w-px bg-slate-200 mx-1"></div>
                
                {promptMode ? (
                     <div className="flex w-full gap-2 animate-in fade-in slide-in-from-right-5 duration-300">
                         <input 
                            className="flex-1 text-sm border-2 border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-inner"
                            placeholder="例如：轉做食壽司..."
                            value={customPrompt}
                            onChange={e => setCustomPrompt(e.target.value)}
                         />
                         <Button onClick={() => selectedActivity && handleRegenerateClick(selectedActivity)} isLoading={!!isRegenerating} className="rounded-xl">Go</Button>
                         <Button variant="ghost" onClick={() => setPromptMode(false)} className="rounded-xl"><X className="w-4 h-4"/></Button>
                     </div>
                ) : (
                    <>
                        <Button variant="secondary" onClick={() => setPromptMode(true)} className="flex-1 rounded-xl font-bold border-2 hover:border-primary hover:text-primary transition-all">
                            <Edit className="w-4 h-4 mr-2" /> 自訂修改
                        </Button>
                        <Button onClick={() => selectedActivity && handleRegenerateClick(selectedActivity)} isLoading={!!isRegenerating} className="flex-1 rounded-xl shadow-lg shadow-primary/30 font-bold bg-gradient-to-r from-primary to-primaryLight hover:scale-105 transition-transform">
                            <RefreshCw className="w-4 h-4 mr-2" /> 隨機更新
                        </Button>
                    </>
                )}
            </div>
        }
      >
        {selectedActivity && (
            <div className="space-y-6">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl h-64 group ring-4 ring-white bg-slate-100">
                    <img 
                        src={selectedActivity.imageUrl} 
                        className={`w-full h-full object-cover transform transition-transform duration-[2s] group-hover:scale-110 ${isGeneratingImage ? 'blur-sm scale-105' : ''}`}
                        alt={selectedActivity.title}
                        onError={(e) => {
                            // Robust Backup
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80'; 
                        }}
                    />
                    
                    {isGeneratingImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                             <RefreshCw className="w-10 h-10 text-white animate-spin mb-2" />
                             <span className="text-white font-bold text-shadow">AI 正在繪圖中...</span>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                    
                    {/* AI Image Generation Button Overlay */}
                    <div className="absolute top-4 left-4 z-30">
                        <button 
                            onClick={handleGenerateAIImage}
                            disabled={isGeneratingImage}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="使用 Gemini AI 生成此活動的專屬圖片"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-accent" />
                            AI 生成專屬圖片
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                        <div className="flex flex-wrap items-center gap-3 text-sm font-bold mb-3 opacity-90">
                            {/* Editable Start Time */}
                            <div className="flex items-center bg-white/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/20 shadow-lg hover:bg-white/30 transition-colors">
                                <Clock className="w-4 h-4 mr-2 text-accent" />
                                <input 
                                    type="time" 
                                    className="bg-transparent border-none p-0 text-white font-bold focus:ring-0 w-24 cursor-pointer text-lg tracking-wide outline-none placeholder-white"
                                    value={selectedActivity.startTime}
                                    onChange={(e) => handleDetailsUpdate('startTime', e.target.value)}
                                />
                            </div>

                            {/* Editable Duration */}
                            <div className="flex items-center bg-white/20 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/20 shadow-lg hover:bg-white/30 transition-colors relative">
                                <Timer className="w-4 h-4 mr-2 text-secondary" />
                                <select 
                                    className="bg-transparent border-none p-0 text-white font-bold focus:ring-0 cursor-pointer text-sm outline-none appearance-none pr-4"
                                    value={selectedActivity.durationMinutes}
                                    onChange={(e) => handleDetailsUpdate('durationMinutes', e.target.value)}
                                >
                                    {[30, 45, 60, 90, 120, 150, 180, 240, 300].map(min => (
                                        <option key={min} value={min} className="text-slate-800">{min < 60 ? `${min} 分鐘` : `${min / 60} 小時`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <h2 className="text-4xl font-black tracking-tight leading-none mb-2 drop-shadow-lg">{selectedActivity.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
                            <MapPin className="w-4 h-4" /> {selectedActivity.location}
                        </div>
                    </div>

                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md p-2 rounded-2xl cursor-pointer hover:bg-black/40 transition-colors border border-white/20 shadow-xl"
                         onClick={(e) => toggleStar(e, selectedActivity.id, selectedActivity.rating)}>
                         {[1,2,3,4,5].map(star => (
                             <Star key={star} className={`w-6 h-6 inline-block transition-all hover:scale-110 ${star <= selectedActivity.rating ? 'fill-accent text-accent drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white/30'}`} />
                         ))}
                    </div>
                </div>

                <div className="space-y-4 px-2">
                    <p className="text-slate-600 text-lg leading-relaxed font-medium first-letter:text-3xl first-letter:font-black first-letter:text-primary first-letter:mr-1">
                        {selectedActivity.description}
                    </p>
                    
                    <div className="grid grid-cols-1 gap-4 mt-4">
                         
                         <div className="bg-gradient-to-br from-yellow-50 to-white p-5 rounded-2xl border border-yellow-100 relative overflow-hidden shadow-sm group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <h5 className="font-bold text-yellow-700 text-sm mb-2 flex items-center gap-2 relative z-10">
                                <span className="bg-yellow-100 p-1 rounded-md"><Star className="w-4 h-4 fill-yellow-600" /></span>
                                推介原因
                            </h5>
                            <p className="text-slate-700 text-sm italic font-medium relative z-10 pl-8 border-l-2 border-yellow-200">
                                “{selectedActivity.reason}”
                            </p>
                         </div>

                        {(selectedActivity.tips || selectedActivity.transportInfo) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedActivity.tips && (
                                    <div className="bg-orange-50/80 p-5 rounded-2xl border border-orange-100 shadow-sm">
                                        <h5 className="font-bold text-orange-700 text-sm mb-2 flex items-center gap-2">
                                            <Info className="w-4 h-4" /> 注意事項
                                        </h5>
                                        <p className="text-slate-600 text-xs leading-relaxed font-medium">{selectedActivity.tips}</p>
                                    </div>
                                )}
                                {selectedActivity.transportInfo && (
                                    <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 shadow-sm">
                                        <h5 className="font-bold text-blue-700 text-sm mb-2 flex items-center gap-2">
                                            <Navigation className="w-4 h-4" /> 交通建議
                                        </h5>
                                        <p className="text-slate-600 text-xs leading-relaxed font-medium">{selectedActivity.transportInfo}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex justify-center pt-2">
                             <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedActivity.title + " " + selectedActivity.location)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary transition-colors hover:underline"
                             >
                                <ExternalLink className="w-4 h-4" /> 在 Google Maps 查看
                             </a>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};

function differenceInDays(start: string, end: string) {
    if(!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    return Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes);
    return format(date, 'HH:mm');
}