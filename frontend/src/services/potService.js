import api from "./api";

export const potService = {
	getPotlines: async () => {
		const response = await api.get("/potlines");
		return response.data;
	},

	getPots: async (potlineId) => {
		const params = potlineId ? { potline_id: potlineId } : {};
		const response = await api.get("/pots", { params });
		return response.data;
	},

	getLayerLatest: async (potlineId) => {
		const params = potlineId ? { potline_id: potlineId } : {};
		const response = await api.get("/layer/5m/latest", { params });
		return response.data;
	},

	getLayerRange: async (potId, start, end) => {
		const response = await api.get("/daily/range", {
			params: { pot_id: potId, start, end },
		});
		return response.data;
	},

	getLog1hRange: async (potId, days = 30) => {
		const response = await api.get("/log/1h/range", {
			params: { pot_id: potId, days },
		});
		return response.data;
	},

	getDailyLatest: async (potlineId, datasetName) => {
		const params = {};
		if (potlineId) params.potline_id = potlineId;
		if (datasetName) params.source = datasetName;
		const response = await api.get("/daily/latest", { params });
		return response.data;
	},

	getStatsTrend: async (potlineId, datasetName) => {
		const params = {};
		if (potlineId) params.potline_id = potlineId;
		if (datasetName) params.source = datasetName;
		const response = await api.get("/stats/trend", { params });
		return response.data;
	},

	getRecommendations: async (potId) => {
		const response = await api.get(`/recommendations/${potId}`);
		return response.data;
	},

	// Helper to combine data for the main dashboard grid
	getDashboardData: async (potlineId) => {
		const [latestLayer, dailyLatest] = await Promise.all([
			potService.getLayerLatest(potlineId),
			potService.getDailyLatest(potlineId),
		]);

		return {
			latestLayer: latestLayer.rows,
			dailyLatest: dailyLatest.rows,
		};
	},
};
