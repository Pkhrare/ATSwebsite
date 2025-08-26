import React from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './Nav';

const Layout = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <Nav />
            <Outlet /> 
        </div>
    );
};

export default Layout;
