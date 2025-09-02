import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectTemplates } from '../utils/projectTemplates'; // Import the templates
import TemplateProjectCard from '../components/cards/TemplateProjectCard'; // Import the template card

const Templates = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    if (selectedTemplate) {
        return (
            <TemplateProjectCard 
                template={selectedTemplate}
                onClose={() => setSelectedTemplate(null)}
            />
        );
    }

    return (
        <div className="p-8">
            <header className="mb-8">
                <div>
                    {/* Tab Navigation */}
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <Link to="/projects" className="shrink-0 border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700">
                                Projects Dashboard
                            </Link>
                            <Link to="/templates" className="shrink-0 border-b-2 border-blue-600 px-1 pb-4 text-sm font-medium text-blue-600">
                                Projects Template
                            </Link>
                        </nav>
                    </div>
                    <div className="mt-4">
                        <h1 className="text-2xl font-bold leading-tight text-slate-900">Project Templates</h1>
                        <p className="mt-2 text-sm text-slate-600">Select a template to create a new project with a pre-defined set of tasks and settings.</p>
                    </div>
                </div>
            </header>
            <div>
                <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
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
            </div>
        </div>
    );
};

export default Templates;
