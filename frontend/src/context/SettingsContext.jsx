
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:8000/api/v1'; // Or use env var if properly set up in Vite

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            // Allow fetch even if no token? For now assumed protected or public enough for dashboard.
            // But we can add header if exists.
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.get(`${API_URL}/settings/standards`, { headers });

            // Convert list to map
            const settingsMap = {};
            if (res.data && res.data.standards) {
                res.data.standards.forEach(s => {
                    settingsMap[s.key] = s;
                });
            }
            setSettings(settingsMap);
        } catch (err) {
            console.error("Failed to fetch settings", err);
        } finally {
            setLoading(false);
        }
    };

    // Load on mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSettings = async (updates) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const res = await axios.put(`${API_URL}/settings/standards`, updates, { headers });

            // Update local state with the returned updated items
            const newSettings = { ...settings };
            if (Array.isArray(res.data)) {
                res.data.forEach(s => {
                    newSettings[s.key] = s;
                });
            }
            setSettings(newSettings);
            return true;
        } catch (err) {
            console.error("Failed to update settings", err);
            return false;
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, fetchSettings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
