/**
 * services/__tests__/services.test.js
 *
 * Unit test untuk service layer asli:
 *   - authService (login, signup, logout, getToken, isAuthenticated, getProfile)
 *   - notificationService (getAll, getUnread, create, markAsRead)
 *   - potService (getPots, getPotlines)
 *
 * Semua HTTP request di-mock menggunakan vi.mock('axios') sehingga tidak
 * butuh server backend yang berjalan.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock axios sebelum import apapun ───────────────────────────────────────
vi.mock("axios", () => {
	const mockAxios = {
		create: vi.fn(() => mockAxios),
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: {
			request: { use: vi.fn(), handlers: [] },
			response: { use: vi.fn(), handlers: [] },
		},
		defaults: { headers: { common: {} } },
	};
	return { default: mockAxios };
});

import api from "../api";
// ─── Import service SETELAH mock ─────────────────────────────────────────────
import { authService } from "../authService";
import { notificationService } from "../notificationService";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────────────────

describe("authService", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		// Reset window.location
		delete window.location;
		window.location = { href: "" };
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── login ──────────────────────────────────────────────────────────────────

	describe("login", () => {
		it("stores access_token in localStorage on success", async () => {
			api.post.mockResolvedValueOnce({
				data: { access_token: "jwt-token-123", token_type: "bearer" },
			});
			await authService.login({ email: "user@test.com", password: "pass123" });
			expect(localStorage.getItem("authToken")).toBe("jwt-token-123");
		});

		it("returns response data on success", async () => {
			api.post.mockResolvedValueOnce({
				data: { access_token: "jwt-token-abc", token_type: "bearer" },
			});
			const result = await authService.login({
				email: "user@test.com",
				password: "pass123",
			});
			expect(result.access_token).toBe("jwt-token-abc");
			expect(result.token_type).toBe("bearer");
		});

		it("sends FormData to /auth/login", async () => {
			api.post.mockResolvedValueOnce({
				data: { access_token: "token", token_type: "bearer" },
			});
			await authService.login({ email: "user@test.com", password: "pass" });
			const [url, body] = api.post.mock.calls[0];
			expect(url).toBe("/auth/login");
			expect(body).toBeInstanceOf(FormData);
		});

		it("throws error on failed login", async () => {
			api.post.mockRejectedValueOnce(new Error("Unauthorized"));
			await expect(
				authService.login({ email: "bad@test.com", password: "wrong" }),
			).rejects.toThrow("Unauthorized");
		});

		it("does not store token if response has no access_token", async () => {
			api.post.mockResolvedValueOnce({ data: {} });
			await authService.login({ email: "user@test.com", password: "pass" });
			expect(localStorage.getItem("authToken")).toBeNull();
		});
	});

	// ── signup ─────────────────────────────────────────────────────────────────

	describe("signup", () => {
		it("calls /auth/signup with user data", async () => {
			const userData = {
				email: "new@test.com",
				password: "pass",
				full_name: "New User",
			};
			api.post.mockResolvedValueOnce({ data: { id: 1, ...userData } });
			const result = await authService.signup(userData);
			expect(api.post).toHaveBeenCalledWith("/auth/signup", userData);
			expect(result.email).toBe("new@test.com");
		});

		it("throws error on signup failure", async () => {
			api.post.mockRejectedValueOnce(new Error("Email already registered"));
			await expect(
				authService.signup({
					email: "dup@test.com",
					password: "pass",
					full_name: "Dup",
				}),
			).rejects.toThrow();
		});
	});

	// ── logout ─────────────────────────────────────────────────────────────────

	describe("logout", () => {
		it("removes authToken from localStorage", () => {
			localStorage.setItem("authToken", "existing-token");
			authService.logout();
			expect(localStorage.getItem("authToken")).toBeNull();
		});

		it("redirects to /login", () => {
			authService.logout();
			expect(window.location.href).toBe("/login");
		});
	});

	// ── getToken ───────────────────────────────────────────────────────────────

	describe("getToken", () => {
		it("returns null when no token stored", () => {
			expect(authService.getToken()).toBeNull();
		});

		it("returns token when stored", () => {
			localStorage.setItem("authToken", "my-jwt-token");
			expect(authService.getToken()).toBe("my-jwt-token");
		});
	});

	// ── isAuthenticated ────────────────────────────────────────────────────────

	describe("isAuthenticated", () => {
		it("returns false when no token", () => {
			expect(authService.isAuthenticated()).toBe(false);
		});

		it("returns true when token exists", () => {
			localStorage.setItem("authToken", "some-token");
			expect(authService.isAuthenticated()).toBe(true);
		});
	});

	// ── getProfile ─────────────────────────────────────────────────────────────

	describe("getProfile", () => {
		it("calls /auth/me endpoint", async () => {
			const profile = {
				id: 1,
				email: "user@test.com",
				full_name: "User",
				role: "user",
			};
			api.get.mockResolvedValueOnce({ data: profile });
			const result = await authService.getProfile();
			expect(api.get).toHaveBeenCalledWith(expect.stringContaining("/auth/me"));
			expect(result.email).toBe("user@test.com");
		});

		it("throws error on failed profile fetch", async () => {
			api.get.mockRejectedValueOnce(new Error("Unauthorized"));
			await expect(authService.getProfile()).rejects.toThrow();
		});
	});

	// ── updateProfile ──────────────────────────────────────────────────────────

	describe("updateProfile", () => {
		it("calls /auth/me with PUT", async () => {
			const updateData = { full_name: "Updated Name" };
			api.put.mockResolvedValueOnce({ data: { id: 1, ...updateData } });
			const result = await authService.updateProfile(updateData);
			expect(api.put).toHaveBeenCalledWith("/auth/me", updateData);
			expect(result.full_name).toBe("Updated Name");
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Notification Service
// ─────────────────────────────────────────────────────────────────────────────

describe("notificationService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAll", () => {
		it("returns notifications array on success", async () => {
			const notifications = [
				{ id: 1, title: "Alert 1", is_read: false },
				{ id: 2, title: "Alert 2", is_read: true },
			];
			api.get.mockResolvedValueOnce({ data: notifications });
			const result = await notificationService.getAll();
			expect(result).toHaveLength(2);
			expect(result[0].title).toBe("Alert 1");
		});

		it("returns empty array on error", async () => {
			api.get.mockRejectedValueOnce(new Error("Network Error"));
			const result = await notificationService.getAll();
			expect(result).toEqual([]);
		});

		it("calls /notifications/ endpoint", async () => {
			api.get.mockResolvedValueOnce({ data: [] });
			await notificationService.getAll();
			expect(api.get).toHaveBeenCalledWith("/notifications/");
		});
	});

	describe("getUnread", () => {
		it("returns unread notifications", async () => {
			const unread = [{ id: 1, is_read: false }];
			api.get.mockResolvedValueOnce({ data: unread });
			const result = await notificationService.getUnread();
			expect(result).toHaveLength(1);
			expect(result[0].is_read).toBe(false);
		});

		it("calls /notifications/?unread_only=true", async () => {
			api.get.mockResolvedValueOnce({ data: [] });
			await notificationService.getUnread();
			expect(api.get).toHaveBeenCalledWith("/notifications/?unread_only=true");
		});

		it("returns empty array on error", async () => {
			api.get.mockRejectedValueOnce(new Error("Network Error"));
			const result = await notificationService.getUnread();
			expect(result).toEqual([]);
		});
	});

	describe("create", () => {
		it("creates notification and returns data", async () => {
			const created = {
				id: 42,
				type: "alert",
				title: "New Alert",
				message: "Msg",
				is_read: false,
			};
			api.post.mockResolvedValueOnce({ data: created });
			const result = await notificationService.create(
				"alert",
				"New Alert",
				"Msg",
			);
			expect(result.id).toBe(42);
			expect(result.is_read).toBe(false);
		});

		it("calls /notifications/ with correct data", async () => {
			api.post.mockResolvedValueOnce({ data: {} });
			await notificationService.create("warning", "Warn", "Warning msg");
			expect(api.post).toHaveBeenCalledWith("/notifications/", {
				type: "warning",
				title: "Warn",
				message: "Warning msg",
			});
		});

		it("returns null on error", async () => {
			api.post.mockRejectedValueOnce(new Error("Network Error"));
			const result = await notificationService.create("alert", "T", "M");
			expect(result).toBeNull();
		});
	});

	describe("markAsRead", () => {
		it("returns true on success", async () => {
			api.put.mockResolvedValueOnce({ data: { status: "success" } });
			const result = await notificationService.markAsRead(1);
			expect(result).toBe(true);
		});

		it("calls /notifications/{id}/read/", async () => {
			api.put.mockResolvedValueOnce({ data: {} });
			await notificationService.markAsRead(42);
			expect(api.put).toHaveBeenCalledWith("/notifications/42/read/");
		});

		it("returns false on error", async () => {
			api.put.mockRejectedValueOnce(new Error("Network Error"));
			const result = await notificationService.markAsRead(99);
			expect(result).toBe(false);
		});
	});
});
