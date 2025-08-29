import React from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import InfoSidebar from './InfoSidebar';
import { colorClasses } from '../../utils/colorUtils';

const Layout = () => {
    return (
        <div className={`min-h-screen ${colorClasses.bg.secondary} flex flex-col`}>
            <Nav />
            <div className="flex flex-1 overflow-hidden">
                <InfoSidebar />
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;