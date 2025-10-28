import React from 'react';
import { Link } from 'react-router-dom';

const ProjectDeactivated = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-red-600 mb-4">Oops...</h1>
                <p className="text-slate-700 mb-6">
                    Looks like due to inactivity for more than a week, your project has been deactivated.
                </p>
                <p className="text-slate-700">
                    Please reach out to <a href="mailto:prakhar.khare@waivergroup.com" className="text-blue-600 hover:underline">prakhar.khare@waivergroup.com</a>.
                </p>
                <Link to="/client-login" className="mt-8 inline-block bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-slate-800 transition-all">
                    Back to Login
                </Link>
            </div>
        </div>
    );
};

export default ProjectDeactivated;
