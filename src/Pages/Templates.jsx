import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectTemplates } from '../utils/projectTemplates'; // Import the templates
import TemplateProjectCard from '../components/cards/TemplateProjectCard'; // Import the template card

const Templates = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    return (
        <div className="p-4 md:p-8">
            {/* Tab Navigation - Hidden on mobile, visible on desktop */}
            <div className="hidden md:block border-b border-slate-200 mb-8">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <Link to="/projects" className="shrink-0 border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700">
                        Projects Dashboard
                    </Link>
                    <Link to="/templates" className="shrink-0 border-b-2 border-blue-600 px-1 pb-4 text-sm font-medium text-blue-600">
                        Projects Template
                    </Link>
                    <Link to="/projects?tab=deactivated" className="shrink-0 border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700">
                        Deactivated Projects
                    </Link>
                </nav>
            </div>
            
            {selectedTemplate ? (
                <TemplateProjectCard 
                    template={selectedTemplate}
                    onClose={() => setSelectedTemplate(null)}
                />
            ) : (
                <>
                    {/* Header - Only visible when no template is selected */}
                    <header className="mb-6 md:mb-8">
                        <div className="text-center md:text-left">
                            <h1 className="text-xl md:text-2xl font-bold leading-tight text-slate-900">Project Templates</h1>
                            <p className="mt-2 text-sm text-slate-600">Select a template to create a new project with a pre-defined set of tasks and settings.</p>
                        </div>
                    </header>
                    <div>
                        {/* Desktop List View */}
                        <div className="hidden md:block bg-white p-6 rounded-lg shadow-md border border-slate-200">
                            <div className="space-y-4">
                                {projectTemplates.map((template, index) => (
                                    <div 
                                        key={template.id} 
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`p-4 rounded-lg hover:bg-slate-50 transition-all duration-200 cursor-pointer ${index !== projectTemplates.length - 1 ? 'border-b border-slate-200' : ''}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-md font-bold text-slate-800">{template.name}</h2>
                                                <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                                            </div>
                                            <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                                Select 
                                                <span aria-hidden="true"> →</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="block md:hidden space-y-4">
                            {projectTemplates.map((template) => (
                                <div 
                                    key={template.id} 
                                    onClick={() => setSelectedTemplate(template)}
                                    className="bg-white p-4 rounded-lg shadow-md border border-slate-200 cursor-pointer hover:shadow-lg transition-all duration-200"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h2 className="text-lg font-bold text-slate-800 flex-1 pr-2">{template.name}</h2>
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{template.description}</p>
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">Tap to select</span>
                                            <div className="text-sm font-medium text-blue-600">
                                                Select Template
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Templates;
