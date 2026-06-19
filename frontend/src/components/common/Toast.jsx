import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import React, { useEffect } from "react";

const Toast = ({
	key_id,
	message,
	type = "info",
	onClose,
	duration = 5000,
}) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose(key_id);
		}, duration);
		return () => clearTimeout(timer);
	}, [duration, onClose, key_id]);

	const getIcon = () => {
		switch (type) {
			case "success":
				return <CheckCircle size={20} />;
			case "warning":
				return <AlertTriangle size={20} />;
			case "error":
				return <AlertCircle size={20} />;
			default:
				return <Info size={20} />;
		}
	};

	const getColors = () => {
		switch (type) {
			case "success":
				return { bg: "#dcfce7", border: "#86efac", text: "#15803d" };
			case "warning":
				return { bg: "#fef9c3", border: "#fde047", text: "#a16207" };
			case "error":
				return { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" };
			default:
				return { bg: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" };
		}
	};

	const colors = getColors();

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "12px",
				background: colors.bg,
				border: `1px solid ${colors.border}`,
				color: colors.text,
				padding: "12px 16px",
				borderRadius: "8px",
				boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
				minWidth: "300px",
				animation: "slideIn 0.3s ease-out",
				marginBottom: "10px",
			}}
		>
			<div>{getIcon()}</div>
			<div style={{ flex: 1, fontSize: "0.9rem", fontWeight: "500" }}>
				{message}
			</div>
			<button
				onClick={() => onClose(key_id)}
				style={{
					background: "none",
					border: "none",
					cursor: "pointer",
					color: "currentColor",
					opacity: 0.7,
				}}
			>
				<X size={18} />
			</button>
			<style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
		</div>
	);
};

export const ToastContainer = ({ toasts, removeToast }) => {
	return (
		<div
			style={{
				position: "fixed",
				top: "20px",
				right: "20px",
				zIndex: 9999,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{toasts.map((toast) => (
				<Toast
					key={toast.id}
					key_id={toast.id}
					{...toast}
					onClose={removeToast}
				/>
			))}
		</div>
	);
};

export default Toast;
