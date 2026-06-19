import { useEffect, useState } from "react";
import { potService } from "../services/potService";

export const useDashboardData = (selectedPotline, activeTab = "Last CE", datasetName = null) => {
	const [pots, setPots] = useState([]);
	const [summaryStats, setSummaryStats] = useState({
		total: 0,
		optimal: 0,
		warning: 0,
		critical: 0,
		average: 0,
	});
	const [donutData, setDonutData] = useState([]);
	const [highCEData, setHighCEData] = useState([]);
	const [downCEData, setDownCEData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);
				// Extract numeric potline ID from string "POTLINE 1" -> 1
				// If "ALL POTLINE", set to null
				const potlineId =
					selectedPotline === "ALL POTLINE"
						? null
						: parseInt(selectedPotline.replace("POTLINE ", ""), 10);

				// Fetch data from backend for specific potline
				// CHANGED: Use Daily Latest instead of 5m Layer for performance and correctness
				// Also fetch trend data concurrently, with fallbacks if no data or backend is down
				const [data, trendData] = await Promise.all([
					potService.getDailyLatest(potlineId, datasetName).catch((err) => {
						console.warn("Failed to fetch daily latest, defaulting to empty:", err);
						return { rows: [] };
					}),
					potService.getStatsTrend(potlineId, datasetName).catch((err) => {
						console.warn("Failed to fetch stats trend, defaulting to empty:", err);
						return { avg_ce_trend: {} };
					}),
				]);

				const rows = data?.rows || [];
				// Unpack the wrapped trend object from backend: { potline_id:..., avg_ce_trend: { ... } }
				const trendsRaw = trendData?.avg_ce_trend || {};

				// 1. Process Pot List & Status
				const processedPots = rows.map((row) => {
					// Logic to switch between Actual CE and Predicted CE based on tab
					const isPrediction = activeTab === "Predicted CE";
					// If prediction mode, use predicted_ce. Fallback to 0.
					// If normal mode, use ce. Fallback to 0.
					const ce = isPrediction ? (row.predicted_ce ?? null) : row.ce || 0;

					// FALLBACK LOGIC:
					// If backend data for BT/V is missing (0), generate realistic mock data
					// so the UI visualization works as intended for the user.
					// This satisfies the request to "apply BT and V".

					const bt = row.bt || row.bath_temperature || row.bath_temp || 0;
					const v = row.avv || row.voltage || row.volt || 0;
					const noise = row.noise || 0;
					const m = row.m || row.metal_level || 0;
					const aef = row.aef || row.anode_effect || 0;
					const age = row.age_day || 0;

					// CI removed - not displayed on dashboard

					// Delta Calculation:
					// 1. Predicted Mode: Predicted CE - Current Actual CE
					// 2. Last CE Mode: Current Actual CE - Previous Actual CE (Day-over-Day)
					let delta = 0;
					if (isPrediction) {
						const currentActual = row.ce || 0;
						delta = (ce || 0) - currentActual;
					}
					// Last CE mode: delta = 0 (no arrows, just show current data)

					let status = "critical";

					const potdayVal = parseFloat(row.potday || "1");
					const isOffline = Math.abs(potdayVal - 1) > 0.01; // Treat anything not close to 1 as Offline

					// REMOVED: Randomized mock data generation.
					// Data must be consistent with database/dashboard main.

					// Status and Offline logic moved up
					// Using values calculated above

					const finalCe = isOffline ? 0 : ce;

					// Determine overall status based on CE (primary) or blended score
					// Using existing CE logic for cell status
					if (isOffline) status = "offline";
					else if (finalCe === null)
						status = "offline"; // No prediction available
					else if (finalCe === 0 && !isPrediction)
						status = "offline"; // Only offline if actual CE is 0
					else if (finalCe === 0) status = "offline";
					else if (finalCe > 90)
						status = "optimal"; // Updated to match new standard (> 90)
					else if (finalCe >= 85) status = "warning"; // Updated to match new standard (85-90)

					return {
						id: row.pot_id,
						name: `Pot ${row.pot_id}`,
						value: finalCe !== null ? Number(finalCe.toFixed(2)) : 0,
						bt: Number(bt).toFixed(0),
						ce: ce !== null ? Number(ce.toFixed(2)) : 0,
						v: Number(v).toFixed(2),
						noise: Number(noise).toFixed(0),
						m: Number(m).toFixed(1),
						aef: Number(aef).toFixed(2),
						age: Number(age),
						status: status,
						delta: Number(delta),
					};
				});

				// Sort by ID naturally
				processedPots.sort((a, b) => a.id - b.id);
				setPots(processedPots);

				// 2. Calculate Summary Stats
				const total = processedPots.length;
				const optimal = processedPots.filter(
					(p) => p.status === "optimal",
				).length;
				const warning = processedPots.filter(
					(p) => p.status === "warning",
				).length;
				const critical = processedPots.filter(
					(p) => p.status === "critical",
				).length;
				const offline = processedPots.filter(
					(p) => p.status === "offline",
				).length;

				// Average only includes active pots (non-zero)
				const activePotsCount = optimal + warning + critical;
				const avg =
					activePotsCount > 0
						? processedPots
								.filter((p) => p.value > 0)
								.reduce((acc, p) => acc + p.value, 0) / activePotsCount
						: 0;

				// Calculate specific averages per category
				const calculateCategoryAvg = (status) => {
					const categoryPots = processedPots.filter((p) => p.status === status);
					if (categoryPots.length === 0) return 0;
					return (
						categoryPots.reduce((acc, p) => acc + p.value, 0) /
						categoryPots.length
					);
				};

				const avgOptimal = calculateCategoryAvg("optimal");
				const avgWarning = calculateCategoryAvg("warning");
				const avgCritical = calculateCategoryAvg("critical");

				// Helper: Determine status based on CE and Offline state
				const getPotStatus = (ce, potday) => {
					const potdayVal = parseFloat(potday || "1");
					const isOffline = Math.abs(potdayVal - 1) > 0.01;

					if (isOffline) return "offline";
					if (ce === null || ce === undefined) return "offline";
					if (ce === 0) return "offline";
					if (ce > 90) return "optimal";
					if (ce >= 85) return "warning";
					return "critical";
				};

				// Determine Average CE Trend & Status Trends
				let averageTrend = 0;
				let trendOptimal = trendsRaw.optimal_diff || 0;
				let trendWarning = trendsRaw.warning_diff || 0;
				let trendCritical = trendsRaw.critical_diff || 0;

				if (activeTab === "Predicted CE") {
					// --- PREDICTION MODE TRENDS ---
					// Compare Current Predicted Stats vs Actual Stats (Today)

					// 1. Calculate Actual Counts (Baseline)
					let actualOptimal = 0;
					let actualWarning = 0;
					let actualCritical = 0;
					let sumActualCE = 0;
					let countActualActive = 0;

					rows.forEach((r) => {
						const s = getPotStatus(r.ce, r.potday);
						if (s === "optimal") actualOptimal++;
						if (s === "warning") actualWarning++;
						if (s === "critical") actualCritical++;

						// For Avg CE calculation (Active pots only)
						if (s !== "offline") {
							sumActualCE += r.ce || 0;
							countActualActive++;
						}
					});

					const avgActual =
						countActualActive > 0 ? sumActualCE / countActualActive : 0;

					// 2. Calculate Predicted Counts (Target) - already done in 'optimal', 'warning', 'critical' variables above?
					// 'optimal', 'warning', 'critical' from lines 85-87 use 'processedPots' which respects 'activeTab'
					// So 'optimal' variable IS the Predicted Optimal Count.

					// 3. Diff
					trendOptimal = optimal - actualOptimal;
					trendWarning = warning - actualWarning;
					trendCritical = critical - actualCritical;
					averageTrend = parseFloat((avg - avgActual).toFixed(2));
				} else {
					// --- STANDARD MODE TRENDS ---
					// Use backend Day-over-Day data
					averageTrend = parseFloat((trendsRaw.ce_trend || 0).toFixed(2));
				}

				// Real Trends from Backend (Status Counts)
				const trends = {
					total: 0,
					optimal: trendOptimal,
					warning: trendWarning,
					critical: trendCritical,
					average: averageTrend,
				};

				setSummaryStats({
					total,
					optimal,
					warning,
					critical,
					offline,
					average: avg,
					trends,
					avgOptimal,
					avgWarning,
					avgCritical,
				});

				// 3. Prepare Chart Data
				setDonutData(
					[
						{ name: "Optimal", value: optimal, fill: "#4ade80" },
						{ name: "Warning", value: warning, fill: "#fbbf24" },
						{ name: "Critical", value: critical, fill: "#f87171" },
						{ name: "Offline", value: offline, fill: "#1f2937" },
					].filter((d) => d.value > 0),
				);

				// 4. High/Low CE (Top 10)
				// Filter out 0 values for charts to avoid showing empty/offline pots as "low performance"
				const activePots = processedPots.filter((p) => p.value > 0);
				const sortedByCE = [...activePots].sort((a, b) => b.value - a.value);

				setHighCEData(sortedByCE.slice(0, 10));
				// Get bottom 10 from the active pots
				setDownCEData([...sortedByCE].reverse().slice(0, 10));

				// 5. Determine Latest Date
				// Find the maximum timestamp in the data to use as "Current Time" for the simulation
				let maxDate = null;
				if (rows.length > 0) {
					const dates = rows.map((r) => new Date(r.ts_5m).getTime());
					const maxTs = Math.max(...dates);
					maxDate = new Date(maxTs);
				}
				setSummaryStats((prev) => ({ ...prev, lastUpdated: maxDate }));
			} catch (err) {
				console.error("Failed to fetch dashboard data:", err);
				setError(err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [selectedPotline, activeTab, datasetName]);

	return {
		pots,
		summaryStats,
		donutData,
		highCEData,
		downCEData,
		loading,
		error,
	};
};
