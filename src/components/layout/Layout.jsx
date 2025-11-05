import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import Sidebar from './Sidebar'; // Import the new Sidebar
import InfoSidebar from './InfoSidebar';
import { colorClasses } from '../../utils/colorUtils';
import { InfoPageProvider } from '../../utils/InfoPageContext';
import AIAssistant from '../aiAssistant/AIAssistant';

const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    return (
        <InfoPageProvider>
            <div className={`min-h-screen ${colorClasses.bg.secondary} flex flex-col`}>
                <Nav onToggleSidebar={toggleSidebar} />
                <Sidebar /> {/* Add the new Sidebar */}
                <div className="flex flex-1 overflow-hidden">
                    <div className="hidden md:block"> {/* Hide InfoSidebar on small screens */}
                        <InfoSidebar isCollapsed={isSidebarCollapsed} />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <Outlet />
                    </div>
                </div>
                <AIAssistant />
            </div>
        </InfoPageProvider>
    );
};

export default Layout;