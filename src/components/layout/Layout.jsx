import React from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import InfoSidebar from './InfoSidebar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
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