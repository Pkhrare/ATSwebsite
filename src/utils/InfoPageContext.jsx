import React, { createContext, useState, useContext, useCallback } from 'react';
import ApiCaller from '../components/apiCall/ApiCaller';

const InfoPageContext = createContext();

export const useInfoPages = () => useContext(InfoPageContext);

export const InfoPageProvider = ({ children }) => {
    const [pages, setPages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchInfoPages = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ApiCaller('/info-pages');
            setPages(data || []);
        } catch (err) {
            setError('Failed to load informational pages.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value = {
        pages,
        isLoading,
        error,
        fetchInfoPages
    };

    return (
        <InfoPageContext.Provider value={value}>
            {children}
        </InfoPageContext.Provider>
    );
};
