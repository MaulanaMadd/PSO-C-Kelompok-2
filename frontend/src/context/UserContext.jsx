import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	const fetchUser = async () => {
		try {
			const data = await authService.getProfile();
			// Force role to "User" as per user request (consistent with ProfilePage logic)
			if (data) data.role = "User";
			setUser(data);
		} catch (err) {
			console.error("Failed to load user profile", err);
			// Fallback to token if needed
			const token = authService.getToken();
			if (token) {
				try {
					const payload = JSON.parse(atob(token.split(".")[1]));
					if (payload.sub) {
						setUser({ full_name: "User", email: payload.sub, role: "User" });
					}
				} catch (e) {
					setUser(null);
				}
			} else {
				setUser(null);
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Only fetch if token exists
		if (authService.getToken()) {
			fetchUser();
		} else {
			setLoading(false);
		}
	}, []);

	const refreshUser = () => {
		return fetchUser();
	};

	const login = async (credentials) => {
		const data = await authService.login(credentials);
		await fetchUser(); // Immediately fetch user profile after successful login
		return data;
	};

	const logout = () => {
		authService.logout();
		setUser(null);
	};

	return (
		<UserContext.Provider value={{ user, loading, refreshUser, login, logout }}>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
};
