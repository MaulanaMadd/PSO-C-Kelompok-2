import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	ChevronRight,
	Layers,
	Lightbulb,
	Percent,
	Ruler,
	Scale,
	Thermometer,
	Timer,
	Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { ToastContainer } from "../components/common/Toast";
import Header from "../components/dashboard/Header";
import HistoryTable from "../components/dashboard/HistoryTable";
import { useSettings } from "../context/SettingsContext";
import { potService } from "../services/potService";

const PotDetailPage = ({ isDarkMode, toggleTheme }) => {
	const { id } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { settings } = useSettings();
	const [activeTab, setActiveTab] = useState("TODAY");
	const [searchQuery, setSearchQuery] = useState("");
	const [currentTime, setCurrentTime] = useState(new Date());
	const [anchorDate, setAnchorDate] = useState(null); // Stores the date part from the fetched data

	// Data State
	const [potData, setPotData] = useState(null);
	const [loading, setLoading] = useState(true);

	// Toast State
	const [toasts, setToasts] = useState([]);

	const removeToast = (id) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	};

	// Initial load: Scroll to top and start clock
	useEffect(() => {
		window.scrollTo(0, 0);
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	// State for Time Range
	const [timeRange, setTimeRange] = useState("7D"); // '7D' or '30D'

	// Main Data Fetching logic
	useEffect(() => {
		const fetchPotDetails = async () => {
			if (!id) return;
			// Only show full loading spinner on initial load to prevent scroll jump when changing filters
			if (!potData) setLoading(true);
			try {
				// Helper for Param/Chart Config
				const getChartConfigs = () => ({
					bt: { label: "BATH TEMPERATURE", color: "#b45309", type: "line" },
					avv: { label: "AVERAGE VOLTAGE", color: "#7c3aed", type: "area" },
					noise: { label: "NOISE", color: "#b91c1c", type: "area" },
					m: { label: "M(Tinggi Metal)", color: "#1d4ed8", type: "line" },
					ae_dur: { label: "AE DURATION", color: "#a16207", type: "bar" },
					feed_pct: { label: "FEEDING RATE", color: "#047857", type: "line" },
					oa: { label: "OVERFEEDING (OA)", color: "#0f766e", type: "line" },
					osp: { label: "OSP", color: "#be185d", type: "line" },
					current: { label: "LINE CURRENT", color: "#4338ca", type: "line" },
					alf3: { label: "ALF3 ADDITION", color: "#0e7490", type: "bar" },
					caf2: { label: "CAF2 ADDITION", color: "#047857", type: "line" },
					age: { label: "POT AGE", color: "#4b5563", type: "line" },
				});

				// --- Status Calculation Logic ---
				// --- Status Calculation Logic ---
				const getParamStatus = (type, value, extraData = {}) => {
					if (value === null || value === undefined)
						return { status: "optimal" };
					const numVal = Number(value);
					if (isNaN(numVal)) return { status: "optimal" };

					// Dynamic Check from Settings
					const std = settings ? settings[type] : null;

					if (std) {
						// Priority 1: Max Check
						if (std.max_val !== null && numVal > std.max_val) {
							return { status: "warning", message: `>${std.max_val}` };
						}
						// Priority 2: Min Check
						if (std.min_val !== null && numVal < std.min_val) {
							return { status: "warning", message: `<${std.min_val}` };
						}
					}

					// Fallback / Specific Logic not covered by simple Min/Max or if settings missing
					switch (type) {
						case "bt":
							if (!std && (numVal < 940 || numVal > 960))
								return { status: "warning", message: "940-960" };
							break;
						case "ae": {
							// Special AE Logic: Settings usually have duration or freq
							// If checking duration from settings
							const aeStd = settings?.["ae_dur"];
							if (aeStd && extraData.duration > aeStd.max_val)
								return { status: "warning", message: "AE Event" };

							if (!aeStd && extraData.duration >= 60)
								return { status: "critical", message: "CRITICAL >=60s" };
							if (!aeStd && extraData.duration > 0)
								return { status: "warning", message: "AE Event Detected" };
							break;
						}
						case "feed":
							if (numVal < 95 || numVal > 105)
								return { status: "warning", message: "95-105%" };
							break;
						case "oa":
							if (numVal < 12 || numVal > 20)
								return { status: "warning", message: "12-20" };
							break;
						case "osp":
							if (extraData.psp) {
								const diff = Math.abs(numVal - extraData.psp);
								if (diff > 0.5)
									return { status: "warning", message: `Dev > 0.5` };
							}
							break;
						case "ov":
							if (numVal < 4.0 || numVal > 4.5)
								return { status: "warning", message: "4.0-4.5V" };
							break;
						case "avv":
							if (!std && (numVal < 4.1 || numVal > 4.4))
								return { status: "warning", message: "4.1-4.4V" };
							break;
						case "current":
							if (numVal < 190 || numVal > 200)
								return { status: "warning", message: "195±5" };
							break;
						case "noise":
							if (!std && numVal > 50)
								return { status: "warning", message: "<=50" };
							break;
						case "alf3":
							if (numVal < 40 || numVal > 60)
								return { status: "warning", message: "40-60" };
							break;
						case "caf2":
							if (numVal < 3 || numVal > 6)
								return { status: "warning", message: "3-6%" };
							break;
						case "m":
							if (!std && (numVal <= 23 || numVal >= 27))
								return { status: "critical", message: "23-27" };
							break;
					}
					return { status: "optimal" };
				};

				const getAgeLabel = (days) => {
					if (!days) return "-";
					if (days < 180) return `W (<6 Mo)`;
					if (days < 730) return `X (6-24 Mo)`;
					if (days < 1460) return `Y (24-48 Mo)`;
					return `Z (>48 Mo)`;
				};

				// 1. First, find independent "Latest" state to anchor our time
				// This resolves the issue where "Now" (2026) is far ahead of data (2025)
				// CHANGED: Use Daily Latest instead of Layer Latest
				const latestBatch = await potService.getDailyLatest();
				const latestPot = latestBatch.rows.find(
					(p) => p.pot_id === parseInt(id),
				);

				if (!latestPot) {
					console.warn(`Pot ${id} not found.`);
					setLoading(false);
					return; // Or handle empty state
				}

				// 2. Determine "Anchor Date" from the data
				// We save the data timestamp to state to use as the "Base Date"
				setAnchorDate(new Date(latestPot.ts_5m));

				// 3. Fetch Range Data relative to Anchor Date (ALWAYS 30 DAYS for History Table)
				const endDate = new Date(latestPot.ts_5m).toISOString();
				const startDate = new Date(latestPot.ts_5m);
				startDate.setDate(startDate.getDate() - 30); // Always fetch 30 days

				const rangeData = await potService.getLayerRange(
					id,
					startDate.toISOString(),
					endDate,
				);
				const rows = rangeData.rows || [];

				// Sort by time ascending
				rows.sort((a, b) => new Date(a.ts_5m) - new Date(b.ts_5m));

				// 4. Map to View Model
				const ceValue = Number((latestPot.ce || 0).toFixed(2));
				const predValue = Number((latestPot.predicted_ce || 0).toFixed(2));

				// CI Range (if available)
				const ciLow =
					latestPot.yhat_lo !== undefined
						? Number(latestPot.yhat_lo).toFixed(2)
						: null;
				const ciHigh =
					latestPot.yhat_hi !== undefined
						? Number(latestPot.yhat_hi).toFixed(2)
						: null;
				const ciRange = ciLow && ciHigh ? `${ciLow}% - ${ciHigh}%` : null;

				const getEfficiencyConfig = (val, isDark) => {
					if (val === 0)
						return {
							status: "MAINTENANCE",
							color: isDark ? "#9ca3af" : "#1f2937",
							bg: isDark ? "rgba(31, 41, 55, 0.5)" : "#f3f4f6",
							border: isDark ? "#374151" : "#d1d5db",
							text: isDark ? "#f3f4f6" : "#1f2937",
						};
					if (val < 85)
						return {
							status: "ACTION REQUIRED",
							color: isDark ? "#f87171" : "#ef4444",
							bg: isDark ? "rgba(220, 38, 38, 0.1)" : "#fef2f2",
							border: isDark ? "rgba(220, 38, 38, 0.3)" : "#fecaca",
							text: isDark ? "#f87171" : "#ef4444",
						};
					if (val < 90)
						return {
							status: "ATTENTION",
							color: isDark ? "#fbbf24" : "#f59e0b",
							bg: isDark ? "rgba(217, 119, 6, 0.1)" : "#fffbeb",
							border: isDark ? "rgba(217, 119, 6, 0.3)" : "#fde68a",
							text: isDark ? "#fbbf24" : "#d97706",
						};
					return {
						status: "GOOD",
						color: isDark ? "#4ade80" : "#22c55e",
						bg: isDark ? "rgba(22, 163, 74, 0.1)" : "#f0fdf4",
						border: isDark ? "rgba(22, 163, 74, 0.3)" : "#bbf7d0",
						text: isDark ? "#4ade80" : "#166534",
					};
				};

				const effConfig = getEfficiencyConfig(ceValue, isDarkMode);
				const predConfig = getEfficiencyConfig(predValue, isDarkMode);

				// Calculate Trends
				const prevPot = rows[rows.length - 2];
				const calcTrend = (curr, prev, dec = 2) => {
					if (prev === undefined) return "-";
					const diff = curr - prev;
					if (isNaN(diff)) return "-";
					return (diff > 0 ? "+" : "") + diff.toFixed(dec);
				};

				const mappedSensors = [
					{
						type: "temperature",
						value: `${(latestPot.bt || 0).toFixed(0)}°C`,
						label: "Bath Temperature (BT)",
						status: getParamStatus("bt", latestPot.bt).status,
						trend: calcTrend(latestPot.bt, prevPot?.bt, 0),
						range: "940-960",
					},
					{
						type: "level",
						value: `${(latestPot.m || 0).toFixed(1)} cm`,
						label: "M (TINGGI METAL)",
						status: getParamStatus("m", latestPot.m).status,
						trend: calcTrend(latestPot.m, prevPot?.m, 1),
						range: "23-27",
					},
					{
						type: "noise",
						value: `${(latestPot.noise || 0).toFixed(0)} mV`,
						label: "Noise",
						status: getParamStatus("noise", latestPot.noise).status,
						trend: calcTrend(latestPot.noise, prevPot?.noise, 0),
						range: "<=50",
					},
					{
						type: "osp",
						value: `${(latestPot.osp || 0).toFixed(2)} V`,
						label: "OSP",
						status: getParamStatus("osp", latestPot.osp, { psp: latestPot.psp })
							.status,
						trend: "-",
						range: "~PSP",
					},
					{
						type: "voltage",
						value: `${(latestPot.avv || 0).toFixed(2)} V`,
						label: "Average Voltage",
						status: getParamStatus("avv", latestPot.avv).status,
						trend: calcTrend(latestPot.avv, prevPot?.avv, 2),
						range: "4.1-4.4",
					},
					{
						type: "current",
						value: `${(latestPot.pl_current || 0).toFixed(0)} kA`,
						label: "Line Current",
						status: getParamStatus("current", latestPot.pl_current).status,
						trend: "-",
						range: "195",
					},
					{
						type: "feed",
						value: `${(latestPot.feed_pct || 0).toFixed(2)}%`,
						label: "Feeding Rate",
						status: getParamStatus("feed", latestPot.feed_pct).status,
						trend: "-",
						range: "95-105%",
					},
					{
						type: "oa",
						value: `${(latestPot.oa || 0).toFixed(0)}`,
						label: "OA",
						status: getParamStatus("oa", latestPot.oa).status,
						trend: "-",
						range: "12-20",
					},
					{
						type: "time",
						value: `${latestPot.age_day || 0}d`,
						label: `Pot Age: ${getAgeLabel(latestPot.age_day)}`,
						status: "optimal",
						trend: "",
						range: "-",
					},
					{
						type: "alf3",
						value: `${(latestPot.alf3 || 0).toFixed(0)} kg`,
						label: "ALF3",
						status: getParamStatus("alf3", latestPot.alf3).status,
						trend: "-",
						range: "40-60",
					},
					{
						type: "caf2",
						value: `${(latestPot.caf2 || 0).toFixed(2)}%`,
						label: "CAF2",
						status: getParamStatus("caf2", latestPot.caf2).status,
						trend: "-",
						range: "3-6%",
					},
					{
						type: "ae",
						value: `${(latestPot.ae_dur || 0).toFixed(0)}s`,
						label: "Anode Effect",
						status: getParamStatus("ae", latestPot.ae_dur, {
							duration: latestPot.ae_dur,
						}).status,
						trend: calcTrend(latestPot.ae_dur, prevPot?.ae_dur, 0),
						range: "<60s",
					},
				];

				// 5. Prepare Charts Data
				const formatDay = (d) =>
					new Date(d).toLocaleDateString("en-GB", {
						day: "numeric",
						month: "short",
					});

				// Filter rows for Charts based on TimeRange string
				const chartFilterDate = new Date(latestPot.ts_5m);
				if (timeRange === "7D") {
					chartFilterDate.setDate(chartFilterDate.getDate() - 7);
				} else {
					chartFilterDate.setDate(chartFilterDate.getDate() - 30);
				}
				const chartRows = rows.filter(
					(r) => new Date(r.ts_5m) >= chartFilterDate,
				);

				const chartsData = {
					bt: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.bt),
					})),
					avv: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.avv),
					})),
					noise: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.noise),
					})),
					m: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.m),
					})),
					ae_dur: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.ae_dur),
					})),
					feed_pct: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.feed_pct),
					})),
					oa: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.oa),
					})),
					osp: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.osp),
					})),
					current: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.current || r.pl_current),
					})),
					alf3: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.alf3),
					})),
					caf2: chartRows.map((r) => ({
						day: formatDay(r.ts_5m),
						value: Number(r.caf2),
					})),
				};

				const mappedData = {
					currentEfficiency: {
						value: ceValue,
						target: 96,
						config: effConfig,
					},
					predictedEfficiency: {
						value: predValue,
						target: 96,
						config: predConfig,
						range: ciRange, // Pass range to component
					},
					sensors: mappedSensors,
					warnings: [],
					recommendations: [],
					charts: chartsData,
					history: rows, // Expose full history for tables
					chartConfigs: getChartConfigs(),
				};

				// 12 Main KPI Signal Warnings (User Requirement: Early Warning on standard miss)

				// --- Generate Warnings based on 12 Key Drivers (Dynamic) ---
				const check = (
					key,
					val,
					defaultMin,
					defaultMax,
					title,
					msgSuffix,
					decimals = 2,
				) => {
					const s = settings?.[key];
					const mn = s?.min_val ?? defaultMin;
					const mx = s?.max_val ?? defaultMax;

					if (val === undefined || val === null) return;

					if (mn !== null && val < mn) {
						mappedData.warnings.push({
							title: title,
							message: `${msgSuffix || key} ${Number(val).toFixed(decimals)} < ${mn}`,
						});
					}
					if (mx !== null && val > mx) {
						mappedData.warnings.push({
							title: title,
							message: `${msgSuffix || key} ${Number(val).toFixed(decimals)} > ${mx}`,
						});
					}
				};

				// 1. CE - REMOVED: CE is output, not a root cause parameter
				// check('ce', latestPot.ce, 90, null, "Low Current Efficiency", "CE");

				// 2. BT
				check("bt", latestPot.bt, 940, 960, "Bath Temp Out of Range", "BT", 0);

				// 3. AVV
				check("avv", latestPot.avv, 4.1, 4.4, "Voltage Deviation", "Voltage");

				// 4. Noise
				check(
					"noise",
					latestPot.noise,
					null,
					50,
					"High Noise (Signal)",
					"Noise",
					0,
				);

				// 5. M
				check("m", latestPot.m, 23, 27, "Metal Level Critical", "M");

				// 6. Bath Level (bath_tap)
				if (latestPot.bath_tap)
					check(
						"bath_tap",
						latestPot.bath_tap,
						15,
						25,
						"Bath Level Deviation",
						"Bath Level",
					);

				// 7. AE Freq (aef)
				check(
					"aef",
					latestPot.aef,
					null,
					0.5,
					"High AE Frequency",
					"AE Freq",
					1,
				);

				// 8. AE Duration (ae_dur)
				const aeMax = settings?.["ae_dur"]?.max_val ?? 0;
				if (latestPot.ae_dur > aeMax)
					mappedData.warnings.push({
						title: "AE Detected",
						message: `Duration ${latestPot.ae_dur}s`,
					});

				// 9. AE Energy (ae_kwh)
				check(
					"ae_kwh",
					latestPot.ae_kwh,
					null,
					2.0,
					"High AE Energy",
					"AE Energy",
				);

				// 10. Pot Age
				check(
					"age_day",
					latestPot.age_day,
					null,
					2500,
					"Old Pot Age",
					"Age",
					0,
				);

				// 11. Fe
				check("fe", latestPot.fe, null, 0.2, "High Iron Content", "Fe");

				// 12. Si
				check("si", latestPot.si, null, 0.2, "High Silicon", "Si");

				// Extra: Ratio (Sa) - Check sa_in_target flag if available
				if (
					latestPot.sa_in_target !== undefined &&
					latestPot.sa_in_target === 0
				)
					mappedData.warnings.push({
						title: "Ratio Out of Target",
						message: `Sa ${latestPot.sa}%`,
					});

				// Decision Tree Warnings (Check if AI predicts issues)
				// Rule 1: Predicted Drops
				if (
					latestPot.predicted_ce &&
					latestPot.ce &&
					latestPot.predicted_ce < latestPot.ce - 1.5
				) {
					mappedData.warnings.push({
						title: "Efficiency Drop Forecast (AI)",
						message: `Predicted -${(latestPot.ce - latestPot.predicted_ce).toFixed(1)}% drop.`,
					});
				}
				// Rule 2: Instability Pattern (Noise + Voltage)
				if (latestPot.noise > 45 && latestPot.avv < 4.0) {
					mappedData.warnings.push({
						title: "Instability Pattern (AI)",
						message: "High Noise + Low Voltage instability.",
					});
				}
				// Rule 3: Aging Risks
				if (latestPot.age_day > 1500 && latestPot.fe > 0.12) {
					mappedData.warnings.push({
						title: "End-of-Life Risks (AI)",
						message: "High Age + Iron content risk.",
					});
				}

				// 6. Fetch Recommendations (Now Correctly Placed AFTER object definition)
				try {
					const recData = await potService.getRecommendations(id);
					if (recData && recData.recommendations) {
						mappedData.recommendations = recData.recommendations;
					}

					// Fallback default message if no recommendations from API or empty list
					if (
						!mappedData.recommendations ||
						mappedData.recommendations.length === 0
					) {
						mappedData.recommendations = [
							{
								code: "OK",
								diagnosis: "Operasi Stabil",
								actions: ["Pertahankan parameter operasi saat ini"],
								target: "Stable CE",
								window: "-",
								priority: 10,
							},
						];
					}
				} catch (recErr) {
					console.error("Failed to fetch recommendations", recErr);
					// Fallback on error
					mappedData.recommendations = [
						{
							code: "OK",
							diagnosis: "Operasi Stabil (Fallback)",
							actions: ["Pertahankan parameter operasi saat ini"],
							target: "Stable CE",
							window: "-",
							priority: 10,
						},
					];
				}

				setPotData(mappedData);
			} catch (err) {
				console.error("Error fetching pot details:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchPotDetails();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id, timeRange, settings, isDarkMode]);

	const formatTime = (date) => {
		return date.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const formatDate = (date) => {
		return date.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	// Calculate Hybrid Time for Display
	// Year/Month/Day comes from anchorDate (Sim Date)
	// Hour/Minute/Second comes from currentTime (Real Time)
	const getDisplayDate = () => {
		if (!anchorDate) return currentTime; // Fallback

		const display = new Date(currentTime);
		display.setFullYear(anchorDate.getFullYear());
		display.setMonth(anchorDate.getMonth());
		display.setDate(anchorDate.getDate());
		return display;
	};

	const displayTime = getDisplayDate();

	if (loading || !potData) {
		return (
			<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
				<div className="loading-container">
					<div className="loading-spinner"></div>
					<div className="loading-text">Loading Pot Details...</div>
				</div>
			</div>
		);
	}

	const data = potData; // Alias for render

	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
			<ToastContainer toasts={toasts} removeToast={removeToast} />

			<Header
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				isDarkMode={isDarkMode}
				toggleTheme={toggleTheme}
				showControls={false}
			/>

			<div
				className="detail-navigation-bar"
				style={{ display: "flex", alignItems: "center", gap: "10px" }}
			>
				<button
					className="nav-btn back-btn"
					onClick={() => {
						if (location.state?.from) {
							navigate(location.state.from);
						} else {
							navigate("/dashboard");
						}
					}}
				>
					<ArrowLeft size={16} /> BACK
				</button>
				<button className="nav-btn today-btn">TODAY</button>

				{/* Real-time Clock */}
				<div
					className="real-time-clock"
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						padding: "0.5rem 1rem",
						background: "var(--bg-card)",
						borderRadius: "8px",
						boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
						border: "1px solid var(--border-subtle)",
						minWidth: "120px",
						marginLeft: "auto",
					}}
				>
					<div
						style={{
							fontSize: "1.1rem",
							fontWeight: "800",
							color: "var(--text-primary)",
							lineHeight: "1.2",
						}}
					>
						{formatTime(displayTime)}
					</div>
					<div
						style={{
							fontSize: "0.75rem",
							color: "var(--text-secondary)",
							fontWeight: "500",
						}}
					>
						{formatDate(displayTime)}
					</div>
				</div>
			</div>

			<h1 className="page-title">Status Pot {id || "1"}</h1>

			<div className="detail-grid">
				{/* Top Section: Efficiency & Sensors */}
				<div className="efficiency-sensor-row">
					{/* Efficiency Cards Column */}
					<div
						className="efficiency-column"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "16px",
							minWidth: "300px",
						}}
					>
						<EfficiencyGaugeCard
							title="Current Efficiency"
							data={data.currentEfficiency}
						/>
						<EfficiencyGaugeCard
							title="Predicted CE"
							data={data.predictedEfficiency}
						/>
					</div>

					{/* Sensor Grid */}
					<div className="sensor-grid-container">
						{data.sensors.map((sensor, index) => {
							let Icon = Zap;
							if (sensor.type === "temperature") Icon = Thermometer;
							else if (sensor.type === "level") Icon = Ruler;
							else if (sensor.type === "noise") Icon = Activity;
							else if (sensor.type === "ae") Icon = Zap;
							else if (sensor.type === "time") Icon = Timer;
							else if (sensor.type === "weight") Icon = Scale;
							else if (sensor.type === "ratio") Icon = Percent;
							else if (sensor.type === "predicted") Icon = Lightbulb;
							else if (sensor.type === "current")
								Icon = Zap; // Re-using Zap for current
							else if (sensor.type === "resistance")
								Icon = Activity; // Re-using Activity for resistance
							else if (sensor.type === "power")
								Icon = Zap; // Re-using Zap for power
							else if (sensor.type === "feed")
								Icon = Layers; // Re-using Layers for feed
							else if (sensor.type === "cathode")
								Icon = Activity; // Re-using Activity for cathode
							else if (sensor.type === "acd") Icon = Ruler; // Re-using Ruler for acd

							return (
								<div
									key={index}
									className={`sensor-detail-card ${sensor.status}`}
								>
									<div className="sensor-icon-wrapper">
										<Icon size={20} />
										<span className="trend-indicator">{sensor.trend}</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">{sensor.value}</div>
										<div className="sensor-label">{sensor.label}</div>
										<div
											className="sensor-range"
											style={{
												fontSize: "0.75rem",
												opacity: 0.8,
												marginTop: "2px",
											}}
										>
											Range: {sensor.range}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Warning Section */}
				<div className="detail-section warning-section">
					<div
						className="section-header text-warning"
						style={{ marginBottom: "1rem" }}
					>
						<AlertTriangle size={20} /> Early Warning System
					</div>

					{data.warnings && data.warnings.length > 0 ? (
						<div
							className="warning-grid"
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
								gap: "12px",
							}}
						>
							{data.warnings.map((warn, idx) => (
								<div
									key={idx}
									className="warning-banner"
									style={{ margin: 0, height: "100%" }}
								>
									<div className="warning-icon-large">
										<AlertTriangle size={24} />
									</div>
									<div className="warning-content">
										<div className="warning-title">{warn.title}</div>
										<div className="warning-message">{warn.message}</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="warning-banner optimal">
							<div className="warning-icon-large">
								<Lightbulb size={24} />
							</div>
							<div className="warning-content">
								<div className="warning-title">System Normal</div>
								<div className="warning-message">
									No critical warnings triggered (Signal or AI).
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Recommendation Section */}
				<div className="detail-section recommendation-section">
					<div className="section-header text-success">
						<Lightbulb size={20} /> Rekomendasi
					</div>
					<div className="recommendation-grid">
						{data.recommendations.map((rec, idx) => (
							<div
								key={idx}
								className={`recommendation-card priority-${rec.priority <= 2 ? "1" : rec.priority <= 4 ? "2" : "normal"}`}
							>
								<div className="rec-header">
									<div className="rec-icon">
										<Lightbulb size={24} />
									</div>
									<div className="rec-content">
										<div className="rec-title">{rec.diagnosis}</div>
										<ul className="rec-actions">
											{rec.actions.map((action, i) => (
												<li key={i} className="rec-action-item">
													{action}
												</li>
											))}
										</ul>
										<div
											className="rec-impact"
											style={{
												marginTop: "0.5rem",
												fontSize: "0.85rem",
												color: "#15803d",
											}}
										>
											<strong>Impact:</strong> {rec.impact}
										</div>
									</div>
								</div>
								<div className="rec-meta">
									<span className="rec-tag">Target: {rec.target}</span>
									<span className="rec-tag">Window: {rec.window}</span>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CHARTS SECTION */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						margin: "2rem 0 1rem",
					}}
				>
					<h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
						Parameter Trends
					</h3>
					<div
						className="time-toggle"
						style={{ position: "relative", minWidth: "160px" }}
					>
						<select
							value={timeRange}
							onChange={(e) => setTimeRange(e.target.value)}
							style={{
								appearance: "none",
								width: "100%",
								background: "var(--bg-card)",
								color: "var(--text-primary)",
								border: "1px solid var(--border-subtle)",
								padding: "8px 36px 8px 12px",
								borderRadius: "8px",
								fontSize: "0.875rem",
								fontWeight: 600,
								cursor: "pointer",
								outline: "none",
								boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
							}}
						>
							<option value="7D">Last 7 Days</option>
							<option value="30D">Last 30 Days</option>
						</select>
						<div
							style={{
								position: "absolute",
								right: "10px",
								top: "50%",
								transform: "translateY(-50%)",
								pointerEvents: "none",
								color: "var(--text-secondary)",
								display: "flex",
							}}
						>
							<ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />
						</div>
					</div>
				</div>

				<div
					className="detail-charts-grid"
					style={{
						gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
					}}
				>
					{/* Render Filtered Charts with Reference Lines */}
					{["bt", "m", "noise", "osp", "feed_pct", "oa", "current", "alf3"].map(
						(key) => {
							if (!data.charts[key]) return null;
							const chartData = data.charts[key];
							// Fallback config if not found
							const config = data.chartConfigs[key] || {
								label: key.toUpperCase(),
								color: "#888",
								type: "line",
							};

							// Define Reference Lines (Normal Standards - Upper Limit Only)
							let limitValue = null;
							switch (key) {
								case "bt":
									limitValue = 960;
									break;
								case "m":
									limitValue = 27;
									break;
								case "noise":
									limitValue = 50;
									break;
								case "osp":
									limitValue = 0.5;
									break;
								case "feed_pct":
									limitValue = 105;
									break;
								case "oa":
									limitValue = 20;
									break;
								case "current":
									limitValue = 200;
									break;
								case "alf3":
									limitValue = 60;
									break;
							}
							const referenceLines = limitValue
								? [{ y: limitValue, color: config.color }]
								: [];

							return (
								<ChartCard
									key={key}
									title={config.label}
									data={chartData}
									color={config.color}
									type={config.type}
									subtitle={timeRange === "7D" ? "Last 7 Days" : "Last 30 Days"}
									referenceLines={referenceLines}
									limit={limitValue}
								/>
							);
						},
					)}
				</div>
			</div>

			{/* ADDITIONAL PARAMETERS SECTION (CARDS) */}
			<div className="additional-params-section" style={{ marginTop: "2rem" }}>
				<h3
					style={{
						fontSize: "1.25rem",
						fontWeight: 700,
						marginBottom: "1.5rem",
						borderLeft: "4px solid var(--primary)",
						paddingLeft: "10px",
					}}
				>
					Additional Operational Parameters
				</h3>

				{/* 1. Pot Status & Controls */}
				<div className="param-group" style={{ marginBottom: "2rem" }}>
					<h4
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--text-secondary)",
						}}
					>
						Pot Status & Controls
					</h4>
					<div className="sensor-grid-container compact-grid">
						{[
							{ label: "Pot Day", key: "age_day", unit: "" },
							{ label: "Gen", key: "gen", unit: "" },
							{ label: "Control Type", key: "ctype", unit: "" },
							{ label: "Status Code", key: "pot_status_code", unit: "" },
							{ label: "Transition", key: "transition", unit: "" },
							{ label: "Age (Month)", key: "age_month", unit: "mo" },
							{ label: "Class", key: "class_", unit: "" },
							{ label: "Pot Design", key: "pot_design", unit: "" },
							{ label: "T-Shift", key: "tshift", unit: "" },
							{ label: "AC Schedule", key: "ac_schedule", unit: "" },
							{ label: "MT Schedule", key: "mt_schedule", unit: "" },
							{ label: "MT Shift", key: "mt_shift", unit: "" },
							{ label: "MT Day", key: "mt_day", unit: "" },
						].map((item, idx) => {
							const val = data.history[data.history.length - 1]?.[item.key];
							return (
								<div key={idx} className="sensor-detail-card optimal compact">
									<div className="sensor-icon-wrapper">
										<Layers size={20} />
										<span className="trend-indicator">-</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">
											{val !== undefined && val !== null ? val : "-"}{" "}
											<span style={{ fontSize: "0.8rem" }}>{item.unit}</span>
										</div>
										<div className="sensor-label">{item.label}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* 2. Production & Physical */}
				<div className="param-group" style={{ marginBottom: "2rem" }}>
					<h4
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--text-secondary)",
						}}
					>
						Production & Physical
					</h4>
					<div className="sensor-grid-container compact-grid">
						{[
							{ label: "Metal Mass", key: "metal_kg", unit: "kg" },
							{ label: "Dross", key: "dross", unit: "kg" },
							{ label: "Metal Leak", key: "metal_leak", unit: "kg" },
							{ label: "Bath Tap", key: "bath_tap", unit: "cm" },
							{ label: "Bath Charge", key: "bath_charge", unit: "cm" },
							{ label: "Tap Freq", key: "c_tapping", unit: "" },
							{ label: "Temp Anode Cov", key: "temp_ac", unit: "°C" },
							{ label: "Metal Scrap", key: "metal_scrap", unit: "kg" },
							{ label: "Metal Ball", key: "metal_ball", unit: "kg" },
							{ label: "MT BB", key: "mt_bb", unit: "" },
							{ label: "Meji", key: "meji", unit: "" },
							{ label: "Frozen Bath", key: "frozen_bath", unit: "" },
							{ label: "Bath Powder", key: "bath_powder", unit: "" },
							{ label: "Return Crust", key: "return_crust", unit: "" },
							{ label: "Dross Trap", key: "dross_trp", unit: "" },
							{ label: "BBar Miring", key: "bbar_miring", unit: "" },
							{ label: "Belly/Helly", key: "belly_helly", unit: "" },
						].map((item, idx) => {
							const val = data.history[data.history.length - 1]?.[item.key];
							return (
								<div key={idx} className="sensor-detail-card optimal compact">
									<div className="sensor-icon-wrapper">
										<Scale size={20} />
										<span className="trend-indicator">-</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">
											{val !== undefined &&
											val !== null &&
											typeof val === "number"
												? val.toFixed(1)
												: val || "-"}{" "}
											<span style={{ fontSize: "0.8rem" }}>{item.unit}</span>
										</div>
										<div className="sensor-label">{item.label}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* 3. Anode & Mechanical */}
				<div className="param-group" style={{ marginBottom: "2rem" }}>
					<h4
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--text-secondary)",
						}}
					>
						Anode & Mechanical
					</h4>
					<div className="sensor-grid-container compact-grid">
						{[
							{ label: "Anode Reset", key: "anode_reset", unit: "" },
							{ label: "Nipple Mass", key: "nipple_kg", unit: "kg" },
							{ label: "Nipple Freq", key: "nipple_freq", unit: "" },
							{ label: "Break SP", key: "break_sp", unit: "" },
							{ label: "Break Local", key: "break_local", unit: "" },
							{ label: "Broke Anode", key: "broke_anode_kg", unit: "kg" },
							{ label: "Broke Freq", key: "broke_anode_freq", unit: "" },
							{ label: "RWB", key: "rwb_kg", unit: "kg" },
							{ label: "RWB Freq", key: "rwb_freq", unit: "" },
							{ label: "TACB", key: "tacb", unit: "" },
							{ label: "Kerak", key: "kerak_kg", unit: "kg" },
							{ label: "Kerak Freq", key: "kerak_freq", unit: "" },
						].map((item, idx) => {
							const val = data.history[data.history.length - 1]?.[item.key];
							return (
								<div key={idx} className="sensor-detail-card optimal compact">
									<div className="sensor-icon-wrapper">
										<Layers size={20} />
										<span className="trend-indicator">-</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">
											{val !== undefined &&
											val !== null &&
											typeof val === "number"
												? val.toFixed(1)
												: val || "-"}{" "}
											<span style={{ fontSize: "0.8rem" }}>{item.unit}</span>
										</div>
										<div className="sensor-label">{item.label}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* 4. Chemistry Details */}
				<div className="param-group" style={{ marginBottom: "2rem" }}>
					<h4
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--text-secondary)",
						}}
					>
						Detailed Chemistry
					</h4>
					<div className="sensor-grid-container compact-grid">
						{[
							{ label: "Fe", key: "fe", unit: "%" },
							{ label: "Si", key: "si", unit: "%" },
							{ label: "Sa", key: "sa", unit: "%" },
							{ label: "S1A", key: "s1a", unit: "" },
							{ label: "S1B", key: "s1b", unit: "" },
							{ label: "Soda Ash", key: "soda_ash", unit: "kg" },
							{ label: "Sa Target", key: "sa_in_target", unit: "" },
						].map((item, idx) => {
							const val = data.history[data.history.length - 1]?.[item.key];
							return (
								<div key={idx} className="sensor-detail-card optimal compact">
									<div className="sensor-icon-wrapper">
										<Activity size={20} />
										<span className="trend-indicator">-</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">
											{val !== undefined &&
											val !== null &&
											typeof val === "number"
												? val.toFixed(1)
												: val || "-"}{" "}
											<span style={{ fontSize: "0.8rem" }}>{item.unit}</span>
										</div>
										<div className="sensor-label">{item.label}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* 5. Electrical & Control Extras */}
				<div className="param-group" style={{ marginBottom: "2rem" }}>
					<h4
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--text-secondary)",
						}}
					>
						Electrical & Control Extras
					</h4>
					<div className="sensor-grid-container compact-grid">
						{[
							{ label: "DC", key: "dc", unit: "" },
							{ label: "Group Curr", key: "group_current", unit: "kA" },
							{ label: "Over Voltage", key: "ov", unit: "V" },
							{ label: "PSP", key: "psp", unit: "V" },
							{ label: "AE Freq", key: "aef", unit: "" },
							{ label: "AE Volt", key: "aev", unit: "V" },
							{ label: "AE kWh", key: "ae_kwh", unit: "kWh" },
							{ label: "FD", key: "fd", unit: "" },
							{ label: "CB", key: "cb", unit: "" },
							{ label: "MC", key: "mc", unit: "" },
							{ label: "s", key: "s", unit: "" },
							{ label: "cd", key: "cd", unit: "" },
							{ label: "BT Target", key: "bt_in_target", unit: "" },
						].map((item, idx) => {
							const val = data.history[data.history.length - 1]?.[item.key];
							return (
								<div key={idx} className="sensor-detail-card optimal compact">
									<div className="sensor-icon-wrapper">
										<Zap size={20} />
										<span className="trend-indicator">-</span>
									</div>
									<div className="sensor-content">
										<div className="sensor-value">
											{val !== undefined &&
											val !== null &&
											typeof val === "number"
												? val.toFixed(1)
												: val || "-"}{" "}
											<span style={{ fontSize: "0.8rem" }}>{item.unit}</span>
										</div>
										<div className="sensor-label">{item.label}</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* HISTORY TABLES SECTION - SAME GROUPS */}
			<div
				className="history-section"
				style={{ marginTop: "3rem", paddingBottom: "3rem" }}
			>
				<h3
					style={{
						fontSize: "1.25rem",
						fontWeight: 700,
						marginBottom: "1.5rem",
						borderLeft: "4px solid var(--primary)",
						paddingLeft: "10px",
					}}
				>
					Detailed Parameter History (30 Days)
				</h3>

				<div className="history-table-wrapper" style={{ minWidth: "100%" }}>
					<HistoryTable
						title="Comprehensive Parameter History"
						data={data.history}
						height="600px"
						columns={[
							// 1. Pot Status & Controls
							{ key: "age_day", label: "Age" },
							{ key: "pot_status_code", label: "Status" },
							{ key: "tshift", label: "T-Shift" },
							{ key: "mt_shift", label: "MT-Shift" },
							{ key: "ac_schedule", label: "AC Sch" },
							{ key: "mt_schedule", label: "MT Sch" },
							// 2. Production & Physical
							{ key: "metal_kg", label: "Metal (kg)", decimals: 0 },
							{ key: "dross", label: "Dross", decimals: 0 },
							{ key: "bath_tap", label: "B-Tap", decimals: 1 },
							{ key: "bath_charge", label: "B-Chg", decimals: 1 },
							{ key: "temp_ac", label: "T-AC", decimals: 1 },
							{ key: "c_tapping", label: "TapFreq", decimals: 0 },
							// 3. Anode & Mechanical
							{ key: "anode_reset", label: "Rst" },
							{ key: "nipple_kg", label: "Nipple", decimals: 0 },
							{ key: "break_sp", label: "BrkSP" },
							{ key: "break_local", label: "BrkLoc" },
							{ key: "rwb_kg", label: "RWB", decimals: 0 },
							{ key: "kerak_kg", label: "Kerak", decimals: 0 },
							// 4. Detailed Chemistry
							{ key: "fe", label: "Fe", decimals: 2 },
							{ key: "si", label: "Si", decimals: 2 },
							{ key: "sa", label: "Sa", decimals: 1 },
							{ key: "soda_ash", label: "Soda", decimals: 0 },
							{ key: "s1a", label: "S1A" },
							{ key: "s1b", label: "S1B" },
							// 5. Electrical Extras
							{ key: "pl_current", label: "Current", decimals: 0 },
							{ key: "avv", label: "Volt", decimals: 2 },
							{ key: "noise", label: "Noise", decimals: 0 },
							{ key: "ov", label: "OV", decimals: 2 },
							{ key: "psp", label: "PSP", decimals: 2 },
							{ key: "ae_kwh", label: "AE kWh", decimals: 2 },
							{ key: "aef", label: "AE Freq", decimals: 2 },
							{ key: "cb", label: "CB" },
							{ key: "fd", label: "FD" },
						]}
					/>
				</div>
			</div>
		</div>
	);
};

const EfficiencyGaugeCard = ({ title, data }) => {
	const { value, target, config } = data;
	return (
		<div
			className="efficiency-card-large"
			style={{
				background: config.bg,
				borderColor: config.border,
				flex: 1,
			}}
		>
			<div className="card-header" style={{ color: config.text }}>
				{title}
			</div>
			<div className="gauge-container">
				<div className="gauge-circle">
					<div className="gauge-value" style={{ color: config.color }}>
						{value}%
					</div>
					<div className="gauge-target">Target: {target}%</div>
				</div>
				<svg className="gauge-svg" viewBox="0 0 100 100">
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="#e2e8f0"
						strokeWidth="10"
					/>
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke={config.color}
						strokeWidth="10"
						strokeDasharray="283"
						strokeDashoffset={283 - (Math.min(value, 100) / 100) * 283}
						strokeLinecap="round"
						transform="rotate(-90 50 50)"
					/>
				</svg>
			</div>
			<div
				className="status-badge-large"
				style={{
					background: config.color,
					boxShadow: `0 4px 6px -1px ${config.color}55`,
				}}
			>
				{config.status}
			</div>
		</div>
	);
};

const CustomTooltip = ({ active, payload, label, color, limit }) => {
	if (active && payload && payload.length) {
		return (
			<div
				style={{
					background: "var(--bg-card)",
					border: "1px solid var(--border-subtle)",
					padding: "8px 12px",
					borderRadius: "8px",
					boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
					fontSize: "12px",
				}}
			>
				<p
					style={{
						margin: 0,
						fontWeight: 600,
						color: "var(--text-secondary)",
					}}
				>
					{label}
				</p>
				<p style={{ margin: "4px 0 0", color: color, fontWeight: 700 }}>
					Value: {payload[0].value}
				</p>
				{limit !== null && (
					<p
						style={{
							margin: "4px 0 0",
							color: "var(--text-secondary)",
							borderTop: "1px solid var(--border-subtle)",
							paddingTop: "4px",
						}}
					>
						Normal Limit: <strong>{limit}</strong>
					</p>
				)}
			</div>
		);
	}
	return null;
};

const ChartCard = ({
	title,
	data,
	color,
	type = "area",
	subtitle = "Weekly Trend",
	referenceLines = [],
	limit = null,
}) => {
	const gradientId = `color-${title.replace(/\s+/g, "-")}`;

	return (
		<div className="detail-chart-card">
			<div className="detail-chart-header">
				<span>{title}</span>
				<span className="chart-period">{subtitle}</span>
			</div>
			<div className="detail-chart-body">
				<ResponsiveContainer width="100%" height={150}>
					{type === "line" ? (
						<LineChart data={data}>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								opacity={0.3}
							/>
							<XAxis dataKey="day" hide />
							<YAxis hide domain={["auto", "auto"]} />
							<Tooltip content={<CustomTooltip color={color} limit={limit} />} />
							<Line
								type="linear"
								dataKey="value"
								stroke={color}
								strokeWidth={3}
								dot={{ r: 2 }}
								activeDot={{ r: 4 }}
							/>

							{referenceLines.map((ref, i) => (
								<ReferenceLine
									key={i}
									y={ref.y}
									stroke={ref.color}
									strokeDasharray="3 3"
								/>
							))}
						</LineChart>
					) : (
						<AreaChart data={data}>
							<defs>
								<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={color} stopOpacity={1} />
									<stop offset="95%" stopColor={color} stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								opacity={0.3}
							/>
							<XAxis dataKey="day" hide />
							<YAxis hide domain={["auto", "auto"]} />
							<Tooltip content={<CustomTooltip color={color} limit={limit} />} />
							<Area
								type="linear"
								dataKey="value"
								stroke={color}
								strokeWidth={3}
								fillOpacity={1}
								fill={`url(#${gradientId})`}
								baseValue="dataMin"
							/>
							{referenceLines.map((ref, i) => (
								<ReferenceLine
									key={i}
									y={ref.y}
									stroke={ref.color}
									strokeDasharray="3 3"
								/>
							))}
						</AreaChart>
					)}
				</ResponsiveContainer>
				<div className="chart-axis-labels">
					{data.length > 0 && (
						<>
							<span>{data[0].day}</span>
							<span>{data[Math.floor(data.length / 2)].day}</span>
							<span>{data[data.length - 1].day}</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default PotDetailPage;
