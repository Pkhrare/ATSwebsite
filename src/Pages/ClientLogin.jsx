import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
const Logo = () => (
    <svg className="w-20 h-20 text-slate-700 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);



export default function ClientLogin() {
    const [projectName, setProjectName] = useState('');
    const [projectId, setProjectId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!projectName || !projectId) {
            setError('Both fields are required.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const data = await ApiCaller(`/authenticate/${encodeURIComponent(projectName)}/${encodeURIComponent(projectId)}`);

            if (data.records.length === 0) {
                throw new Error('Invalid Project Name or Project ID.');
            }
            
            const projectData = data.records[0];
            navigate(`/client/project/${projectData.id}`, { state: { project: projectData } });

        } catch (err) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 relative">
                <Link to="/" className="absolute top-4 left-4 text-slate-500 hover:text-slate-800" aria-label="Back to landing">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </Link>
                <Logo />
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Client Portal</h2>
                <p className="text-center text-slate-500 mb-8">Access your project details.</p>
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="projectName" className="text-sm font-medium text-slate-700">Project Name</label>
                        <input
                            id="projectName"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="Enter project name"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="projectId" className="text-sm font-medium text-slate-700">Project ID</label>
                        <input
                            id="projectId"
                            type="text"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="Enter project ID"
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-slate-700 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-slate-800 transition-all disabled:bg-slate-400"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Access Project'}
                    </button>
                </form>
            </div>
        </div>
    );
} 