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
        setError(null);
        try {
            const data = await ApiCaller('/info-pages');
            setPages(data || []);
        } catch (err) {
            const errorMessage = err.message || 'Failed to load informational pages.';
            setError(errorMessage);
            console.error('Error fetching info pages:', errorMessage);
            // Don't throw - let the component handle the error state
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
