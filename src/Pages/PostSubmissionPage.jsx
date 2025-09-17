import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const PostSubmissionPage = () => {
    const location = useLocation();
    const { projectId, projectName } = location.state || {}; // Safely access state

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
            <div className="max-w-xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-lg border border-slate-200 text-center">
                <svg className="mx-auto h-12 w-12 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="mt-4 text-2xl font-bold text-slate-800">Submission Successful!</h1>
                <p className="mt-2 text-slate-600">
                    Thank you for submitting your project details. A new project has been created for you.
                    You will receive an email shortly with an invitation to your Client Portal. Please use the following credentials to log in for the first time.
                </p>

                {projectId && projectName ? (
                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-left space-y-3">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Your Project Name (Username):</p>
                            <p className="text-lg font-mono font-semibold text-slate-800 bg-slate-200 p-2 rounded">{projectName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Your Project ID (Password):</p>
                            <p className="text-lg font-mono font-semibold text-slate-800 bg-slate-200 p-2 rounded">{projectId}</p>
                        </div>
                    </div>
                ) : (
                    <p className="mt-6 text-slate-500">Loading project details...</p>
                )}
                
                <div className="mt-8">
                    <Link to="/client-login" className="inline-block w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                        Go to Client Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default PostSubmissionPage;
