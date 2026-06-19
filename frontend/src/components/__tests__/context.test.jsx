/**
 * components/__tests__/context.test.jsx
 *
 * Unit tests untuk React Context providers:
 *   - UserContext (UserProvider, useUser)
 *   - SettingsContext (SettingsProvider, useSettings)
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock services ────────────────────────────────────────────────────────────

vi.mock("../../services/authService", () => ({
	authService: {
		getToken: vi.fn(() => null),
		getProfile: vi.fn(() => Promise.resolve(null)),
		login: vi.fn(),
		logout: vi.fn(),
		isAuthenticated: vi.fn(() => false),
	},
}));

// SettingsContext menggunakan api dari services
vi.mock("../../services/api", () => ({
	default: {
		get: vi.fn(() => Promise.resolve({ data: { standards: [] } })),
		put: vi.fn(() => Promise.resolve({ data: [] })),
	},
}));

import api from "../../services/api";
import { SettingsProvider, useSettings } from "../../context/SettingsContext";
// ─── Import setelah mock ──────────────────────────────────────────────────────
import { UserProvider, useUser } from "../../context/UserContext";
import { authService } from "../../services/authService";

// ─────────────────────────────────────────────────────────────────────────────
// UserContext Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("UserContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	const UserConsumer = () => {
		const { user, loading } = useUser();
		if (loading) return <div>Loading...</div>;
		if (!user) return <div>No User</div>;
		return <div>User: {user.email}</div>;
	};

	it("shows loading initially when token exists", async () => {
		localStorage.setItem("authToken", "fake-token");
		authService.getToken.mockReturnValue("fake-token");
		authService.getProfile.mockImplementation(
			() =>
				new Promise((res) =>
					setTimeout(() => res({ email: "user@test.com", role: "user" }), 100),
				),
		);
		render(
			<UserProvider>
				<UserConsumer />
			</UserProvider>,
		);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("shows No User when no token exists", async () => {
		authService.getToken.mockReturnValue(null);
		await act(async () => {
			render(
				<UserProvider>
					<UserConsumer />
				</UserProvider>,
			);
		});
		expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
		expect(screen.getByText("No User")).toBeInTheDocument();
	});

	it("shows user email after successful profile fetch", async () => {
		localStorage.setItem("authToken", "valid-token");
		authService.getToken.mockReturnValue("valid-token");
		authService.getProfile.mockResolvedValueOnce({
			email: "fetched@test.com",
			full_name: "Fetched User",
			role: "user",
		});
		await act(async () => {
			render(
				<UserProvider>
					<UserConsumer />
				</UserProvider>,
			);
		});
		await waitFor(() => {
			expect(screen.getByText("User: fetched@test.com")).toBeInTheDocument();
		});
	});

	it("shows No User after profile fetch fails with invalid token", async () => {
		const invalidToken = "invalid.token.format";
		authService.getToken.mockReturnValue(invalidToken);
		localStorage.setItem("authToken", invalidToken);
		authService.getProfile.mockRejectedValueOnce(new Error("Unauthorized"));

		await act(async () => {
			render(
				<UserProvider>
					<UserConsumer />
				</UserProvider>,
			);
		});
		await waitFor(() => {
			expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
		});
	});

	it("throws error when useUser is used outside UserProvider", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const BrokenComponent = () => {
			useUser();
			return null;
		};
		expect(() => render(<BrokenComponent />)).toThrow(
			"useUser must be used within a UserProvider",
		);
		consoleSpy.mockRestore();
	});

	it("provides login and logout functions via context", async () => {
		authService.getToken.mockReturnValue(null);
		const FunctionConsumer = () => {
			const { login, logout } = useUser();
			return (
				<div>
					<span data-testid="has-login">
						{typeof login === "function" ? "yes" : "no"}
					</span>
					<span data-testid="has-logout">
						{typeof logout === "function" ? "yes" : "no"}
					</span>
				</div>
			);
		};
		await act(async () => {
			render(
				<UserProvider>
					<FunctionConsumer />
				</UserProvider>,
			);
		});
		expect(screen.getByTestId("has-login").textContent).toBe("yes");
		expect(screen.getByTestId("has-logout").textContent).toBe("yes");
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SettingsContext Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("SettingsContext", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		api.get.mockResolvedValue({ data: { standards: [] } });
	});

	it("renders children without crashing", async () => {
		await act(async () => {
			render(
				<SettingsProvider>
					<div>Settings Child</div>
				</SettingsProvider>,
			);
		});
		expect(screen.getByText("Settings Child")).toBeInTheDocument();
	});

	it("calls api on mount to fetch standards", async () => {
		await act(async () => {
			render(
				<SettingsProvider>
					<div>Child</div>
				</SettingsProvider>,
			);
		});
		await waitFor(() => {
			expect(api.get).toHaveBeenCalled();
		});
	});

	it("provides settings and loading state via context", async () => {
		const SettingsConsumer = () => {
			const { settings, loading } = useSettings();
			return (
				<div>
					<span data-testid="loading">{loading ? "loading" : "ready"}</span>
					<span data-testid="settings-type">{typeof settings}</span>
				</div>
			);
		};
		await act(async () => {
			render(
				<SettingsProvider>
					<SettingsConsumer />
				</SettingsProvider>,
			);
		});
		await waitFor(() => {
			expect(screen.getByTestId("loading").textContent).toBe("ready");
		});
		expect(screen.getByTestId("settings-type").textContent).toBe("object");
	});

	it("handles API error gracefully without crashing", async () => {
		api.get.mockRejectedValueOnce(new Error("Network Error"));
		await act(async () => {
			expect(() =>
				render(
					<SettingsProvider>
						<div>Child</div>
					</SettingsProvider>,
				),
			).not.toThrow();
		});
	});

	it("throws error when useSettings used outside SettingsProvider", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const BrokenComponent = () => {
			useSettings();
			return null;
		};
		expect(() => render(<BrokenComponent />)).toThrow(
			"useSettings must be used within a SettingsProvider",
		);
		consoleSpy.mockRestore();
	});
});
