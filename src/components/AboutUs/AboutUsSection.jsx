import React, { useState } from 'react';
import { about_task_group } from '../../utils/AboutContent';
import AboutUsCard from './AboutUsCard';

const AboutUsSection = () => {
    const [selectedTask, setSelectedTask] = useState(null);
    const [isCardVisible, setIsCardVisible] = useState(false);

    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setIsCardVisible(true);
    };

    const handleCloseCard = () => {
        setIsCardVisible(false);
        setSelectedTask(null);
    };

    return (
        <>
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-700">WAIVER CONSULTING GROUP</h2>
                </div>
                
                <div className="space-y-2">
                    {about_task_group.tasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className="group cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 group-hover:text-gray-600 transition-colors">
                                        {task.fields.task_title}
                                    </h3>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {isCardVisible && selectedTask && (
                <AboutUsCard
                    task={selectedTask}
                    onClose={handleCloseCard}
                />
            )}
        </>
    );
};

export default AboutUsSection;
