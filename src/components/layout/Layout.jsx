import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import InfoSidebar from './InfoSidebar';
import { colorClasses } from '../../utils/colorUtils';
import { InfoPageProvider } from '../../utils/InfoPageContext';

const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    return (
        <InfoPageProvider>
            <div className={`min-h-screen ${colorClasses.bg.secondary} flex flex-col`}>
                <Nav onToggleSidebar={toggleSidebar} />
                <div className="flex flex-1 overflow-hidden">
                    <InfoSidebar isCollapsed={isSidebarCollapsed} />
                    <div className="flex-1 overflow-y-auto">
                        <Outlet />
                    </div>
                </div>
            </div>
        </InfoPageProvider>
    );
};

export default Layout;