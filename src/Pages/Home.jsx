import React, { useEffect, useState, useCallback } from 'react';
import Nav from '../components/layout/Nav';
import Card from '../components/cards/ProjectCard';
import { useAuth } from '../utils/AuthContext';
import ApiCaller from '../components/apiCall/ApiCaller';

const Home = () => {
    const [incompleteActions, setIncompleteActions] = useState([]);
    const [actionsLoading, setActionsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isCardVisible, setIsCardVisible] = useState(false);

    const { currentUser } = useAuth();

    const fetchIncompleteActions = useCallback(async () => {
        setActionsLoading(true);
        try {
            const data = await ApiCaller('/actions/incomplete');
            setIncompleteActions(data);
        } catch (error) {
            console.error("Error fetching incomplete actions:", error);
        } finally {
            setActionsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchIncompleteActions();
        }
    }, [fetchIncompleteActions, currentUser]);

    const handleActionClick = async (action) => {
        const projectRecordId = action.fields['Project ID']?.[0];
        if (!projectRecordId) {
            console.error("Project Record ID is missing for this action");
            alert("Could not open project: Project link is missing.");
            return;
        }
        try {
            const projectData = await ApiCaller(`/records/projects/${projectRecordId}`);
            setSelectedProject(projectData);
            setIsCardVisible(true);
        } catch (error) {
            console.error("Error fetching project:", error);
            alert("Error fetching project details. Please try again.");
        }
    };

    const handleCardClose = () => {
        setIsCardVisible(false);
        setSelectedProject(null);
        fetchIncompleteActions();
    };

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <>
            <Nav />
            <main className="bg-slate-50 min-h-screen">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-800">
                            Hello, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                        </h1>
                        <h2 className="text-xl font-semibold text-slate-700">{currentDate}</h2>
                        <p className="mt-1 text-sm text-slate-600">Here are your outstanding actions that require attention.</p>
                    </header>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-5 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-700">⚡️ Incomplete Actions</h2>
                        </div>
                        {actionsLoading ? (
                            <p className="text-center p-8 text-slate-500">Loading actions...</p>
                        ) : incompleteActions.length > 0 ? (
                            <ul className="divide-y divide-slate-200">
                                {incompleteActions.map(action => (
                                    <li key={action.id} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleActionClick(action)}>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-800 font-medium">{action.fields.action_description}</p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span>Project: <span className="font-semibold text-slate-600">{action.fields.ProjectName} ({action.fields.ProjectCustomID})</span></span>
                                                    <span>Est. Completion: <span className="font-semibold text-slate-600">{action.fields.estimated_completion_date}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center p-8 text-slate-500">No incomplete actions. Great job!</p>
                        )}
                    </div>
                </div>
            </main>
            
            {isCardVisible && selectedProject && (
                <Card
                    data={selectedProject}
                    onClose={handleCardClose}
                    onProjectUpdate={() => {}}
                />
            )}
        </>
    );
};

export default Home; 