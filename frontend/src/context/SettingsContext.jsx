import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
	const [settings, setSettings] = useState({});
	const [loading, setLoading] = useState(true);

	const fetchSettings = async () => {
		try {
			const res = await api.get(`/settings/standards`);

			// Convert list to map
			const settingsMap = {};
			if (res.data && res.data.standards) {
				res.data.standards.forEach((s) => {
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
			const res = await api.put(`/settings/standards`, updates);

			// Update local state with the returned updated items
			const newSettings = { ...settings };
			if (Array.isArray(res.data)) {
				res.data.forEach((s) => {
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
		<SettingsContext.Provider
			value={{ settings, loading, fetchSettings, updateSettings }}
		>
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
