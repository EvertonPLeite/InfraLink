import React from 'react';

export const Logo = ({ className = "h-12 w-auto", src }: { className?: string; src?: string }) => {
  if (src) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <img src={src} alt="Logo" className="h-full w-auto object-contain" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,255,136,0.3)]"
      >
        <defs>
          <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#0066FF" />
          </linearGradient>
          <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00FF88" />
            <stop offset="100%" stopColor="#7CFF00" />
          </linearGradient>
        </defs>

        {/* Wifi Waves (Top) */}
        <path
          d="M75 50C95 35 140 35 165 55"
          stroke="url(#blue-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M95 75C108 65 140 65 155 80"
          stroke="url(#blue-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Left Side: Connecting Nodes and Lines */}
        <path
          d="M38 75C45 110 55 130 90 175"
          stroke="url(#blue-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M68 95C72 120 78 140 100 165"
          stroke="url(#blue-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Nodes */}
        <circle cx="38" cy="75" r="14" fill="url(#blue-gradient)" />
        <circle cx="68" cy="95" r="13" fill="url(#blue-gradient)" />
        <circle cx="115" cy="100" r="15" fill="url(#green-gradient)" />

        {/* Right Side: Neon Green Sweeps (Nike-like) */}
        <path
          d="M100 115C95 140 105 170 125 185C160 160 185 110 185 70C155 120 120 120 100 115Z"
          fill="url(#green-gradient)"
        />
        <path
          d="M94 135C90 155 100 180 115 190C140 165 160 120 160 85C135 135 110 135 94 135Z"
          fill="url(#green-gradient)"
          opacity="0.7"
        />

        {/* Final Curve matching the shield bottom profile */}
        <path
          d="M90 175C95 185 105 195 120 195C140 190 160 160 175 115"
          stroke="url(#green-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
      
      <div className="flex flex-col select-none">
        <div className="text-2xl md:text-3xl font-black tracking-tighter leading-none flex items-center">
          <span className="text-white">Infra</span>
          <span className="text-brand-cyan">Link</span>
        </div>
        <div className="text-[10px] md:text-xs font-bold tracking-[0.6em] text-brand-neon uppercase mt-0.5 pl-1">
          EVENTOS
        </div>
      </div>
    </div>
  );
};

