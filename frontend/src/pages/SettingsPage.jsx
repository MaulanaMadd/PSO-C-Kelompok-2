import {
	Activity,
	AlertCircle,
	ChevronLeft,
	Edit2,
	Ruler,
	Save,
	Thermometer,
	TrendingUp,
	X,
	Zap,
	Upload,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/dashboard/Header";
import "../styles/dashboard.css";
import { useSettings } from "../context/SettingsContext";

const SettingsPage = ({ isDarkMode, toggleTheme }) => {
	const navigate = useNavigate();
	const { settings, updateSettings, loading } = useSettings();
	const [isEditing, setIsEditing] = useState(false);

	// Local state for editing form
	const [formData, setFormData] = useState([]);

	// Transform settings object to array for display when loaded
	// Transform settings object to array for display when loaded
	useEffect(() => {
		if (settings && Object.keys(settings).length > 0 && !isEditing) {
			const arr = Object.values(settings).sort((a, b) =>
				a.key.localeCompare(b.key),
			);
			setFormData(JSON.parse(JSON.stringify(arr))); // Deep copy
		}
	}, [settings, isEditing]);

	const handleParamChange = (key, field, value) => {
		setFormData((prev) =>
			prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)),
		);
	};

	const handleEdit = () => {
		setIsEditing(true);
	};

	const handleCancel = () => {
		// Reset to original settings
		if (settings) {
			const arr = Object.values(settings).sort((a, b) =>
				a.key.localeCompare(b.key),
			);
			setFormData(JSON.parse(JSON.stringify(arr)));
		}
		setIsEditing(false);
	};

	const handleSave = async () => {
		// Prepare updates
		const updates = formData.map((p) => ({
			key: p.key,
			min_val: p.min_val === "" ? null : Number(p.min_val),
			target_val: p.target_val === "" ? null : Number(p.target_val),
			max_val: p.max_val === "" ? null : Number(p.max_val),
		}));

		const success = await updateSettings(updates);
		if (success) {
			alert("Configuration Saved!");
			setIsEditing(false);
		} else {
			alert("Failed to save configuration.");
		}
	};

	// Helper to get icon
	const getIcon = (key) => {
		switch (key) {
			case "bt":
				return <Thermometer size={18} />;
			case "avv":
				return <Zap size={18} />;
			case "noise":
				return <Activity size={18} />;
			case "ce":
				return <TrendingUp size={18} />;
			case "m":
				return <Ruler size={18} />;
			default:
				return <Activity size={18} />;
		}
	};

	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
			{/* Header with restricted controls */}
			<Header
				activeTab="SETTINGS"
				isDarkMode={isDarkMode}
				toggleTheme={toggleTheme}
				showControls={false}
			/>

			<div className="content-padder" style={{ padding: "2rem 3rem" }}>
				<div
					className="settings-container"
					style={{
						maxWidth: "1200px", // Increased width for grid
						margin: "0 auto",
					}}
				>
					{/* Navigation Bar */}
					<div
						className="detail-navigation-bar"
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "1.5rem",
						}}
					>
						<button
							className="nav-btn back-btn"
							onClick={() => navigate("/dashboard")}
						>
							<ChevronLeft size={16} /> BACK TO DASHBOARD
						</button>
					</div>

					<div
						className="settings-header"
						style={{
							marginBottom: "2rem",
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<div>
							<h2
								style={{
									fontSize: "1.8rem",
									fontWeight: "bold",
									marginBottom: "0.5rem",
									color: "var(--text-primary)",
								}}
							>
								System Configuration
							</h2>
							<p style={{ color: "var(--text-secondary)" }}>
								Manage baseline index parameters for POT analysis
							</p>
						</div>

						<div
							className="action-buttons"
							style={{ display: "flex", gap: "0.75rem" }}
						>
							{isEditing ? (
								<>
									<button
										className="nav-btn"
										onClick={handleCancel}
										style={{
											background: "#fef2f2",
											color: "#ef4444",
											borderColor: "#fca5a5",
										}}
									>
										<X size={18} /> Cancel
									</button>
									<button
										className="nav-btn"
										onClick={handleSave}
										style={{
											background:
												"linear-gradient(135deg, #10b981 0%, #059669 100%)",
											color: "white",
											border: "none",
										}}
									>
										<Save size={18} /> Save Changes
									</button>
								</>
							) : (
								<>
									<button
										className="nav-btn"
										onClick={handleEdit}
										style={{
											background: "#eff6ff",
											color: "#3b82f6",
											borderColor: "#bfdbfe",
										}}
									>
										<Edit2 size={18} /> Edit Configuration
									</button>
								</>
							)}
						</div>
					</div>

					<div
						className="settings-card glass-panel"
						style={{ padding: "2rem" }}
					>
						<div
							className="card-header"
							style={{
								marginBottom: "2rem",
								display: "flex",
								alignItems: "center",
								gap: "0.75rem",
							}}
						>
							<div
								className="icon-box"
								style={{
									background: "rgba(59, 130, 246, 0.1)",
									color: "#3b82f6",
									padding: "8px",
									borderRadius: "8px",
								}}
							>
								<AlertCircle size={20} />
							</div>
							<h3
								style={{
									fontSize: "1.25rem",
									fontWeight: "600",
									color: "var(--text-primary)",
								}}
							>
								Baseline Index Parameters
							</h3>
						</div>

						{loading ? (
							<div>Loading configuration...</div>
						) : (
							/* Grid Layout for Parameters */
							<div
								className="param-grid"
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
									gap: "1.5rem",
								}}
							>
								{formData.map((param) => (
									<div
										key={param.key}
										className="param-row-card"
										style={{
											background: "var(--bg-card)",
											border: "1px solid var(--border-subtle)",
											borderRadius: "16px", // Matching dashboard 16px
											boxShadow: "var(--shadow-sm)", // Added shadow
											padding: "1.5rem",
											opacity: isEditing ? 1 : 0.85,
											transition: "all 0.2s",
											display: "flex",
											flexDirection: "column",
											height: "100%",
										}}
									>
										<div
											className="param-info"
											style={{
												display: "flex",
												alignItems: "center",
												gap: "1rem",
												marginBottom: "1.5rem",
											}}
										>
											<div
												className="param-icon"
												style={{
													background: "var(--bg-hover)",
													width: "42px",
													height: "42px",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													borderRadius: "10px",
													color: "var(--text-primary)",
												}}
											>
												{getIcon(param.key)}
											</div>
											<div>
												<h4
													style={{
														margin: 0,
														fontSize: "1.1rem",
														fontWeight: "600",
														color: "var(--text-primary)",
													}}
												>
													{param.label}
												</h4>
												<span
													style={{
														fontSize: "0.85rem",
														color: "var(--text-muted)",
													}}
												>
													Unit: <strong>{param.unit}</strong>
												</span>
											</div>
										</div>

										<div
											className="inputs-grid"
											style={{
												display: "grid",
												gridTemplateColumns: "1fr 1fr 1fr",
												gap: "0.75rem",
												marginTop: "auto", // Pushes inputs to bottom if heights vary
											}}
										>
											<div className="input-group">
												<label
													style={{
														display: "block",
														fontSize: "0.75rem",
														fontWeight: "600",
														textTransform: "uppercase",
														color: "var(--text-secondary)",
														marginBottom: "0.5rem",
														textAlign: "center",
													}}
												>
													Min
												</label>
												<input
													type="number"
													value={param.min_val ?? ""}
													onChange={(e) =>
														handleParamChange(
															param.key,
															"min_val",
															e.target.value,
														)
													}
													disabled={!isEditing}
													step="0.01"
													style={{
														width: "100%",
														padding: "0.6rem",
														borderRadius: "8px",
														border: "1px solid var(--border-subtle)",
														background: isEditing
															? "var(--bg-main)"
															: "var(--bg-hover)",
														color: "var(--text-primary)",
														cursor: isEditing ? "text" : "not-allowed",
														fontSize: "0.95rem",
														textAlign: "center",
													}}
												/>
											</div>
											<div className="input-group">
												<label
													style={{
														display: "block",
														fontSize: "0.75rem",
														fontWeight: "600",
														textTransform: "uppercase",
														color: "#3b82f6",
														marginBottom: "0.5rem",
														textAlign: "center",
													}}
												>
													Target
												</label>
												<input
													type="number"
													value={param.target_val ?? ""}
													onChange={(e) =>
														handleParamChange(
															param.key,
															"target_val",
															e.target.value,
														)
													}
													disabled={!isEditing}
													step="0.01"
													style={{
														width: "100%",
														padding: "0.6rem",
														borderRadius: "8px",
														border: isEditing
															? "1px solid #3b82f6"
															: "1px solid var(--border-subtle)",
														background: isEditing
															? "rgba(59, 130, 246, 0.05)"
															: "var(--bg-hover)",
														color: "var(--text-primary)",
														fontWeight: "bold",
														cursor: isEditing ? "text" : "not-allowed",
														fontSize: "0.95rem",
														textAlign: "center",
													}}
												/>
											</div>
											<div className="input-group">
												<label
													style={{
														display: "block",
														fontSize: "0.75rem",
														fontWeight: "600",
														textTransform: "uppercase",
														color: "var(--text-secondary)",
														marginBottom: "0.5rem",
														textAlign: "center",
													}}
												>
													Max
												</label>
												<input
													type="number"
													value={param.max_val ?? ""}
													onChange={(e) =>
														handleParamChange(
															param.key,
															"max_val",
															e.target.value,
														)
													}
													disabled={!isEditing}
													step="0.01"
													style={{
														width: "100%",
														padding: "0.6rem",
														borderRadius: "8px",
														border: "1px solid var(--border-subtle)",
														background: isEditing
															? "var(--bg-main)"
															: "var(--bg-hover)",
														color: "var(--text-primary)",
														cursor: isEditing ? "text" : "not-allowed",
														fontSize: "0.95rem",
														textAlign: "center",
													}}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsPage;
