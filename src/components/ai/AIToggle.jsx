import React from 'react';

const AIToggle = ({ isAIMode, onToggle, disabled = false, className = '' }) => {
    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <span className={`text-sm font-semibold ${disabled ? 'text-gray-400' : 'text-slate-700'}`}>
                Chat Mode
            </span>
            <div className="relative flex items-center bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
                <button
                    onClick={() => onToggle(false)}
                    disabled={disabled}
                    className={`relative px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out ${
                        !isAIMode
                            ? 'bg-white text-blue-700 shadow-lg border border-blue-200 transform scale-105'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Consultant</span>
                    </span>
                </button>
                <button
                    onClick={() => onToggle(true)}
                    disabled={disabled}
                    className={`relative px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out ${
                        isAIMode
                            ? 'bg-white text-purple-700 shadow-lg border border-purple-200 transform scale-105'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Waiverlyn</span>
                    </span>
                </button>
            </div>
        </div>
    );
};

export default AIToggle;
