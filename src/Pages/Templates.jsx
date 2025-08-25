import React from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/layout/Nav';

const Templates = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <Nav />
            <main className="p-8">
                <header className="mb-8">
                    <div className="max-w-7xl mx-auto">
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
                            <p className="mt-2 text-sm text-slate-600">Create, view, and manage all project templates.</p>
                        </div>
                    </div>
                </header>
                <div className="max-w-7xl mx-auto">
                    {/* The rest of the page content will go here */}
                    <div className="bg-white p-8 rounded-lg shadow">
                        <p className="text-slate-500">Template management functionality will be implemented here.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Templates;
