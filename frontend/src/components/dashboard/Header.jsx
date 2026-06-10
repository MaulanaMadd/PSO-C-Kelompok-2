import {
	Bell,
	Check,
	ChevronDown,
	LayoutGrid,
	Menu,
	Moon,
	Search,
	Settings,
	Sun,
	Trash2,
	X,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/inalum_logo.png";
import { useUser } from "../../context/UserContext";
import { authService } from "../../services/authService";
import { notificationService } from "../../services/notificationService";

const Header = ({
	activeTab,
	setActiveTab,
	searchQuery,
	setSearchQuery,
	isDarkMode,
	toggleTheme,
	showControls = true,
	selectedPotline,
	onPotlineChange,
	simulatedCurrentDate,
}) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false); // Mobile menu state
	const [isScrolled, setIsScrolled] = React.useState(false);

	// Scroll detection
	React.useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 10) {
				setIsScrolled(true);
			} else {
				setIsScrolled(false);
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Use global user context
	const { user } = useUser();

	// Removed local fetching logic -- handled by Context now

	const potlines = ["ALL POTLINE", "POTLINE 1", "POTLINE 2", "POTLINE 3"];

	const [currentTime, setCurrentTime] = React.useState(new Date());

	const [notifications, setNotifications] = React.useState([]);
	// const [showNotifications, setShowNotifications] = React.useState(false); // Removed dropdown state
	const unreadCount = notifications.filter((n) => !n.is_read).length;

	React.useEffect(() => {
		const timer = setInterval(() => {
			setCurrentTime(new Date());
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	// Fetch notifications
	const fetchNotifications = async () => {
		const data = await notificationService.getAll();
		if (data) setNotifications(data);
	};

	// React.useEffect(() => {
	//     fetchNotifications();
	//     // Poll every 30 seconds
	//     const interval = setInterval(fetchNotifications, 30000);
	//     return () => clearInterval(interval);
	// }, []);

	const markRead = async (id) => {
		await notificationService.markAsRead(id);
		// Optimistic update
		setNotifications((prev) =>
			prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
		);
	};

	const formatTime = (date) => {
		return date.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const formatDate = (date) => {
		// If simulatedCurrentDate is provided (from backend data), use its DATE part
		// Otherwise fallback to simulated date
		const displayDate = new Date(date);

		if (simulatedCurrentDate) {
			const sim = new Date(simulatedCurrentDate);
			displayDate.setFullYear(sim.getFullYear());
			displayDate.setMonth(sim.getMonth());
			displayDate.setDate(sim.getDate());
		} else {
			// Fallback default simulation: 03 Dec 2025 (only if no data)
			displayDate.setFullYear(2025);
			displayDate.setMonth(11); // Dec is 11
			displayDate.setDate(3);
		}

		return displayDate.toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	const handlePotlineSelect = (potline) => {
		if (onPotlineChange) {
			onPotlineChange(potline);
		}
		setIsDropdownOpen(false);
	};

	return (
		<>
			<div className={`header-backdrop ${isScrolled ? "visible" : ""}`}></div>
			<div className={`dashboard-header ${isScrolled ? "scrolled" : ""}`}>
				<Link
					to="/dashboard"
					className="header-left"
					style={{ textDecoration: "none", color: "inherit" }}
				>
					<img src={logo} alt="Inalum" style={{ height: "32px" }} />
					<div className="header-brand">
						<h1>DASHBOARD CURRENT EFFICIENCY ANALYTICS</h1>
						<span>PT INDONESIA ASAHAN ALUMINIUM</span>
					</div>
				</Link>

				<div className="header-right">
					<div
						className={`theme-toggle-switch ${isDarkMode ? "dark" : "light"}`}
						onClick={toggleTheme}
						title="Toggle Theme"
					>
						<div className="theme-toggle-thumb">
							{isDarkMode ? (
								<Moon
									size={16}
									className="thumb-icon"
									fill="white"
									color="white"
								/>
							) : (
								<Sun
									size={16}
									className="thumb-icon"
									fill="white"
									color="white"
								/>
							)}
						</div>
						<div className="toggle-track-icons">
							<span className="track-icon sun-track">
								<Sun size={14} />
							</span>
							<span className="track-icon moon-track">
								<Moon size={14} />
							</span>
						</div>
					</div>

					<div style={{ position: "relative" }}>
						<Link
							to="/notifications"
							className="icon-btn"
							title="Notifications"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Bell size={20} />
							{unreadCount > 0 && (
								<span
									style={{
										position: "absolute",
										top: "-5px",
										right: "-5px",
										background: "#ef4444",
										color: "white",
										fontSize: "10px",
										borderRadius: "50%",
										width: "16px",
										height: "16px",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontWeight: "bold",
									}}
								>
									{unreadCount}
								</span>
							)}
						</Link>
					</div>
					<button
						className="icon-btn"
						title={
							location.pathname === "/potline-map"
								? "Dashboard View"
								: "Grid View"
						}
						onClick={() =>
							location.pathname === "/potline-map"
								? navigate("/dashboard")
								: navigate("/potline-map")
						}
						style={{
							background:
								location.pathname === "/potline-map"
									? isDarkMode
										? "rgba(59, 130, 246, 0.15)"
										: "#eff6ff"
									: undefined,
							color:
								location.pathname === "/potline-map"
									? isDarkMode
										? "#60a5fa"
										: "#2563eb"
									: undefined,
							borderColor:
								location.pathname === "/potline-map"
									? isDarkMode
										? "rgba(59, 130, 246, 0.3)"
										: "#bfdbfe"
									: undefined,
							width: "40px",
							height: "40px",
							padding: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderStyle:
								location.pathname === "/potline-map" ? "solid" : "none",
							borderWidth: location.pathname === "/potline-map" ? "1px" : "0px",
						}}
					>
						<LayoutGrid size={20} />
					</button>
					<button
						className="icon-btn"
						onClick={() => navigate("/settings")}
						title="Settings"
					>
						<Settings size={20} />
					</button>
					<div
						className="user-avatar"
						onClick={() => navigate("/profile")}
						style={{ cursor: "pointer" }}
						title="View Profile"
					>
						<img
							src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || "User")}&background=3b82f6&color=fff`}
							alt="User"
						/>
					</div>
					<button
						className="icon-btn mobile-menu-btn"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					>
						{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				</div>
			</div>

			{showControls && (
				<div
					className={`controls-bar ${isMobileMenuOpen ? "mobile-open" : ""}`}
				>
					<div className="potline-dropdown-container">
						<button
							className={`potline-select ${isDropdownOpen ? "active" : ""}`}
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
						>
							{selectedPotline || "POTLINE 1"}
							<ChevronDown
								size={16}
								style={{
									transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
									transition: "transform 0.3s",
								}}
							/>
						</button>

						{isDropdownOpen && (
							<div className="potline-menu">
								{potlines.map((potline) => (
									<div
										key={potline}
										className={`potline-option ${selectedPotline === potline ? "selected" : ""}`}
										onClick={() => handlePotlineSelect(potline)}
									>
										{potline}
									</div>
								))}
							</div>
						)}
					</div>

					<div className="search-input-wrapper">
						<Search size={18} color="#94a3b8" />
						<input
							type="text"
							placeholder="Search POT here..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					<div className="time-tabs">
						{["Last CE", "Predicted CE"].map((tab) => (
							<button
								key={tab}
								className={`time-tab ${activeTab === tab ? "active" : ""}`}
								onClick={() => setActiveTab(tab)}
							>
								{tab}
							</button>
						))}
					</div>

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
							{formatTime(currentTime)}
						</div>
						<div
							style={{
								fontSize: "0.75rem",
								color: "var(--text-secondary)",
								fontWeight: "500",
							}}
						>
							{formatDate(currentTime)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default Header;
