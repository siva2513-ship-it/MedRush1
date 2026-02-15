
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-24 h-24 animate-float">
        {/* Heartbeat Cross Style Logo */}
        <div className="absolute inset-0 bg-blue-500 rounded-3xl rotate-45 opacity-20"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="absolute -top-2 -right-2">
           <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-white"></div>
        </div>
      </div>
      <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
        Med<span className="text-blue-600">Rush</span>
      </h1>
    </div>
  );
};

export default Logo;
