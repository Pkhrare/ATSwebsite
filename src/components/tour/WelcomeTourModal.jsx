import React from 'react';

const WelcomeTourModal = ({ onStartTour, onSkipTour, isFirstTime }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 md:p-8" style={{ animation: 'fadeIn 0.3s ease-in' }}>
                <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-8 w-8 text-blue-600" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M13 10V3L4 14h7v7l9-11h-7z" 
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {isFirstTime ? 'Welcome to Your Project Portal!' : 'Take a Tour?'}
                    </h2>
                    <p className="text-slate-600 text-sm md:text-base">
                        {isFirstTime 
                            ? 'Let us guide you through your portal to help you get started quickly.'
                            : 'Would you like to take a guided tour of your project portal?'
                        }
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                        </svg>
                        <p className="text-sm text-slate-700">
                            Learn how to navigate and complete your tasks
                        </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                            />
                        </svg>
                        <p className="text-sm text-slate-700">
                            Understand how to communicate with your consultant
                        </p>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                            />
                        </svg>
                        <p className="text-sm text-slate-700">
                            Discover how to use the AI assistant for help
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onStartTour}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                        Start Tour
                    </button>
                    <button
                        onClick={onSkipTour}
                        className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors duration-200"
                    >
                        Skip Tour
                    </button>
                </div>

                {!isFirstTime && (
                    <p className="text-xs text-slate-500 text-center mt-4">
                        You can always restart the tour by clicking "Take Tour" next to your project title
                    </p>
                )}
            </div>
        </div>
    );
};

export default WelcomeTourModal;

