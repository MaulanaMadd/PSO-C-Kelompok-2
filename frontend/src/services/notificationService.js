import api from "./api";

export const notificationService = {
	getAll: async () => {
		try {
			const response = await api.get("/notifications/");
			return response.data;
		} catch (error) {
			console.error("Error fetching notifications:", error);
			return [];
		}
	},

	getUnread: async () => {
		try {
			const response = await api.get("/notifications/?unread_only=true");
			return response.data;
		} catch (error) {
			console.error("Error fetching unread notifications:", error);
			return [];
		}
	},

	create: async (type, title, message) => {
		try {
			const response = await api.post("/notifications/", {
				type,
				title,
				message,
			});
			return response.data;
		} catch (error) {
			console.error("Error creating notification:", error);
			return null;
		}
	},

	markAsRead: async (id) => {
		try {
			await api.put(`/notifications/${id}/read/`);
			return true;
		} catch (error) {
			console.error(`Error marking notification ${id} as read:`, error);
			return false;
		}
	},
};
