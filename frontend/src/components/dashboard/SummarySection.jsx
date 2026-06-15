import {
	Activity,
	AlertTriangle,
	BarChart2,
	CheckCircle,
	XCircle,
} from "lucide-react";
import React from "react";

const Card = ({
	icon: Icon,
	title,
	value,
	subtext,
	colorClass,
	iconColor,
	trend,
	isInverse = false,
	type,
	total = 0,
	extraData = {},
	categoryAvg = 0,
}) => {
	// Determine trend color and icon
	let trendClass = "trend-neutral";
	let trendSymbol = "";

	if (trend !== undefined && trend !== 0) {
		const isPositive = trend > 0;
		trendSymbol = isPositive ? "+" : ""; // Negative numbers have - automatically

		// Logic:
		// For "Good" metrics (Optimal, Average): Increase is Good (Green), Decrease is Bad (Red)
		// For "Bad" metrics (Warning, Critical): Increase is Bad (Red), Decrease is Good (Green)

		if (isInverse) {
			// Warning/Critical
			trendClass = isPositive ? "trend-bad" : "trend-good";
		} else {
			// Optimal/Average
			trendClass = isPositive ? "trend-good" : "trend-bad";
		}
	}

	// Visual Content Logic
	const renderVisual = () => {
		if (["OPTIMAL", "WARNING", "CRITICAL"].includes(type) && categoryAvg > 0) {
			// Display Average CE for this category
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
					}}
				>
					<span
						style={{
							fontSize: "0.6rem",
							color: "#94a3b8",
							fontWeight: "600",
							textTransform: "uppercase",
							marginBottom: "1px",
						}}
					>
						Avg CE
					</span>
					<span
						style={{
							fontSize: "1.1rem",
							fontWeight: "700",
							color: iconColor,
							lineHeight: "1",
						}}
					>
						{categoryAvg.toFixed(2)}
						<span style={{ fontSize: "0.65rem" }}>%</span>
					</span>
				</div>
			);
		} else if (type === "TOTAL") {
			// Show Active/Offline for context
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
						fontSize: "0.75rem",
						color: "#94a3b8",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<div
							style={{
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								backgroundColor: "#22c55e",
							}}
						></div>
						<span>Active: {extraData.active || 0}</span>
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
							marginTop: "2px",
						}}
					>
						<div
							style={{
								width: "6px",
								height: "6px",
								borderRadius: "50%",
								backgroundColor: "#64748b",
							}}
						></div>
						<span>Offline: {extraData.offline || 0}</span>
					</div>
				</div>
			);
		} else if (type === "AVERAGE") {
			const numericValue = parseFloat(value);
			return (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-end",
						fontSize: "0.7rem",
						color: "#94a3b8",
						whiteSpace: "nowrap"
					}}
				>
					<span>Target: 96.0%</span>
					<span style={{ color: numericValue >= 96 ? "#22c55e" : "#ef4444", fontWeight: "600" }}>
						{numericValue >= 96 ? "On Track" : "Below Target"}
					</span>
				</div>
			);
		}
		return null;
	};

	return (
		<div className="summary-card">
			<div
				className="summary-header"
				style={{
					justifyContent: "space-between",
					width: "100%",
					alignItems: "center",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "nowrap", overflow: "hidden" }}>
					<Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
					<span style={{ whiteSpace: "nowrap", fontSize: "0.85rem", textOverflow: "ellipsis", overflow: "hidden" }}>{title}</span>
				</div>
				{trend !== undefined && trend !== 0 && (
					<div className={`trend-indicator ${trendClass}`} style={{ whiteSpace: "nowrap", marginLeft: "auto", fontSize: "0.85rem", padding: "2px 6px" }}>
						{trendSymbol}
						{trend}
						{title.includes("AVG") || title.includes("AVERAGE") ? "%" : ""}
					</div>
				)}
			</div>

			<div className="card-content-wrapper">
				<div className="card-left-content">
					<div
						className="summary-value"
						style={{
							color: ["#22c55e", "#f59e0b", "#ef4444"].includes(iconColor)
								? iconColor
								: "",
						}}
					>
						{value}
					</div>
					<div className="summary-subtext">{subtext}</div>
				</div>

				<div
					className="card-visual-right"
					style={{ width: "auto", minWidth: "auto" }}
				>
					{renderVisual()}
				</div>
			</div>
		</div>
	);
};

const SummaryCards = ({ data }) => {
	// Fallback if data is not yet loaded
	const {
		total = 0,
		optimal = 0,
		warning = 0,
		critical = 0,
		average = 0,
		trends = {},
		offline = 0,
		avgOptimal = 0,
		avgWarning = 0,
		avgCritical = 0,
	} = data || {};

	// Calculate Active pots for "Total" card context
	const active = total - offline;

	return (
		<div className="summary-section">
			<Card
				type="TOTAL"
				icon={BarChart2}
				title="TOTAL POT"
				value={total}
				subtext="All Pots"
				iconColor="#64748b"
				trend={trends.total}
				extraData={{ active, offline }}
			/>
			<Card
				type="OPTIMAL"
				icon={CheckCircle}
				title="OPTIMAL"
				value={optimal}
				subtext="≥90%"
				iconColor="#22c55e"
				trend={trends.optimal}
				categoryAvg={avgOptimal}
			/>
			<Card
				type="WARNING"
				icon={AlertTriangle}
				title="WARNING"
				value={warning}
				subtext="85-90%"
				iconColor="#f59e0b"
				trend={trends.warning}
				isInverse={true}
				categoryAvg={avgWarning}
			/>
			<Card
				type="CRITICAL"
				icon={XCircle}
				title="CRITICAL"
				value={critical}
				subtext="<85%"
				iconColor="#ef4444"
				trend={trends.critical}
				isInverse={true}
				categoryAvg={avgCritical}
			/>
			<Card
				type="AVERAGE"
				icon={Activity}
				title="AVG CE"
				value={`${average.toFixed(1)}%`}
				subtext="Current Eff."
				iconColor="#22c55e"
				trend={trends.average}
			/>
		</div>
	);
};

export default SummaryCards;
