import { AlertTriangle, CheckCircle, Slash, XCircle } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

// VERSION 2.0 - CI COMPLETELY REMOVED - NO TOOLTIPS

const getStatusIcon = (status) => {
	// Normalize status to lowercase to handle varying data cases if necessary
	const s = status ? status.toLowerCase() : "";
	if (s === "optimal" || s === "good")
		return <CheckCircle size={14} color="#22c55e" />;
	if (s === "warning") return <AlertTriangle size={14} color="#f59e0b" />;
	if (s === "critical") return <XCircle size={14} color="#ef4444" />;
	if (s === "offline") return <Slash size={14} color="#374151" />;
	return null;
};

const PotGrid = ({ pots }) => {
	const navigate = useNavigate();

	return (
		<div className="pot-section">
			<div className="pot-grid">
				{pots.map((pot, index) => {
					const potNumber =
						pot.id || (pot.name ? pot.name.split(" ")[1] : index + 1);
					const potStatus =
						pot.status || (pot.value >= 90 ? "optimal" : "warning");

					// Delta Indicator
					const delta = pot.delta || 0;
					const isNegative = delta < 0;
					const deltaColor = isNegative ? "#ef4444" : "#22c55e";
					const Arrow = isNegative ? "📉" : "📈";
					const showDelta = delta !== 0;

					return (
						<div
							key={index}
							className={`pot-card status-${potStatus.toLowerCase()}`}
							onClick={() => navigate(`/pot/${potNumber}`)}
						>
							<div className="pot-card-header">
								<span style={{ fontWeight: 600 }}>Pot {potNumber}</span>
								{getStatusIcon(potStatus)}
							</div>
							<div
								className="pot-value-container"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: "2px",
								}}
							>
								<div className="pot-value">{pot.value}%</div>
								{showDelta && (
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "4px",
											fontSize: "0.8rem",
											color: deltaColor,
											fontWeight: "700",
											background: isNegative
												? "rgba(239, 68, 68, 0.1)"
												: "rgba(34, 197, 94, 0.1)",
											padding: "2px 8px",
											borderRadius: "12px",
											marginTop: "4px",
										}}
									>
										{isNegative ? "↓" : "↑"} {Math.abs(delta).toFixed(2)}%
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default PotGrid;
