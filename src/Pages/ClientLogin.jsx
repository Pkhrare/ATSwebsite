import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import { useAuth } from '../utils/AuthContext';
import companyLogo from '../assets/companyLogo2.avif'; // Import the logo

const Logo = () => (
    <img src={companyLogo} alt="Company Logo" className="w-65 mx-auto mb-6" />
);


export default function ClientLogin() {
    const [projectName, setProjectName] = useState('');
    const [projectId, setProjectId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { startClientSession } = useAuth();

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

            if (projectData.fields['Operation'] === 'Deactivated') {
                navigate('/project-deactivated');
                return;
            }
            
            // If authentication is successful, start the client session
            startClientSession();

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