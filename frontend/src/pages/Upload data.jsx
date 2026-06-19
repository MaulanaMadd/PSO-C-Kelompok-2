import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, Eye, RefreshCw, AlertCircle, ArrowLeft, Trash2, ChevronLeft } from "lucide-react";
import Header from "../components/dashboard/Header";
import UploadDataModal from "../components/dashboard/UploadDataModal";
import api from "../services/api";
import "../styles/dashboard.css";

const UploadDataPage = ({ isDarkMode, toggleTheme }) => {
	const navigate = useNavigate();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [history, setHistory] = useState([]);
	const [itemToDelete, setItemToDelete] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const apiUrl = import.meta.env.VITE_API_BASE_URL;

	const fetchHistory = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get("/ingest/history");
			setHistory(res.data);
		} catch (err) {
			setError(err.response?.data?.detail || err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let isMounted = true;
		const initFetch = async () => {
			try {
				const res = await api.get("/ingest/history");
				if (isMounted) setHistory(res.data);
			} catch (err) {
				if (isMounted) setError(err.response?.data?.detail || err.message);
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		initFetch();
		return () => { isMounted = false; };
	}, []);

	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`} style={{ 
			minHeight: "100vh", 
			background: "var(--bg-main)", 
			display: "flex", 
			flexDirection: "column" 
		}}>
			<Header
				activeTab="UPLOAD"
				isDarkMode={isDarkMode}
				toggleTheme={toggleTheme}
				showControls={false}
			/>
			<div className="main-content" style={{ flex: 1, padding: "2rem", paddingTop: "100px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
				
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

				{/* Header Section */}
				<div style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "2rem",
					background: "var(--bg-card)",
					padding: "1.5rem 2rem",
					borderRadius: "16px",
					boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
					border: "1px solid var(--border-subtle)"
				}}>
					<div>
						<h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
							Upload new data
						</h1>
						<p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
							Upload file excel dan lihat riwayat data yang telah diunggah.
						</p>
					</div>
					
					<button
						className="nav-btn"
						onClick={() => setIsUploadOpen(true)}
						style={{
							background: "linear-gradient(135deg, #3b82f6, #2563eb)",
							color: "white",
							border: "none",
							padding: "0.75rem 1.5rem",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							boxShadow: "0 4px 14px 0 rgba(59, 130, 246, 0.39)",
							cursor: "pointer",
							borderRadius: "8px"
						}}
					>
						<Upload size={18} /> Upload Data
					</button>
				</div>

				{/* History Table Section */}
				<div style={{
					background: "var(--bg-card)",
					borderRadius: "16px",
					padding: "1.5rem",
					boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
					border: "1px solid var(--border-subtle)"
				}}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
						<h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
							History Upload Data
						</h2>
						<button 
							onClick={fetchHistory} 
							style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
						>
							<RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
						</button>
					</div>

					{error && (
						<div style={{
							background: "#fee2e2",
							color: "#ef4444",
							padding: "1rem",
							borderRadius: "8px",
							marginBottom: "1.5rem",
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							fontSize: "0.9rem"
						}}>
							<AlertCircle size={18} />
							<span>{error}</span>
						</div>
					)}

					<div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
							<thead>
								<tr style={{ background: "var(--bg-hover)" }}>
									<th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-subtle)" }}>
										Date Uploaded
									</th>
									<th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-subtle)" }}>
										File Name
									</th>
									<th style={{ padding: "1rem", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-subtle)" }}>
										User Name
									</th>
									<th style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)", fontWeight: 600, borderBottom: "1px solid var(--border-subtle)" }}>
										
									</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
											Memuat data riwayat...
										</td>
									</tr>
								) : history.length === 0 ? (
									<tr>
										<td colSpan="4" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
											<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
												<FileSpreadsheet size={32} style={{ opacity: 0.5 }} />
												<span>Belum ada riwayat upload data.</span>
											</div>
										</td>
									</tr>
								) : (
									history.map((item) => (
										<tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.2s" }} className="table-row-hover">
											<td style={{ padding: "1rem", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
												{new Date(item.uploaded_at).toLocaleString("id-ID", {
													year: 'numeric', month: 'short', day: 'numeric',
													hour: '2-digit', minute: '2-digit'
												})}
											</td>
											<td style={{ padding: "1rem", color: "var(--text-primary)", fontWeight: 500 }}>
												{item.filename}
											</td>
											<td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
												{item.uploaded_by}
											</td>
											<td style={{ padding: "1rem", textAlign: "center" }}>
												<div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
													<button
														onClick={() => navigate(`/dashboard`, { state: { datasetName: item.filename } })}
													style={{
														background: "rgba(59, 130, 246, 0.1)",
														color: "#3b82f6",
														border: "1px solid rgba(59, 130, 246, 0.2)",
														padding: "0.4rem 0.8rem",
														borderRadius: "6px",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														gap: "0.4rem",
														fontSize: "0.8rem",
														fontWeight: 600,
														transition: "all 0.2s"
													}}
													onMouseOver={(e) => {
														e.currentTarget.style.background = "#3b82f6";
														e.currentTarget.style.color = "white";
													}}
													onMouseOut={(e) => {
														e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
														e.currentTarget.style.color = "#3b82f6";
													}}
												>
													<Eye size={14} /> Tampilkan Data
												</button>
												<button
													onClick={() => setItemToDelete(item)}
													style={{
														background: "rgba(239, 68, 68, 0.1)",
														color: "#ef4444",
														border: "1px solid rgba(239, 68, 68, 0.2)",
														padding: "0.4rem 0.6rem",
														borderRadius: "6px",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														transition: "all 0.2s"
													}}
													title="Hapus Data"
													onMouseOver={(e) => {
														e.currentTarget.style.background = "#ef4444";
														e.currentTarget.style.color = "white";
													}}
													onMouseOut={(e) => {
														e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
														e.currentTarget.style.color = "#ef4444";
													}}
												>
													<Trash2 size={16} />
												</button>
											</div>
										</td>
									</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<UploadDataModal
				isOpen={isUploadOpen}
				onClose={() => setIsUploadOpen(false)}
				apiUrl={apiUrl}
				onUploadSuccess={() => {
					fetchHistory();
				}}
			/>

			{itemToDelete && (
				<div style={{
					position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
					background: "rgba(0, 0, 0, 0.5)", display: "flex",
					alignItems: "center", justifyContent: "center", zIndex: 1000,
					padding: "1rem", backdropFilter: "blur(4px)"
				}}>
					<div style={{
						background: "var(--bg-card)", padding: "2rem",
						borderRadius: "16px", width: "100%", maxWidth: "420px",
						boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
						border: "1px solid var(--border-subtle)"
					}}>
						<h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)", fontSize: "1.25rem", fontWeight: 600 }}>
							Hapus Data
						</h3>
						<p style={{ margin: "0 0 1.5rem", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>
							Apakah Anda yakin ingin menghapus riwayat data <strong>{itemToDelete.filename}</strong>? Tindakan ini tidak dapat dibatalkan.
						</p>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
							<button
								onClick={() => setItemToDelete(null)}
								disabled={loading}
								style={{
									padding: "0.6rem 1.2rem", borderRadius: "8px",
									background: "transparent", border: "1px solid var(--border-subtle)",
									color: "var(--text-secondary)", cursor: loading ? "not-allowed" : "pointer",
									fontWeight: 500, transition: "all 0.2s"
								}}
							>
								Batal
							</button>
							<button
								onClick={async () => {
									try {
										setLoading(true);
										await api.delete(`/ingest/history/${itemToDelete.id}`);
										fetchHistory();
										setItemToDelete(null);
									} catch (err) {
										setError(err.response?.data?.detail || err.message);
										setLoading(false);
										setItemToDelete(null);
									}
								}}
								disabled={loading}
								style={{
									padding: "0.6rem 1.2rem", borderRadius: "8px",
									background: "#ef4444", border: "none",
									color: "white", cursor: loading ? "not-allowed" : "pointer",
									fontWeight: 500, transition: "all 0.2s",
									opacity: loading ? 0.7 : 1,
									boxShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.39)"
								}}
							>
								{loading ? "Menghapus..." : "Ya, Hapus Data"}
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
				.table-row-hover:hover {
					background: var(--bg-hover) !important;
				}
				@keyframes spin { 100% { transform: rotate(360deg); } }
				.spin { animation: spin 1s linear infinite; }
			`}</style>
		</div>
	);
};

export default UploadDataPage;
