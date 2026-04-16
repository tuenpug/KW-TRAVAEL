import React from 'react';
import { TripData, Itinerary } from '../types';
import { addDays, parseISO, format } from 'date-fns';
import { MapPin, Clock, Star, Calendar } from 'lucide-react';
import { Logo } from '../components/Logo';

interface ItineraryOverviewProps {
  tripData: TripData;
  itinerary: Itinerary;
}

export const ItineraryOverview: React.FC<ItineraryOverviewProps> = ({ tripData, itinerary }) => {
  const days = Array.from({ length: calculateDays(tripData.arrivalDate, tripData.departureDate) }, (_, i) => i);

  return (
    <div className="min-h-full bg-white/40 p-8 print:p-0 flex justify-center backdrop-blur-sm print:block print:w-full print:bg-white print:backdrop-filter-none">
        <div className="max-w-4xl w-full print:max-w-none print:w-full bg-white shadow-2xl print:shadow-none rounded-3xl print:rounded-none overflow-hidden relative print:bg-white">
            {/* Poster Header */}
            <div className="bg-primary p-6 md:p-12 text-center text-white relative overflow-hidden print:hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-300 via-primary to-green-800"></div>
                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
                            <Logo className="text-white scale-125" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight mb-4 drop-shadow-md">{tripData.destination}</h1>
                    <div className="inline-block bg-white/20 backdrop-blur rounded-full px-6 py-2 text-lg font-bold">
                        {tripData.arrivalDate} <span className="mx-2">➔</span> {tripData.departureDate}
                    </div>
                    
                    <div className="flex justify-center gap-6 mt-8 font-medium opacity-90">
                        <span className="flex items-center gap-2"><MapPin className="w-5 h-5 text-accent"/> {tripData.destination}</span>
                        <span>|</span>
                        <span>{tripData.adults} 大人, {tripData.children} 小童</span>
                        <span>|</span>
                        <span>{tripData.styles.join(' • ')}</span>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-8 md:p-12 print:p-2 space-y-16 print:space-y-0 print:block print:columns-4 print:gap-6 bg-white">
                {days.map(dayIndex => {
                    const date = addDays(parseISO(tripData.arrivalDate), dayIndex);
                    const activities = itinerary
                        .filter(a => a.dayIndex === dayIndex)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                        <div key={dayIndex} className="relative print:break-inside-avoid print:mb-6">
                            {/* Day Header */}
                            <div className="flex items-start gap-6 mb-8 print:mb-4 print:gap-4">
                                <div className="flex-none text-center">
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-xs">{format(date, 'MMM')}</div>
                                    <div className="text-4xl font-black text-slate-800 print:text-2xl">{format(date, 'dd')}</div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-primary flex items-center gap-3 print:text-lg">
                                        Day {dayIndex + 1}
                                        <span className="text-slate-300 text-lg font-normal print:text-sm">/ {format(date, 'EEEE')}</span>
                                    </h2>
                                    <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 text-sm print:text-xs print:px-2">
                                        <HomeIcon className="w-4 h-4 text-secondary" />
                                        住宿: {tripData.dailyAccommodations[dayIndex] || tripData.accommodation}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div className="border-l-2 border-slate-100 ml-5 space-y-8 pb-4 print:space-y-4 print:pb-0">
                                {activities.map(activity => (
                                    <div key={activity.id} className="relative pl-8 group">
                                        {/* Timeline Dot */}
                                        <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm ${activity.rating === 5 ? 'bg-accent scale-125' : 'bg-primary'}`}></div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 print:flex-col print:gap-2">
                                            <div className="w-20 pt-1 font-bold text-slate-400 text-sm flex-none print:w-full print:pt-0">
                                                {activity.startTime}
                                            </div>
                                            
                                            <div className="flex-1 bg-slate-50 rounded-2xl p-5 print:p-3 hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-slate-100 group-hover:-translate-y-1 duration-300">
                                                <div className="flex justify-between items-start mb-2 print:mb-1">
                                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-primary transition-colors print:text-base">{activity.title}</h3>
                                                    {activity.rating === 5 && (
                                                        <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                            <Star className="w-3 h-3 fill-current" /> 必去
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed mb-3 print:text-xs print:mb-2 print:-mt-1">{activity.description}</p>
                                                <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider print:text-[10px]">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {activity.durationMinutes} 分鐘</span>
                                                    <span className={`px-2 py-0.5 rounded ${activity.type === 'food' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {activity.type === 'food' ? '美食' : activity.type === 'sight' ? '景點' : activity.type === 'shopping' ? '購物' : '活動'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 p-8 text-center border-t border-slate-100 print:hidden">
                 <Logo className="justify-center opacity-50 grayscale hover:grayscale-0 transition-all mb-2" />
                 <p className="text-slate-400 text-sm">Created with AI • Happy Travels!</p>
            </div>
        </div>
    </div>
  );
};

function calculateDays(start: string, end: string) {
    if(!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    return Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

const HomeIcon = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);