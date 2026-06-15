import {
	Camera,
	ChevronLeft,
	Edit2,
	LogOut,
	Mail,
	Phone,
	Save,
	Shield,
	User,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/dashboard/Header";
import { useUser } from "../context/UserContext";
import { authService } from "../services/authService";
import "../styles/dashboard.css";

const ProfilePage = ({ isDarkMode, toggleTheme }) => {
	const navigate = useNavigate();

	const { user: globalUser, refreshUser } = useUser();

	// No localUser needed - derive from globalUser
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({});

	// Sync global user to form data when it loads
	// Helper to safely access user data
	const displayUser = formData.email ? formData : (globalUser || {});

	// Sync global user to form data when it loads and is not editing
	useEffect(() => {
		if (globalUser && !isEditing) {
			setFormData(globalUser);
		}
	}, [globalUser, isEditing]);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSave = async () => {
		try {
			await authService.updateProfile({
				full_name: formData.full_name,
				phone: formData.phone,
			});

			// Refresh global context to update UI
			await refreshUser();

			setIsEditing(false);
		} catch (err) {
			console.error("Failed to update profile", err);
		}
	};

	const handleCancel = () => {
		// Reset form data to current global user
		if (globalUser) {
			setFormData(globalUser);
		}
		setIsEditing(false);
	};



	return (
		<div className={`dashboard-container ${isDarkMode ? "dark-mode" : ""}`}>
			{/* Header without controls */}
			<Header
				activeTab="PROFILE"
				isDarkMode={isDarkMode}
				toggleTheme={toggleTheme}
				showControls={false}
			/>

			{/* Profile Content */}
			<div className="profile-content-wrapper">
				{/* Navigation & Actions */}
				<div
					className="detail-navigation-bar"
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<button
						className="nav-btn back-btn"
						onClick={() => navigate("/dashboard")}
					>
						<ChevronLeft size={16} /> BACK TO DASHBOARD
					</button>

					<div
						className="profile-actions"
						style={{ display: "flex", gap: "0.5rem" }}
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
									<X size={16} /> Cancel
								</button>
								<button
									className="nav-btn"
									onClick={handleSave}
									style={{
										background: "#f0fdf4",
										color: "#16a34a",
										borderColor: "#86efac",
									}}
								>
									<Save size={16} /> Save Changes
								</button>
							</>
						) : (
							<button
								className="nav-btn"
								onClick={() => setIsEditing(true)}
								style={{
									background: "#eff6ff",
									color: "#3b82f6",
									borderColor: "#bfdbfe",
								}}
							>
								<Edit2 size={16} /> Edit Profile
							</button>
						)}
					</div>
				</div>

				<div className="profile-grid">
					{/* Left Column: ID Card style */}
					<div className="profile-sidebar-card">
						<div className="profile-header-visual"></div>
						<div className="profile-avatar-container">
							<img
								src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.full_name || "User")}&background=3b82f6&color=fff&size=128`}
								alt="Profile"
								className="profile-avatar-large"
							/>
							<button className="edit-avatar-btn">
								<Camera size={16} color="white" />
							</button>
						</div>

						<div className="profile-identity">
							<h2 className="profile-name">
								{displayUser.full_name || "No Name"}
							</h2>
							<span className="profile-role">{displayUser.role || "User"}</span>
							<div className="profile-badge">
								<span className="status-dot"></span> Active
							</div>
						</div>

						<button
							className="logout-btn-full"
							onClick={() => authService.logout()}
						>
							<LogOut size={18} /> Sign Out
						</button>
					</div>

					{/* Right Column: Personal Information */}
					<div className="profile-details-section">
						<div className="profile-section-card">
							<h3 className="section-title">Personal Information</h3>
							<div className="info-grid-2">
								{/* Full Name */}
								<div className="info-group">
									<label>Full Name</label>
									<div className="info-display">
										<User size={16} className="text-muted" />
										{isEditing ? (
											<input
												type="text"
												name="full_name"
												value={formData.full_name || ""}
												onChange={handleInputChange}
												className="profile-input"
												placeholder="Enter full name"
											/>
										) : (
											<span>{displayUser.full_name || "-"}</span>
										)}
									</div>
								</div>

								{/* Phone */}
								<div className="info-group">
									<label>Phone Number</label>
									<div className="info-display">
										<Phone size={16} className="text-muted" />
										{isEditing ? (
											<input
												type="text"
												name="phone"
												value={formData.phone || ""}
												onChange={handleInputChange}
												className="profile-input"
												placeholder="e.g. 0812..."
											/>
										) : (
											<span>{displayUser.phone || "-"}</span>
										)}
									</div>
								</div>

								{/* Email */}
								<div className="info-group">
									<label>Email Address</label>
									<div className="info-display">
										<Mail size={16} className="text-muted" />
										<span>{displayUser.email || "-"}</span>
									</div>
								</div>

								{/* Role (Read Only) */}
								<div className="info-group">
									<label>Role</label>
									<div className="info-display">
										<Shield size={16} className="text-muted" />
										<span>{displayUser.role || "-"}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProfilePage;
