import React, { useState, useRef, useEffect } from 'react';

const AIDropdown = ({ isAIMode, onToggle, disabled = false, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (aiMode) => {
        onToggle(aiMode);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 ${
                    isAIMode 
                        ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className={`w-2 h-2 rounded-full ${isAIMode ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                <span>{isAIMode ? 'Waiverlyn' : 'Consultant'}</span>
                <svg 
                    className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                        <button
                            onClick={() => handleOptionClick(false)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                                !isAIMode ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                            }`}
                        >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Consultant</span>
                        </button>
                        <button
                            onClick={() => handleOptionClick(true)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                                isAIMode ? 'bg-purple-50 text-purple-700' : 'text-slate-700'
                            }`}
                        >
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Waiverlyn</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIDropdown;
