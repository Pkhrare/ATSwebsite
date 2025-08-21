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
                        <div className="flex items-center space-x-4 text-2xl font-bold text-slate-500">
                            <Link to="/projects" className="hover:text-slate-900 transition-colors">Projects Dashboard</Link>
                            <span className="text-slate-400">/</span>
                            <h1 className="text-2xl font-bold text-slate-800">Projects Template</h1>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Create, view, and manage all project templates.</p>
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
