import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      {/* Graphic Mark */}
      <div className="relative w-12 h-12">
        {/* Main Kiwi Circle SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md transform group-hover:rotate-180 transition-transform duration-700 ease-in-out">
            <defs>
                <radialGradient id="flesh-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="30%" stopColor="#d9f99d" /> {/* Lime 200 */}
                    <stop offset="95%" stopColor="#65a30d" /> {/* Lime 600 */}
                </radialGradient>
            </defs>
            {/* Skin */}
            <circle cx="50" cy="50" r="48" fill="#3f6212" />
            {/* Flesh */}
            <circle cx="50" cy="50" r="44" fill="url(#flesh-grad)" />
            {/* Rays */}
            <g stroke="#f7fee7" strokeWidth="2" strokeLinecap="round" opacity="0.7">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                    <line key={deg} x1="50" y1="50" x2="50" y2="15" transform={`rotate(${deg} 50 50)`} />
                ))}
            </g>
            {/* Seeds */}
            <g fill="#1a2e05">
                 {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map(deg => (
                    <circle key={deg} cx="50" cy="22" r="2.5" transform={`rotate(${deg} 50 50)`} />
                 ))}
            </g>
            {/* Core */}
            <circle cx="50" cy="50" r="13" fill="#fefce8" />
        </svg>

        {/* Plane Badge */}
        <div className="absolute -bottom-1 -right-2 bg-white rounded-full p-1 shadow-md border border-slate-100 z-10">
            <div className="bg-secondary text-white rounded-full w-5 h-5 flex items-center justify-center transform group-hover:scale-110 transition-transform">
                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 transform -rotate-45 translate-x-px">
                     <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
                 </svg>
            </div>
        </div>
      </div>

      {/* Typography */}
      <div className="flex flex-col justify-center">
        <h1 className="font-black text-2xl leading-none tracking-tighter text-primary drop-shadow-sm">
          KW
        </h1>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-secondary leading-tight ml-px">
          Travel
        </span>
      </div>
    </div>
  );
};