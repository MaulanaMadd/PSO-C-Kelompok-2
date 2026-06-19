import {
	AlertTriangle,
	ArrowLeft,
	Bell,
	Check,
	CheckCircle,
	Info,
	Trash2,
	XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/dashboard/Header";
import { notificationService } from "../services/notificationService";

const NotificationPage = ({ isDarkMode }) => {
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchNotifications = async () => {
		setLoading(true);
		try {
			const data = await notificationService.getAll();
			setNotifications(data || []);
		} catch (error) {
			console.error("Failed to load notifications", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchNotifications();
	}, []);

	const handleNotificationClick = async (notification) => {
		// Mark as read
		if (!notification.is_read) {
			await notificationService.markAsRead(notification.id);
			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notification.id ? { ...n, is_read: true } : n,
				),
			);
		}

		// Navigate to Pot Detail if applicable
		// Pattern: "High Noise: Pot 123" or similar
		const match = notification.title.match(/Pot\s+(\d+)/i);
		if (match && match[1]) {
			navigate(`/pot/${match[1]}`);
		}
	};

	const getIcon = (type) => {
		switch (type) {
			case "warning":
				return <AlertTriangle size={24} color="#f59e0b" />;
			case "error":
				return <XCircle size={24} color="#ef4444" />;
			case "success":
				return <CheckCircle size={24} color="#10b981" />;
			default:
				return <Info size={24} color="#3b82f6" />;
		}
	};

	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
			<Header
				activeTab="NOTIFICATIONS" // Dummy tab or handle appropriately
				setActiveTab={() => {}}
				searchQuery=""
				setSearchQuery={() => {}}
				isDarkMode={isDarkMode}
				// showControls={false} // Depending on if we want controls or not, usually false for detail pages
				showControls={false}
			/>

			<div
				className="detail-navigation-bar"
				style={{ display: "flex", alignItems: "center", gap: "10px" }}
			>
				<button
					className="nav-btn back-btn"
					onClick={() => navigate("/dashboard")}
				>
					<ArrowLeft size={16} /> BACK
				</button>
			</div>

			<h1 className="page-title">Notifications</h1>

			{loading ? (
				<div className="loading-container">
					<div className="loading-spinner"></div>
				</div>
			) : (
				<div
					className="notification-list"
					style={{ maxWidth: "100%", margin: "0" }}
				>
					{notifications.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								padding: "40px",
								color: "var(--text-secondary)",
							}}
						>
							<Bell size={48} style={{ opacity: 0.2, marginBottom: "10px" }} />
							<p>No notifications yet.</p>
						</div>
					) : (
						notifications.map((n) => (
							<div
								key={n.id}
								onClick={() => handleNotificationClick(n)}
								className={`notification-item ${n.is_read ? "read" : "unread"}`}
							>
								<div className="notification-icon">{getIcon(n.type)}</div>
								<div className="notification-content">
									<div className="notification-header">
										<h4>{n.title}</h4>
										<span className="notification-time">
											{new Date(n.created_at).toLocaleString()}
										</span>
									</div>
									<p className="notification-message">{n.message}</p>
								</div>
								{!n.is_read && <div className="notification-dot"></div>}
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
};

export default NotificationPage;
