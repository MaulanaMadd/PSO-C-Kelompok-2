/**
 * components/__tests__/common.test.jsx
 *
 * Unit test untuk common components yang sebenarnya:
 *   - Toast (dari components/common/Toast.jsx)
 *   - ToastContainer
 *   - ProtectedRoute (dari components/common/ProtectedRoute.jsx)
 *   - NotificationMonitor (dari components/common/NotificationMonitor.jsx)
 */

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import React from "react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock services sebelum import komponen ───────────────────────────────────
vi.mock("../../services/authService", () => ({
	authService: {
		isAuthenticated: vi.fn(() => false),
		getToken: vi.fn(() => null),
		getProfile: vi.fn(() => Promise.resolve(null)),
	},
}));

vi.mock("../../services/notificationService", () => ({
	notificationService: {
		getUnread: vi.fn(() => Promise.resolve([])),
		markAsRead: vi.fn(() => Promise.resolve(true)),
	},
}));

vi.mock("../../services/api", () => ({
	default: {
		get: vi.fn(() => Promise.resolve({ data: [] })),
	},
}));

import { authService } from "../../services/authService";
import NotificationMonitor from "../common/NotificationMonitor";
import ProtectedRoute from "../common/ProtectedRoute";
// ─── Import komponen SETELAH mock ─────────────────────────────────────────────
import Toast, { ToastContainer } from "../common/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────────────────────

describe("Toast Component", () => {
	let onCloseMock;

	beforeEach(() => {
		onCloseMock = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("renders with success message", () => {
		render(
			<Toast
				key_id="1"
				message="Berhasil disimpan!"
				type="success"
				onClose={onCloseMock}
			/>,
		);
		expect(screen.getByText("Berhasil disimpan!")).toBeInTheDocument();
	});

	it("renders with error message", () => {
		render(
			<Toast
				key_id="2"
				message="Terjadi kesalahan!"
				type="error"
				onClose={onCloseMock}
			/>,
		);
		expect(screen.getByText("Terjadi kesalahan!")).toBeInTheDocument();
	});

	it("renders with warning message", () => {
		render(
			<Toast
				key_id="3"
				message="Perhatian!"
				type="warning"
				onClose={onCloseMock}
			/>,
		);
		expect(screen.getByText("Perhatian!")).toBeInTheDocument();
	});

	it("renders with info message (default)", () => {
		render(
			<Toast
				key_id="4"
				message="Info baru"
				type="info"
				onClose={onCloseMock}
			/>,
		);
		expect(screen.getByText("Info baru")).toBeInTheDocument();
	});

	it("calls onClose with key_id when close button is clicked", () => {
		render(
			<Toast
				key_id="toast-1"
				message="Test"
				type="success"
				onClose={onCloseMock}
			/>,
		);
		// Close button menggunakan X icon dari lucide-react
		const button = document.querySelector("button");
		expect(button).not.toBeNull();
		fireEvent.click(button);
		expect(onCloseMock).toHaveBeenCalledWith("toast-1");
	});

	it("auto-closes after duration via useEffect timer", async () => {
		render(
			<Toast
				key_id="auto-1"
				message="Auto close"
				type="success"
				onClose={onCloseMock}
				duration={2000}
			/>,
		);
		// Advance timer to trigger setTimeout
		act(() => {
			vi.advanceTimersByTime(2001);
		});
		expect(onCloseMock).toHaveBeenCalledWith("auto-1");
	});

	it("uses default duration of 5000ms", async () => {
		render(
			<Toast
				key_id="default-dur"
				message="Test"
				type="success"
				onClose={onCloseMock}
			/>,
		);
		// Should NOT call before 5000ms
		act(() => {
			vi.advanceTimersByTime(4999);
		});
		expect(onCloseMock).not.toHaveBeenCalled();
		// Should call at/after 5000ms
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onCloseMock).toHaveBeenCalledWith("default-dur");
	});

	it("renders a div wrapper", () => {
		const { container } = render(
			<Toast key_id="5" message="Test" type="success" onClose={onCloseMock} />,
		);
		expect(container.firstChild).not.toBeNull();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// ToastContainer Component
// ─────────────────────────────────────────────────────────────────────────────

describe("ToastContainer Component", () => {
	it("renders empty container when no toasts", () => {
		const { container } = render(
			<ToastContainer toasts={[]} removeToast={vi.fn()} />,
		);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders multiple toasts", () => {
		vi.useFakeTimers();
		const toasts = [
			{ id: "1", message: "Toast 1", type: "success" },
			{ id: "2", message: "Toast 2", type: "error" },
		];
		render(<ToastContainer toasts={toasts} removeToast={vi.fn()} />);
		expect(screen.getByText("Toast 1")).toBeInTheDocument();
		expect(screen.getByText("Toast 2")).toBeInTheDocument();
		vi.useRealTimers();
	});

	it("calls removeToast when toast auto-closes", () => {
		vi.useFakeTimers();
		const removeToast = vi.fn();
		const toasts = [{ id: "x1", message: "Test", type: "info" }];
		render(<ToastContainer toasts={toasts} removeToast={removeToast} />);
		act(() => {
			vi.advanceTimersByTime(5001);
		});
		expect(removeToast).toHaveBeenCalledWith("x1");
		vi.useRealTimers();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute Component
// ─────────────────────────────────────────────────────────────────────────────

describe("ProtectedRoute Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("redirects to /login when user is not authenticated", () => {
		authService.isAuthenticated.mockReturnValue(false);

		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Routes>
					<Route path="/login" element={<div>Login Page</div>} />
					<Route element={<ProtectedRoute />}>
						<Route path="/dashboard" element={<div>Protected Content</div>} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByText("Login Page")).toBeInTheDocument();
		expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
	});

	it("renders child content when user is authenticated", () => {
		authService.isAuthenticated.mockReturnValue(true);

		render(
			<MemoryRouter initialEntries={["/dashboard"]}>
				<Routes>
					<Route path="/login" element={<div>Login Page</div>} />
					<Route element={<ProtectedRoute />}>
						<Route path="/dashboard" element={<div>Protected Content</div>} />
					</Route>
				</Routes>
			</MemoryRouter>,
		);

		expect(screen.getByText("Protected Content")).toBeInTheDocument();
		expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// NotificationMonitor Component
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationMonitor Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	it("renders without crashing", () => {
		const { container } = render(
			<BrowserRouter>
				<NotificationMonitor />
			</BrowserRouter>,
		);
		expect(container).toBeTruthy();
	});

	it("mounts and runs without errors", async () => {
		expect(() => {
			render(
				<BrowserRouter>
					<NotificationMonitor />
				</BrowserRouter>,
			);
		}).not.toThrow();
	});
});
