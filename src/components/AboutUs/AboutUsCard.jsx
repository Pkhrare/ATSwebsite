import React, { useRef, useEffect, useState } from 'react';
import RichTextEditor from '../richText/RichTextEditor';
import { toLexical } from '../../utils/lexicalUtils';

const AboutUsCard = ({ task, onClose }) => {
    const [isContentLoading, setIsContentLoading] = useState(true);
    const descriptionRef = useRef(null);
    const modalContentRef = useRef(null);

    useEffect(() => {
        // Initialize the description content
        const initializeDescription = async () => {
            if (task.fields.description) {
                try {
                    // Parse the JSON string if it's a string, otherwise use as is
                    const descriptionContent = typeof task.fields.description === 'string' 
                        ? JSON.parse(task.fields.description)
                        : task.fields.description;
                    
                    descriptionRef.current = descriptionContent;
                } catch (error) {
                    console.error('Error parsing description:', error);
                    descriptionRef.current = toLexical(task.fields.description || '');
                }
            } else {
                descriptionRef.current = toLexical('');
            }
            
            // Wait a bit to ensure content is properly initialized
            setTimeout(() => {
                setIsContentLoading(false);
            }, 100);
        };
        
        initializeDescription();
    }, [task]);

    // Handle click outside to close modal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalContentRef.current && !modalContentRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Prevent propagation from the overlay itself
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!task) return null;

    // Loading screen
    if (isContentLoading) {
        return (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">Loading...</h2>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
            <div ref={modalContentRef} className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{task.fields.task_title}</h2>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="max-w-none">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Content
                            </h3>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <div className="[&_.editor-text]:text-black [&_.editor-paragraph]:text-black [&_p]:text-black [&_div]:text-black [&_span]:text-black">
                                <RichTextEditor
                                    isEditable={false}
                                    initialContent={descriptionRef.current}
                                    onChange={() => {}} // No-op since it's read-only
                                    sourceTable="about_us"
                                    sourceRecordId={task.id}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-end">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutUsCard;
