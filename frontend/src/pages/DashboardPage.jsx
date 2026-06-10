import React, { useState } from "react";
import ChartsSection from "../components/dashboard/ChartsSection";
import Header from "../components/dashboard/Header";
import PotGrid from "../components/dashboard/PotGrid";
import SummaryCards from "../components/dashboard/SummarySection";
import { useDashboardData } from "../hooks/useDashboardData";
import "../styles/dashboard.css";

const DashboardPage = ({ isDarkMode, toggleTheme }) => {
	const [activeTab, setActiveTab] = useState("Last CE");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPotline, setSelectedPotline] = useState("ALL POTLINE");
	const [sortOrder, setSortOrder] = useState("id"); // 'id', 'highest', 'lowest'

	// Data from custom hook
	const {
		pots,
		summaryStats,
		donutData,
		highCEData,
		downCEData,
		loading,
		error,
	} = useDashboardData(selectedPotline, activeTab);

	const filteredPots = pots
		.filter((pot) => pot.name.toLowerCase().includes(searchQuery.toLowerCase()))
		.sort((a, b) => {
			if (sortOrder === "highest") return b.value - a.value;
			if (sortOrder === "lowest") return a.value - b.value;
			if (sortOrder === "downgrade") return a.delta - b.delta; // Ascending delta (most negative first)
			if (sortOrder === "upgrade") return b.delta - a.delta; // Descending delta (most positive first)
			return a.id - b.id; // Default by ID
		});

	if (error) {
		return (
			<div className="dashboard-error">
				Error loading data. Please try again later.
			</div>
		);
	}

	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
			<Header
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				isDarkMode={isDarkMode}
				toggleTheme={toggleTheme}
				selectedPotline={selectedPotline}
				onPotlineChange={setSelectedPotline}
				simulatedCurrentDate={summaryStats?.lastUpdated}
			/>

			{loading ? (
				<div className="loading-container">
					<div className="loading-spinner"></div>
					<div className="loading-text">Loading Data...</div>
				</div>
			) : (
				<>
					<SummaryCards data={summaryStats} />

					<ChartsSection
						donutData={donutData}
						highCEData={highCEData}
						downCEData={downCEData}
						isDarkMode={isDarkMode}
					/>

					<div className="pot-section-header">
						<h2>Status Pot ({filteredPots.length})</h2>
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<select
								value={sortOrder}
								onChange={(e) => setSortOrder(e.target.value)}
								style={{
									padding: "5px 10px",
									borderRadius: "6px",
									border: "1px solid var(--border-subtle)",
									background: "var(--bg-card)",
									color: "var(--text-primary)",
									cursor: "pointer",
									outline: "none",
									fontSize: "0.9rem",
								}}
							>
								<option value="id">Sort by ID</option>
								<option value="highest">Highest CE</option>
								<option value="lowest">Lowest CE</option>
								<option value="downgrade">Highest Downgrade (Drop)</option>
								<option value="upgrade">Highest Upgrade (Rise)</option>
							</select>
							<span className="pot-hint">Klik pot untuk melihat detail</span>
						</div>
					</div>

					<PotGrid pots={filteredPots} activeTab={activeTab} />
				</>
			)}
		</div>
	);
};

export default DashboardPage;
