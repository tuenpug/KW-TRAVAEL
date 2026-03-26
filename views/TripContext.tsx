import React, { useEffect, useState } from 'react';
import { TripData, TravelStyle } from '../types';
import { Button } from '../components/Button';
import { Calendar, Clock, MapPin, Users, Home, Coffee, Car, Sparkles } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';

interface TripContextProps {
  initialData: TripData;
  onComplete: (data: TripData) => void;
  isGenerating: boolean;
}

const STYLE_LABELS: Record<TravelStyle, string> = {
  [TravelStyle.RELAXED]: '悠閒',
  [TravelStyle.FOODIE]: '飲食',
  [TravelStyle.ADVENTURE]: '冒險探索',
  [TravelStyle.ARTSY]: '文青',
  [TravelStyle.SCENIC]: '風景',
  [TravelStyle.SIGHTSEEING]: '名勝',
  [TravelStyle.SHOPPING]: '購物',
  [TravelStyle.FAMILY]: '親子',
};

export const TripContext: React.FC<TripContextProps> = ({ initialData, onComplete, isGenerating }) => {
  const [formData, setFormData] = useState<TripData>(initialData);
  const [duration, setDuration] = useState({ days: 0, nights: 0 });

  useEffect(() => {
    if (formData.arrivalDate && formData.departureDate) {
      const start = new Date(formData.arrivalDate);
      const end = new Date(formData.departureDate);
      const days = differenceInCalendarDays(end, start) + 1;
      const nights = days - 1 > 0 ? days - 1 : 0;
      setDuration({ days: days > 0 ? days : 0, nights });
    }
  }, [formData.arrivalDate, formData.departureDate]);

  const handleArrivalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newArrival = e.target.value;
    const nextDay = new Date(newArrival);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    setFormData(prev => ({
      ...prev,
      arrivalDate: newArrival,
      departureDate: prev.departureDate < newArrival ? nextDayStr : prev.departureDate
    }));
  };

  const toggleStyle = (style: TravelStyle) => {
    setFormData(prev => {
      const styles = prev.styles.includes(style)
        ? prev.styles.filter(s => s !== style)
        : [...prev.styles, style];
      return { ...prev, styles };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-primary/20 p-8 md:p-10 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <h1 className="text-3xl font-extrabold text-primary mb-8 flex items-center gap-3 relative z-10">
          <span className="bg-primary text-white p-2 rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6" />
          </span>
          行程背景
          <span className="text-sm font-normal text-slate-500 ml-2 mt-2">開始您的奇異旅程</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {/* Destination & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700">國家 / 城市</label>
              <div className="relative">
                 <MapPin className="absolute left-3 top-3 h-5 w-5 text-primary" />
                 <input
                    type="text"
                    required
                    className="w-full pl-10 p-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:border-primary focus:bg-white focus:ring-0 transition-all font-medium text-lg"
                    value={formData.destination}
                    onChange={e => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="例如：日本 東京"
                  />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-4 rounded-xl flex items-center justify-center text-primary font-bold shadow-sm">
              {duration.days > 0 ? (
                <span className="text-xl">旅程共 {duration.days} 日 {duration.nights} 夜</span>
              ) : (
                <span className="text-slate-400">請選擇日期以計算日數</span>
              )}
            </div>
          </div>

          {/* Dates & Times */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Arrival */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-bold border-b border-slate-200 pb-2">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        到埗資訊
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">日期</label>
                            <input type="date" required className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary" 
                                value={formData.arrivalDate} onChange={handleArrivalDateChange} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">時間</label>
                            <input type="time" required className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary" 
                                value={formData.arrivalTime} onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })} />
                        </div>
                    </div>
                </div>

                {/* Departure */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-secondary font-bold border-b border-slate-200 pb-2">
                        <span className="w-2 h-8 bg-secondary rounded-full"></span>
                        回程資訊
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">日期</label>
                            <input type="date" required className="w-full p-2 border rounded-lg focus:ring-secondary focus:border-secondary" 
                                min={formData.arrivalDate}
                                value={formData.departureDate} onChange={e => setFormData({ ...formData, departureDate: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">時間</label>
                            <input type="time" required className="w-full p-2 border rounded-lg focus:ring-secondary focus:border-secondary" 
                                value={formData.departureTime} onChange={e => setFormData({ ...formData, departureTime: e.target.value })} />
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* Party & Accommodation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-3">
                 <label className="block text-sm font-bold text-slate-700">人數</label>
                 <div className="flex gap-4">
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary"><Users className="h-5 w-5" /></div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500">大人</label>
                            <input type="number" min="1" className="w-full font-bold text-lg outline-none"
                                value={formData.adults} onChange={e => setFormData({...formData, adults: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                        <div className="bg-accent/10 p-2 rounded-lg text-accent"><Users className="h-5 w-5" /></div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-500">小童</label>
                            <input type="number" min="0" className="w-full font-bold text-lg outline-none"
                                value={formData.children} onChange={e => setFormData({...formData, children: parseInt(e.target.value)})} />
                        </div>
                    </div>
                 </div>
             </div>

             <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700">居住地點</label>
                <div className="relative">
                    <Home className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <input type="text" className="w-full pl-10 p-3 border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 transition-colors"
                        placeholder="酒店名稱 或 地區"
                        value={formData.accommodation} onChange={e => setFormData({...formData, accommodation: e.target.value})} />
                </div>
             </div>
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">早餐時間</label>
                <div className="relative">
                    <Coffee className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input type="time" className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-primary focus:border-primary"
                        value={formData.breakfastTime} onChange={e => setFormData({...formData, breakfastTime: e.target.value})} />
                </div>
             </div>
             
             <div className="md:col-span-2 flex items-end">
                 <div 
                    className={`w-full p-3 rounded-xl cursor-pointer transition-all border-2 flex items-center justify-between group ${
                        formData.selfDrive 
                        ? 'bg-primary/5 border-primary text-primary' 
                        : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'
                    }`}
                    onClick={() => setFormData({...formData, selfDrive: !formData.selfDrive})}
                 >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.selfDrive ? 'bg-primary text-white' : 'bg-slate-100'}`}>
                            <Car className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-lg">自駕遊</span>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-sm font-bold ${formData.selfDrive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {formData.selfDrive ? 'YES' : 'NO'}
                    </div>
                 </div>
             </div>
          </div>

          {/* Styles */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">旅遊風格 (可多選)</label>
            <div className="flex flex-wrap gap-3">
                {Object.entries(STYLE_LABELS).map(([styleKey, label]) => {
                    const style = styleKey as TravelStyle;
                    const isSelected = formData.styles.includes(style);
                    return (
                        <button
                            key={style}
                            type="button"
                            onClick={() => toggleStyle(style)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 ${
                                isSelected
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-primary/50 hover:text-primary'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
          </div>

          {/* Must See */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">必去景點 (AI 將為您安排最佳時間)</label>
            <textarea 
                className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-accent focus:ring-0 transition-all bg-yellow-50/50 placeholder:text-slate-400"
                rows={3}
                placeholder="例如：淺草寺、晴空塔、築地市場..."
                value={formData.mustSees}
                onChange={e => setFormData({...formData, mustSees: e.target.value})}
            />
          </div>

          <div className="pt-6">
            <Button type="submit" size="lg" className="w-full text-xl py-4 rounded-2xl shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-transform" isLoading={isGenerating}>
              {isGenerating ? '正在為您編織行程...' : '生成我的專屬行程'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};