import { ArrowLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import Header from "../components/dashboard/Header";
import { useDashboardData } from "../hooks/useDashboardData";
import "../styles/dashboard.css"; // Reusing dashboard styles for now

const PotlineMapPage = ({ isDarkMode, toggleTheme }) => {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("LAST CURRENT");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPotline, setSelectedPotline] = useState("ALL POTLINE"); // Default to ALL POTLINE

	// Use the custom hook to fetch real data
	const { pots, summaryStats, loading, error } =
		useDashboardData(selectedPotline);

	// Determine layout mode
	const isAllPotlines = selectedPotline === "ALL POTLINE";
	const totalPots = isAllPotlines ? 510 : 170;

	// Generate the full pot list based on real data + dummy data
	const generateFullPotList = () => {
		const fullList = [];

		// Helper to generate a range of pots
		const generateRange = (start, end) => {
			for (let i = start; i <= end; i++) {
				// Check if we have real data
				const realPot = pots.find((p) => p.id === i);
				if (realPot) {
					fullList.push(realPot);
				} else {
					// Default to OFFLINE if no real data exists
					// User requested: "Sisany yang tidak ada datanya bisa di OFFLINE kan dulu"
					fullList.push({
						id: i,
						name: `Pot ${i}`,
						bt: 0,
						ce: 0,
						v: 0,
					});
				}
			}
		};

		// Potline 1: 101-185, 201-285
		generateRange(101, 185);
		generateRange(201, 285);

		// Potline 2: 301-385, 401-485 (Assumed pattern)
		generateRange(301, 385);
		generateRange(401, 485);

		// Potline 3: 501-585, 601-685 (Assumed pattern)
		generateRange(501, 585);
		generateRange(601, 685);

		return fullList;
	};

	const fullPotList = generateFullPotList();

	const filters = [
		{ id: "all", label: "All Status" },
		{ id: "offline", label: "Offline" },
		{ id: "warning", label: "Warning" },
		{ id: "critical", label: "Critical" },
	];

	// Filter based on search query
	const isSearching = searchQuery.length > 0;
	const filteredDisplayPots = isSearching
		? fullPotList.filter(
				(pot) =>
					pot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					pot.id.toString().includes(searchQuery),
			)
		: fullPotList;

	// Block Configuration Generator
	const generateBlocks = () => {
		// Define base blocks for a single potline (Ordered Left-to-Right for Grid)
		// User wants "Block 1-4" on the Left (was Block 1), "Block 1-1" on the Right (was Block 7)

		const baseBlocks = [
			// Row 1 Left: Block 1-2 & 2-2
			{
				id: "b2",
				suffix: "2",
				count: 42,
				series1Start: 122,
				series1End: 142,
				series2Start: 222,
				series2End: 242,
			},
			// Row 1 Right: Block 1-1 & 2-1 (Starts here per user request)
			{
				id: "b1",
				suffix: "1",
				count: 42,
				series1Start: 101,
				series1End: 121,
				series2Start: 201,
				series2End: 221,
			},
			// Row 2 Left: Block 1-4 & 2-4
			{
				id: "b4",
				suffix: "4",
				count: 44,
				series1Start: 164,
				series1End: 185,
				series2Start: 264,
				series2End: 285,
			},
			// Row 2 Right: Block 1-3 & 2-3
			{
				id: "b3",
				suffix: "3",
				count: 42,
				series1Start: 143,
				series1End: 163,
				series2Start: 243,
				series2End: 263,
			},
		];

		if (!isAllPotlines) {
			// Determine Potline Index (0, 1, 2)
			let plIndex = 0;
			if (selectedPotline === "POTLINE 2") plIndex = 1;
			if (selectedPotline === "POTLINE 3") plIndex = 2;

			const idOffset = plIndex * 200;
			const seriesA = plIndex * 2 + 1;
			const seriesB = plIndex * 2 + 2;

			// Adjust ranges for single view dynamically
			return baseBlocks.map((b) => ({
				...b,
				name: `Block ${seriesA}-${b.suffix} & ${seriesB}-${b.suffix}`,
				labelTop: `BLOCK ${seriesA}-${b.suffix}`,
				labelBottom: `BLOCK ${seriesB}-${b.suffix}`,
				potlineIndex: plIndex,
				// Shift the ID ranges
				series1Start: b.series1Start + idOffset,
				series1End: b.series1End + idOffset,
				series2Start: b.series2Start + idOffset,
				series2End: b.series2End + idOffset,
			}));
		}

		// For ALL POTLINE
		let allBlocks = [];
		for (let pl = 0; pl < 3; pl++) {
			// Calculate offsets for IDs
			const idOffset = pl * 200;

			// Calculate Series Numbers
			// PL1 (0): 1 & 2
			// PL2 (1): 3 & 4
			// PL3 (2): 5 & 6
			const seriesA = pl * 2 + 1;
			const seriesB = pl * 2 + 2;

			const plBlocks = baseBlocks.map((b) => ({
				...b,
				id: `${pl + 1}-${b.id}`,
				name: `Block ${seriesA}-${b.suffix} & ${seriesB}-${b.suffix}`,
				labelTop: `BLOCK ${seriesA}-${b.suffix}`,
				labelBottom: `BLOCK ${seriesB}-${b.suffix}`,
				potlineIndex: pl,
				// Shift the ID ranges
				series1Start: b.series1Start + idOffset,
				series1End: b.series1End + idOffset,
				series2Start: b.series2Start + idOffset,
				series2End: b.series2End + idOffset,
			}));
			allBlocks = [...allBlocks, ...plBlocks];
		}
		return allBlocks;
	};

	// Updated Helper to get display items based on explicit ID ranges
	const getBlockDisplayItems = (block, allPots) => {
		// Find pots by ID range instead of generic slicing
		const pots1 = allPots.filter(
			(p) => p.id >= block.series1Start && p.id <= block.series1End,
		);
		const pots2 = allPots.filter(
			(p) => p.id >= block.series2Start && p.id <= block.series2End,
		);

		// Return separate arrays for strict row control
		return { pots1, pots2 };
	};

	const blocks = generateBlocks();

	// Helper to determine status color based on value
	const getStatusColor = (type, value) => {
		const val = parseFloat(value);

		switch (type) {
			case "bt":
				// Green: 940-960
				if (val >= 940 && val <= 960) return "status-optimal";
				// Yellow: Slightly off (e.g. +/- 10-15 degrees)
				// < 940 (e.g. 925-939) OR > 960 (e.g. 961-975)
				if ((val >= 925 && val < 940) || (val > 960 && val <= 975))
					return "status-warning";
				// Red: Excessive deviation
				return "status-critical";
			case "ce":
				// Offline / Maintenance
				if (val === 0) return "status-offline";
				// Standard: Green (> 90), Yellow (85-90), Red (< 85)
				if (val > 90) return "status-optimal";
				if (val >= 85) return "status-warning";
				return "status-critical";
			case "v":
				// Green: 4.0-4.5
				if (val >= 4.0 && val <= 4.5) return "status-optimal";
				// Yellow: Slightly off (e.g. +/- 0.2V)
				// 3.8-3.99 OR 4.51-4.7
				if ((val >= 3.8 && val < 4.0) || (val > 4.5 && val <= 4.7))
					return "status-warning";
				// Red: Excessive deviation (< 3.8 or > 4.7)
				return "status-critical";
			default:
				return "status-optimal";
		}
	};

	// Helper for direct color codes if CSS classes aren't enough for the specific banded look
	const getBackgroundColor = (type, value) => {
		const status = getStatusColor(type, value);
		if (status === "status-offline") return "#1e293b"; // Dark Slate (Black-ish)
		if (status === "status-optimal") return "#86efac"; // Green-300ish
		if (status === "status-warning") return "#fcd34d"; // Amber-300ish
		if (status === "status-critical") return "#fca5a5"; // Red-300ish
		return "#e2e8f0";
	};

	// Helper for text color based on background
	const getTextColor = (type, value) => {
		const status = getStatusColor(type, value);
		if (status === "status-offline") return "#ffffff"; // White text for dark background
		return "#1e293b"; // Standard dark text
	};

	// Helper to get indicator value (1, 0, -1) based on status
	const getIndicatorValue = (type, value) => {
		const status = getStatusColor(type, value);
		if (status === "status-optimal") return 1;
		if (status === "status-warning") return 0;
		if (status === "status-critical") return -1;
		return "-"; // Offline or unknown
	};

	// Helper to render ultra-compact pot card (Indicator Style - Super Condensed)
	const renderPotCard = (pot) => {
		const isOffline = pot.ce === 0;
		const offlineBg = "#1e293b";
		const offlineText = "#ffffff";

		// Conditional Font Sizes
		const idFontSize = isAllPotlines ? "0.4rem" : "0.6rem"; // Larger for single view

		return (
			<div
				key={pot.id}
				onClick={() =>
					navigate(`/pot/${pot.id}`, { state: { from: "/potline-map" } })
				}
				style={{
					display: "flex",
					cursor: "pointer",
					flexDirection: "column",
					border: "1px solid var(--border-subtle)",
					borderRadius: "3px",
					overflow: "hidden",
					fontSize: "0.4rem", // Reduced from 0.5rem
					background: "white",
					lineHeight: "1",
					height: "100%",
					direction: "ltr",
					minHeight: "32px", // Reduced from 40px
				}}
			>
				{/* ID Header - Micro */}
				<div
					style={{
						background: "#f1f5f9",
						textAlign: "center",
						fontWeight: "normal", // Removed bold
						color: "#475569",
						borderBottom: "1px solid #e2e8f0",
						padding: "0px 0", // Reduced padding
						fontSize: idFontSize, // Dynamic size
						lineHeight: "1.1",
					}}
				>
					{pot.id}
				</div>

				{/* Metrics - Stacked Colored Bars */}
				<div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
					{/* CE Indicator - Single Block */}
					<div
						style={{
							backgroundColor: isOffline
								? offlineBg
								: getBackgroundColor("ce", pot.ce),
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							padding: "0",
							color: isOffline ? offlineText : getTextColor("ce", pot.ce),
							fontWeight: "bold",
							flex: 1,
							minHeight: "8px", // Reduced from 10px
							fontSize: "0.4rem", // Reduced from 0.5rem
						}}
					>
						{/* {isOffline ? '-' : getIndicatorValue('ce', pot.ce)} */}
					</div>
				</div>
			</div>
		);
	};

	const renderLegend = ({ style = {}, vertical = false }) => {
		// Micro Label
		const renderLabel = ({ color, text, subText, width = "35px" }) => (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "1px",
				}}
			>
				<div
					style={{
						background: color,
						color: color === "#1e293b" ? "white" : "#1e293b",
						fontSize: "0.65rem",
						fontWeight: "800",
						padding: "2px 0",
						width: width,
						textAlign: "center",
						borderRadius: "3px",
						lineHeight: "1",
						border: "1px solid rgba(0,0,0,0.05)",
					}}
				>
					{text}
				</div>
				{subText && (
					<span
						style={{
							fontSize: "0.5rem",
							color: "var(--text-secondary)",
							fontWeight: "600",
						}}
					>
						{subText}
					</span>
				)}
			</div>
		);

		// Unit Table Helper Components
		const renderUnitCell = ({ label, first, last }) => (
			<div
				style={{
					background: label === "ID" ? "#e2e8f0" : "#f0fdf4",
					color: label === "ID" ? "#64748b" : "#166534",
					fontSize: "0.5rem",
					textAlign: "center",
					fontWeight: "bold",
					padding: "4px 0",
					width: "32px",
					border: "1px solid #94a3b8",
					borderTop: first ? "1px solid #94a3b8" : "none",
					borderRadius: first ? "2px 2px 0 0" : last ? "0 0 2px 2px" : "0",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
				}}
			>
				{label}
			</div>
		);

		// Original Horizontal Unit Section (Keep for All Potlines view)
		const renderHorizontalUnitSection = () => (
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						fontSize: "0.7rem",
						fontWeight: "800",
						color: "var(--text-secondary)",
					}}
				>
					UNIT:
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						border: "1px solid #94a3b8",
						width: "32px",
						borderRadius: "2px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							background: "#e2e8f0",
							fontSize: "0.5rem",
							textAlign: "center",
							color: "#64748b",
							fontWeight: "bold",
							padding: "1px",
						}}
					>
						ID
					</div>
					<div
						style={{
							background: "#f0fdf4",
							fontSize: "0.5rem",
							textAlign: "center",
							color: "#166534",
							borderTop: "1px solid #cbd5e1",
							padding: "1px",
						}}
					>
						CE
					</div>
				</div>
			</div>
		);

		const renderStatusSection = () => (
			<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
				<div
					style={{
						fontSize: "0.7rem",
						fontWeight: "800",
						color: "var(--text-secondary)",
						minWidth: vertical ? "auto" : "auto",
					}}
				>
					STATUS:
				</div>
				{renderLabel({color: "#1e293b", text: "OFF", subText: "Offline", width: "45px"})}
				{renderLabel({color: "#f0fdf4", text: "ON", subText: "Normal", width: "45px"})}
			</div>
		);

		return (
			<div
				style={{
					padding: "10px 15px",
					background: isDarkMode ? "#1e293b" : "white",
					border: "1px solid var(--border-subtle)",
					borderRadius: "8px",
					display: "flex",
					alignItems: vertical ? "flex-start" : "center",
					justifyContent: vertical ? "flex-start" : "center",
					gap: vertical ? "0.5rem" : "2rem",
					flexDirection: vertical ? "column" : "row",
					width: vertical ? "100%" : "100%",
					height: "100%",
					flexShrink: 0,
					boxShadow: vertical ? "none" : "0 -2px 10px rgba(0,0,0,0.02)",
					...style,
				}}
			>
				{vertical ? (
					// VERTICAL GRID LAYOUT
					<>
						<div
							style={{
								width: "100%",
								display: "flex",
								justifyContent: "center",
							}}
						>
							{renderStatusSection()}
						</div>

						<div
							style={{
								width: "100%",
								height: "1px",
								background: "var(--border-subtle)",
								margin: "2px 0",
							}}
						></div>

						{/* Grid: Unit Columns (Left) Headers for Metrics (Right) */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "min-content 1fr",
								gap: "0 12px",
								width: "100%",
								alignItems: "stretch",
							}}
						>
							{/* Row 1: ID */}
							{renderUnitCell({label: "ID", first: true})}
							<div>{/* Spacer */}</div>

							{/* Row 2: CE */}
							{renderUnitCell({label: "CE", last: true})}
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "4px",
									padding: "2px 0",
								}}
							>
								{renderLabel({color: "#fca5a5", text: "CRIT", subText: "<85", width: "45px"})}
								<Label
									color="#fcd34d"
									text="WARN"
									subText="85-90"
									width="45px"
								/>
								{renderLabel({color: "#86efac", text: "OK", subText: ">90", width: "45px"})}
							</div>
						</div>
					</>
				) : (
					// HORIZONTAL LAYOUT (Standard)
					<>
						{renderHorizontalUnitSection()}
						<div
							style={{
								width: "1px",
								height: "25px",
								background: "var(--border-subtle)",
							}}
						></div>
						{renderStatusSection()}
						<div
							style={{
								width: "1px",
								height: "25px",
								background: "var(--border-subtle)",
							}}
						></div>

						{/* Metrics Inline */}
						<div
							style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
						>
							<div
								style={{ display: "flex", alignItems: "center", gap: "6px" }}
							>
								<div
									style={{
										fontSize: "0.7rem",
										fontWeight: "800",
										color: "var(--text-secondary)",
									}}
								>
									CE:
								</div>
								<div style={{ display: "flex", gap: "4px" }}>
									<Label
										color="#fca5a5"
										text="CRIT"
										subText="<85"
										width="45px"
									/>
									<Label
										color="#fcd34d"
										text="WARN"
										subText="85-90"
										width="45px"
									/>
									{renderLabel({color: "#86efac", text: "OK", subText: ">90", width: "45px"})}
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		);
	};

	// --- KPI Logic ---
	const calculateStats = (pIndex) => {
		// Filter pots
		let targetPots = [];
		if (pIndex === 0)
			targetPots = fullPotList; // Reduction / All
		else {
			if (pIndex === 1)
				targetPots = fullPotList.filter(
					(p) => (p.id >= 101 && p.id <= 185) || (p.id >= 201 && p.id <= 285),
				);
			if (pIndex === 2)
				targetPots = fullPotList.filter(
					(p) => (p.id >= 301 && p.id <= 385) || (p.id >= 401 && p.id <= 485),
				);
			if (pIndex === 3)
				targetPots = fullPotList.filter(
					(p) => (p.id >= 501 && p.id <= 585) || (p.id >= 601 && p.id <= 685),
				);
		}

		const count = targetPots.length;
		if (count === 0) return { count: 0, bt: 0, ce: 0, v: 0, offline: 0 };

		// Averages - Ensure numeric summation
		const sumBT = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.bt) || 0),
			0,
		);
		const sumCE = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.ce) || 0),
			0,
		);
		const sumV = targetPots.reduce((acc, p) => acc + (parseFloat(p.v) || 0), 0);
		const sumNoise = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.noise) || 0),
			0,
		);
		const sumM = targetPots.reduce((acc, p) => acc + (parseFloat(p.m) || 0), 0);
		const sumBathTap = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.bath_tap) || 0),
			0,
		);
		const sumAEF = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.aef) || 0),
			0,
		);
		const sumAEkWh = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.ae_kwh) || 0),
			0,
		);
		const sumAge = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.age) || 0),
			0,
		);
		const sumFe = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.fe) || 0),
			0,
		);
		const sumSi = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.si) || 0),
			0,
		);
		const sumSa = targetPots.reduce(
			(acc, p) => acc + (parseFloat(p.sa) || 0),
			0,
		);

		const offlineCount = targetPots.filter((p) => p.ce === 0).length;

		// Calculate averages
		const avgBT = sumBT / count;
		const avgCE = sumCE / count;
		const avgV = sumV / count;
		const avgNoise = sumNoise / count;
		const avgM = sumM / count;
		const avgBathTap = sumBathTap / count;
		const avgAEF = sumAEF / count;
		const avgAEkWh = sumAEkWh / count;
		const avgAge = sumAge / count;
		const avgFe = sumFe / count;
		const avgSi = sumSi / count;
		const avgSa = sumSa / count;

		// Retrieve History from summaryStats.trendData if it matches the current scope
		let yestData = null;

		// Only usage trendData if the context matches roughly (e.g. we are rendering Reduction card and have All Potline data)
		// Or if we are rendering a specific Potline card and have that Potline's data
		const contextMatches =
			(selectedPotline === "ALL POTLINE" && pIndex === 0) ||
			selectedPotline === `POTLINE ${pIndex}`;

		if (
			contextMatches &&
			summaryStats &&
			summaryStats.trendData &&
			Array.isArray(summaryStats.trendData)
		) {
			// Find yesterday's entry
			// summaryStats.lastUpdated is "Today".
			// We need lastUpdated - 1 day.
			const lastDate = new Date(summaryStats.lastUpdated);
			lastDate.setDate(lastDate.getDate() - 1);
			const yestStr = lastDate.toISOString().split("T")[0];

			yestData = summaryStats.trendData.find(
				(d) => d.date && d.date.startsWith(yestStr),
			);
		}

		const fallback = (curr, histVal) => {
			if (histVal !== undefined && histVal !== null) return Number(histVal);
			return curr; // Default to no change if no history
		};

		const yestCE = fallback(avgCE, yestData?.ce);
		const yestBT = fallback(avgBT, yestData?.bt);
		const yestV = fallback(avgV, yestData?.avv || yestData?.v);
		const yestNoise = fallback(avgNoise, yestData?.noise);
		const yestM = fallback(avgM, yestData?.m);
		const yestBathTap = fallback(avgBathTap, yestData?.bath_tap);
		const yestAEF = fallback(avgAEF, yestData?.aef || yestData?.ae_freq);
		const yestAEkWh = fallback(avgAEkWh, yestData?.ae_kwh);
		const yestAge = fallback(avgAge - 1, yestData?.age);
		const yestFe = fallback(avgFe, yestData?.fe);
		const yestSi = fallback(avgSi, yestData?.si);
		const yestSa = fallback(avgSa, yestData?.sa);

		// Fix Current Calculation (force Number)
		let baseCurrent = 195;
		if (pIndex === 0) baseCurrent = 624;
		if (pIndex === 2) baseCurrent = 235; // Potline 2 specific

		const randomFluctuation = ((pIndex * 7) % 3) - 1;
		const currentKA = baseCurrent + randomFluctuation;

		return {
			count,
			offline: offlineCount,
			currentKA,
			data: [
				{
					label: "Current Eff (%)",
					today: avgCE.toFixed(2),
					yest: yestCE.toFixed(2),
				},
				{
					label: "Bath Temp (°C)",
					today: avgBT.toFixed(1),
					yest: yestBT.toFixed(1),
				},
				{
					label: "Voltage (V)",
					today: avgV.toFixed(2),
					yest: yestV.toFixed(2),
				},
				{
					label: "Noise (mV)",
					today: avgNoise.toFixed(1),
					yest: yestNoise.toFixed(1),
				},
				{
					label: "Metal Level (cm)",
					today: avgM.toFixed(1),
					yest: yestM.toFixed(1),
				},
				{
					label: "Bath Level (cm)",
					today: avgBathTap.toFixed(1),
					yest: yestBathTap.toFixed(1),
				},
				{
					label: "Anode Eff (Freq)",
					today: avgAEF.toFixed(2),
					yest: yestAEF.toFixed(2),
				},
				{
					label: "AE Energy (kWh)",
					today: avgAEkWh.toFixed(2),
					yest: yestAEkWh.toFixed(2),
				},
				{
					label: "Pot Age (days)",
					today: avgAge.toFixed(0),
					yest: yestAge.toFixed(0),
				},
				{ label: "Fe (%)", today: avgFe.toFixed(2), yest: yestFe.toFixed(2) },
				{ label: "Si (%)", today: avgSi.toFixed(2), yest: yestSi.toFixed(2) },
				{ label: "Ratio", today: avgSa.toFixed(2), yest: yestSa.toFixed(2) },
			],
		};
	};

	const kpiStats = [
		{ title: "POTLINE 1", ...calculateStats(1) },
		{ title: "POTLINE 2", ...calculateStats(2) },
		{ title: "POTLINE 3", ...calculateStats(3) },
		{ title: "REDUCTION", ...calculateStats(0) },
	];

	// New Charts Component
	const renderPotlineCharts = ({ pots }) => {
		// 1. Status Distribution Data
		const statusCounts = {
			Optimal: pots.filter((p) => p.ce > 90).length,
			Warning: pots.filter((p) => p.ce >= 85 && p.ce <= 90).length,
			Critical: pots.filter((p) => p.ce < 85 && p.ce > 0).length,
			Offline: pots.filter((p) => p.ce === 0).length,
		};

		const pieData = [
			{ name: "Optimal", value: statusCounts.Optimal, color: "#86efac" },
			{ name: "Warning", value: statusCounts.Warning, color: "#fcd34d" },
			{ name: "Critical", value: statusCounts.Critical, color: "#fca5a5" },
			{ name: "Offline", value: statusCounts.Offline, color: "#1e293b" },
		].filter((d) => d.value > 0);

		// 2. Highest CE (Top 10)
		const highestCE = [...pots]
			.filter((p) => p.ce > 0)
			.sort((a, b) => b.ce - a.ce)
			.slice(0, 10)
			.map((p) => ({ name: `${p.id}`, ce: p.ce }));

		// 3. Lowest CE (Bottom 10)
		const lowestCE = [...pots]
			.filter((p) => p.ce > 0)
			.sort((a, b) => a.ce - b.ce)
			.slice(0, 10)
			.map((p) => ({ name: `${p.id}`, ce: p.ce }));

		const renderChartCard = ({ title, children, scrollable = false }) => (
			<div
				style={{
					background: isDarkMode ? "#1e293b" : "white",
					border: "1px solid var(--border-subtle)",
					borderRadius: "8px",
					padding: "0.5rem",
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minWidth: "0",
					height: "100%",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						fontSize: "0.7rem",
						fontWeight: "700",
						color: "var(--text-primary)",
						marginBottom: "0.2rem",
					}}
				>
					{title}
				</div>
				<div
					style={{
						flex: 1,
						minHeight: 0,
						overflowX: scrollable ? "auto" : "hidden",
						overflowY: "hidden",
						scrollbarWidth: "thin",
						scrollbarColor: "var(--border-subtle) transparent",
					}}
				>
					<div
						style={{
							width: scrollable ? "150%" : "100%",
							height: "100%",
							minWidth: scrollable ? "300px" : "auto",
							display: "flex",
							flexDirection: "column",
						}}
					>
						{children}
					</div>
				</div>
			</div>
		);

		return (
			<div style={{ display: "flex", gap: "0.5rem", height: "100%", flex: 1 }}>
				{renderChartCard({title: "Proporsi Status Pot", children: <><div
						style={{
							flex: 1,
							minHeight: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									innerRadius={55}
									outerRadius={75}
									paddingAngle={2}
									dataKey="value"
									stroke="none"
								>
									{pieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										background: isDarkMode ? "#334155" : "white",
										border: "none",
										borderRadius: "4px",
										fontSize: "0.7rem",
									}}
									itemStyle={{ padding: 0 }}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>
					{/* Legend */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: "6px",
							justifyContent: "center",
							marginTop: "2px",
							paddingBottom: "4px",
						}}
					>
						{pieData.map((d) => (
							<div
								key={d.name}
								style={{ display: "flex", alignItems: "center", gap: "3px" }}
							>
								<div
									style={{
										width: 8,
										height: 8,
										background: d.color,
										borderRadius: 2,
									}}
								></div>
								<span
									style={{
										fontSize: "0.6rem",
										fontWeight: 600,
										color: "var(--text-secondary)",
									}}
								>
									{d.name} ({d.value})
								</span>
							</div>
						))}
					</div></>})}

				{renderChartCard({title: "Highest CE (Top 10)", scrollable: true, children: <><ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={highestCE}
							margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
						>
							<XAxis
								dataKey="name"
								fontSize={6}
								tickLine={false}
								axisLine={false}
								interval={0}
							/>
							<YAxis
								domain={["dataMin - 0.5", "dataMax + 0.5"]}
								fontSize={8}
								tick={false}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								contentStyle={{ fontSize: "0.7rem" }}
								cursor={{ fill: "transparent" }}
							/>
							<Bar
								dataKey="ce"
								fill="#86efac"
								radius={[2, 2, 0, 0]}
								barSize={15}
								isAnimationActive={false}
								label={{
									position: "top",
									fontSize: 7,
									fill: "var(--text-secondary)",
									formatter: (val) => val.toFixed(1),
								}}
							/>
						</BarChart>
					</ResponsiveContainer></>})}

				{renderChartCard({title: "Lowest CE (Bottom 10)", scrollable: true, children: <><ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={lowestCE}
							margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
						>
							<XAxis
								dataKey="name"
								fontSize={6}
								tickLine={false}
								axisLine={false}
								interval={0}
							/>
							<YAxis
								domain={["dataMin - 0.5", "dataMax + 0.5"]}
								fontSize={8}
								tick={false}
								axisLine={false}
								tickLine={false}
							/>
							<Tooltip
								contentStyle={{ fontSize: "0.7rem" }}
								cursor={{ fill: "transparent" }}
							/>
							<Bar
								dataKey="ce"
								fill="#fca5a5"
								radius={[2, 2, 0, 0]}
								barSize={15}
								isAnimationActive={false}
								label={{
									position: "top",
									fontSize: 7,
									fill: "var(--text-secondary)",
									formatter: (val) => val.toFixed(1),
								}}
							/>
						</BarChart>
					</ResponsiveContainer></>})}
			</div>
		);
	};

	const renderKPICard = ({ data }) => {
		// Dynamic Date Generation matching User Request (30 Jan 2026)
		const getAppDate = () => {
			const d = new Date();
			d.setFullYear(2026);
			d.setMonth(0); // Jan
			d.setDate(30);
			return d;
		};

		const today = getAppDate();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const formatDate = (date) => {
			return date.toLocaleDateString("en-GB", {
				day: "numeric",
				month: "short",
			});
		};

		const todayLabel = formatDate(today);
		const yestLabel = formatDate(yesterday);

		return (
			<div
				style={{
					background: isDarkMode ? "#1e293b" : "white",
					borderRadius: "6px",
					border: "1px solid var(--border-subtle)",
					padding: "0.5rem",
					display: "flex",
					flexDirection: "column",
					gap: "0.4rem",
					flex: 1, // Allow to grow
					minWidth: 0, // Allow to shrink (critical for flex containers to prevent overflow)
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						borderBottom: "1px solid var(--border-subtle)",
						paddingBottom: "0.3rem",
					}}
				>
					<div
						style={{
							fontWeight: "800",
							fontSize: "1rem",
							color: "var(--text-primary)",
						}}
					>
						{data.title}
					</div>
					<div
						style={{
							fontSize: "0.7rem",
							fontWeight: "700",
							color: "var(--text-secondary)",
						}}
					>
						PIO = {data.count} pots
					</div>
				</div>

				{/* Sub Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						fontSize: "0.65rem",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							fontWeight: "700",
							color: "#f59e0b",
						}}
					>
						<span>⚡</span> Current: {data.currentKA.toFixed(0)} kA
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<span
							style={{
								width: "8px",
								height: "8px",
								background: "#334155",
								borderRadius: "1px",
								display: "inline-block",
							}}
						></span>
						<span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>
							{data.offline} pots
						</span>
					</div>
				</div>

				{/* Table */}
				<div style={{ display: "flex", flexDirection: "column" }}>
					{/* Header Row */}
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
							background: "#86efac",
							color: "#14532d",
							fontWeight: "800",
							fontSize: "0.6rem",
							padding: "4px 6px",
							borderRadius: "4px 4px 0 0",
						}}
					>
						<div>ITEM</div>
						<div>{yestLabel}</div>
						<div>{todayLabel}</div>
						<div style={{ textAlign: "center" }}>Trend</div>
					</div>
					{/* Data Rows */}
					{/* Scrollable Data Body */}
					<div
						style={{
							overflowY: "auto",
							maxHeight: "120px", // Approx 4-5 rows visible
							scrollbarWidth: "thin",
							display: "flex",
							flexDirection: "column",
						}}
					>
						{data.data.map((row, idx) => {
							const trend = parseFloat(row.today) - parseFloat(row.yest);
							const isUp = trend > 0;
							return (
								<div
									key={idx}
									style={{
										display: "grid",
										gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr",
										padding: "4px 6px",
										borderBottom: "1px solid var(--border-subtle)",
										fontSize: "0.65rem",
										fontWeight: "600",
										color: "var(--text-primary)",
										background:
											idx % 2 === 0
												? isDarkMode
													? "#0f172a"
													: "#f8fafc"
												: "transparent",
									}}
								>
									<div>{row.label}</div>
									<div style={{ color: "var(--text-secondary)" }}>
										{row.yest}
									</div>
									<div>{row.today}</div>
									<div
										style={{
											color: isUp ? "#22c55e" : "#ef4444",
											textAlign: "center",
											fontWeight: "bold",
										}}
									>
										{isUp ? "↑" : "↓"}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		);
	};

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
					<div className="loading-text">Loading Grid Data...</div>
				</div>
			) : (
				<div
					style={{
						paddingBottom: "0rem",
						height: "calc(100vh - 80px)",
						display: "flex",
						flexDirection: "column",
					}}
				>
					{/* Controls Header - Compact */}
					<div
						style={{
							marginBottom: "0.4rem",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0",
						}}
					>
						<button
							onClick={() => navigate("/dashboard")}
							className="nav-btn back-btn"
							style={{
								padding: "0.3rem 0.6rem",
								gap: "4px",
								fontSize: "0.75rem",
							}}
						>
							<ArrowLeft size={14} />
							Back To Dashboard MAIN
						</button>

						<div
							style={{
								color: "var(--text-secondary)",
								fontWeight: "600",
								fontSize: "0.8rem",
							}}
						>
							{isSearching
								? `Found ${filteredDisplayPots.length}`
								: `${selectedPotline} (${totalPots} Pots)`}
						</div>
					</div>

					{/* KPI Section */}
					{isAllPotlines && (
						<div
							style={{
								display: "flex",
								gap: "0.5rem",
								padding: "0 0 0.5rem 0",
								width: "100%",
								boxSizing: "border-box",
							}}
						>
							{kpiStats.map((stat, i) => renderKPICard({ key: i, data: stat }))}
						</div>
					)}

					{/* Main Grid View */}
					{isSearching ? (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
								gap: "0.4rem",
								overflowY: "auto",
								padding: "0.5rem",
							}}
						>
							{filteredDisplayPots.map(renderPotCard)}
						</div>
					) : (
						<div
							style={{
								flex: 1,
								minHeight: 0,
								overflowY: "auto", // Independent Scroll
								overflowX: "auto", // Horizontal Scroll to prevent clipping
								display: "flex",
								flexDirection: "column",
								width: "100%", // Ensure it takes full width
							}}
						>
							{isAllPotlines ? (
								// Render Sections for PL 1, 2, 3
								<>
									{[0, 1, 2].map((potlineIdx) => {
										// Sort Descending for All View (Right-to-Left logical layout: 4-3-2-1)
										// This places Block 1 (Suffix '1') at the far right.
										const sectionBlocks = blocks
											.filter((b) => b.potlineIndex === potlineIdx)
											.sort((a, b) => b.suffix.localeCompare(a.suffix));

										// Background
										const sectionBg = isDarkMode ? "#1e3a8a66" : "#bfdbfe";

										return (
											<div
												key={potlineIdx}
												style={{
													display: "flex",
													flexDirection: "column",
													gap: "0px",
													flex: 1,
													minHeight: 0,
													marginBottom: "1px",
												}}
											>
												{/* Section Header */}
												<div
													style={{
														fontSize: "0.9rem",
														fontWeight: "800",
														color: "var(--text-secondary)",
														textTransform: "uppercase",
														textAlign: "center",
														paddingBottom: "0px",
														lineHeight: "1.2",
													}}
												>
													POTLINE {potlineIdx + 1}
												</div>

												{/* Grid for this Potline's blocks */}
												<div
													style={{
														display: "grid",
														gridTemplateColumns: "repeat(4, 1fr)",
														gap: "1px",
														flex: 1,
														minHeight: 0,
														overflow: "hidden",
													}}
												>
													{sectionBlocks.map((block) => {
														const { pots1, pots2 } = getBlockDisplayItems(
															block,
															fullPotList,
														);
														const topBlockLabel = block.labelTop;
														const bottomBlockLabel = block.labelBottom;

														return (
															<div
																key={block.id}
																className="pot-block"
																style={{
																	border: "none",
																	borderRadius: "0px",
																	padding: "0px",
																	background: sectionBg,
																	display: "flex",
																	flexDirection: "column",
																	overflow: "hidden",
																	height: "100%",
																}}
															>
																{/* Block Label */}
																<div
																	style={{
																		marginBottom: "1px",
																		color: "var(--text-secondary)",
																		fontSize: "0.45rem", // Reduced from 0.5rem
																		textAlign: "center",
																		fontWeight: "800",
																		whiteSpace: "nowrap",
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		textTransform: "uppercase",
																	}}
																>
																	{topBlockLabel}
																</div>

																{/* Row 1: Series 1 */}
																<div
																	style={{
																		display: "grid",
																		gridTemplateColumns: "repeat(22, 1fr)",
																		gap: "1px",
																		overflow: "hidden",
																		flex: 1,
																		direction: "rtl",
																	}}
																>
																	{pots1.map((item) => renderPotCard(item))}
																</div>

																{/* Row 2: Series 2 */}
																<div
																	style={{
																		display: "grid",
																		gridTemplateColumns: "repeat(22, 1fr)",
																		gap: "1px",
																		overflow: "hidden",
																		flex: 1,
																		direction: "rtl",
																		marginTop: "1px",
																	}}
																>
																	{pots2.map((item) => renderPotCard(item))}
																</div>

																{/* Bottom Block Label */}
																<div
																	style={{
																		marginTop: "1px",
																		marginBottom: "1px",
																		color: "var(--text-secondary)",
																		fontSize: "0.45rem", // Reduced from 0.5rem
																		textAlign: "center",
																		fontWeight: "800",
																		whiteSpace: "nowrap",
																		overflow: "hidden",
																		textOverflow: "ellipsis",
																		textTransform: "uppercase",
																		lineHeight: "1",
																		background: "rgba(255,255,255,0.2)",
																	}}
																>
																	{bottomBlockLabel}
																</div>
															</div>
														);
													})}
												</div>
											</div>
										);
									})}
									<div style={{ padding: "0", marginTop: "12px" }}>
										{renderLegend({style: {}, vertical: false})}
									</div>
								</>
							) : (
								// Single Potline View
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "1rem",
										flex: 1,
										minHeight: 0,
									}}
								>
									{/* Top Section: Split Column (Card | Legend | Charts) */}
									<div
										style={{
											display: "flex",
											gap: "1rem",
											height: "220px",
											flexShrink: 0,
										}}
									>
										{/* Left: KPI Card */}
										<div
											style={{
												flex: "0 0 280px",
												display: "flex",
												flexDirection: "column",
											}}
										>
											{renderKPICard({ data: 
													kpiStats.find((k) => k.title === selectedPotline) ||
													kpiStats[0]
												 })}
										</div>

										{/* Right: Charts */}
										<div style={{ flex: 1, display: "flex", minWidth: 0 }}>
											{renderPotlineCharts({ pots: isAllPotlines
														? filteredDisplayPots
														: filteredDisplayPots.filter((p) => {
																if (selectedPotline === "POTLINE 1")
																	return p.id >= 101 && p.id <= 285;
																if (selectedPotline === "POTLINE 2")
																	return p.id >= 301 && p.id <= 485;
																if (selectedPotline === "POTLINE 3")
																	return p.id >= 501 && p.id <= 685;
																return true;
															}) })}
										</div>
									</div>

									{/* Bottom: Enlarged Map Grid */}
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "repeat(2, 1fr)",
											gap: "8px", // Increased gap for better separation
											flex: 1,
											overflowY: "auto",
											alignContent: "start",
											paddingRight: "4px",
										}}
									>
										{blocks.map((block) => {
											const { pots1, pots2 } = getBlockDisplayItems(
												block,
												fullPotList,
											);
											return (
												<div
													key={block.id}
													className="pot-block"
													style={{
														border: "1px solid var(--border-subtle)",
														borderRadius: "4px",
														padding: "0", // Removed padding to allow labels to touch edges
														background: "var(--bg-secondary)",
														display: "flex",
														flexDirection: "column",
														overflow: "hidden",
														height: "fit-content",
													}}
												>
													{/* Top Label */}
													<div
														style={{
															background: "#dbeafe", // Light blue background
															color: "#1e40af", // Darker blue text
															fontSize: "0.7rem",
															textAlign: "center",
															fontWeight: "800",
															textTransform: "uppercase",
															padding: "2px 0",
															borderBottom: "1px solid #bfdbfe",
														}}
													>
														{block.labelTop}
													</div>

													<div
														style={{
															display: "flex",
															flexDirection: "column",
															gap: "1px",
															flex: 1,
															padding: "2px",
														}}
													>
														<div
															style={{
																display: "grid",
																gridTemplateColumns: "repeat(22,1fr)",
																gap: "1px",
																flex: 1,
																direction: "rtl",
															}}
														>
															{pots1.map(renderPotCard)}
														</div>
														<div
															style={{
																display: "grid",
																gridTemplateColumns: "repeat(22,1fr)",
																gap: "1px",
																flex: 1,
																direction: "rtl",
																marginTop: "1px",
															}}
														>
															{pots2.map(renderPotCard)}
														</div>
													</div>

													{/* Bottom Label */}
													<div
														style={{
															background: "#dbeafe", // Light blue background
															color: "#1e40af", // Darker blue text
															fontSize: "0.7rem",
															textAlign: "center",
															fontWeight: "800",
															textTransform: "uppercase",
															padding: "2px 0",
															borderTop: "1px solid #bfdbfe",
														}}
													>
														{block.labelBottom}
													</div>
												</div>
											);
										})}
										{/* Legend inside Grid for snug fit - Adjusted margin for balance */}
										<div style={{ gridColumn: "1 / -1", marginTop: "6px" }}>
											{renderLegend({style: {}, vertical: false})}
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Legend - Show at bottom for ALL views */}
		</div>
	);
};

export default PotlineMapPage;
