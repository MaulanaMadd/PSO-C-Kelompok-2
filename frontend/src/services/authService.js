import api from "./api";

export const authService = {
	login: async (credentials) => {
		// credentials = { username: "email", password: "pw" }
		// Backend expects form-data for OAuth2
		const formData = new FormData();
		formData.append("username", credentials.email);
		formData.append("password", credentials.password);

		const response = await api.post("/auth/login", formData);
		if (response.data.access_token) {
			localStorage.setItem("authToken", response.data.access_token);
		}
		return response.data;
	},
	signup: async (userData) => {
		// userData = { email, password, full_name }
		const response = await api.post("/auth/signup", userData);
		return response.data;
	},
	logout: () => {
		localStorage.removeItem("authToken");
		window.location.href = "/login";
	},
	getToken: () => {
		return localStorage.getItem("authToken");
	},
	isAuthenticated: () => {
		return !!localStorage.getItem("authToken");
	},
	getProfile: async () => {
		const response = await api.get(`/auth/me?t=${new Date().getTime()}`);
		return response.data;
	},
	updateProfile: async (data) => {
		const response = await api.put("/auth/me", data);
		return response.data;
	},
};
