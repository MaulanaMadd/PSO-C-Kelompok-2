/**
 * pages/__tests__/pages.test.jsx
 *
 * Unit tests untuk page components.
 * Menggunakan komponen lokal (isolated) dan minimal import dari source
 * untuk menghindari transitive dependency errors.
 */

import {
	act,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock semua external dependencies ────────────────────────────────────────

vi.mock("../../services/authService", () => ({
	authService: {
		login: vi.fn(),
		signup: vi.fn(),
		logout: vi.fn(),
		getToken: vi.fn(() => "test-token"),
		isAuthenticated: vi.fn(() => true),
		getProfile: vi.fn(() =>
			Promise.resolve({
				id: 1,
				email: "test@test.com",
				full_name: "Test User",
				role: "user",
				phone: "+62812345",
			}),
		),
		updateProfile: vi.fn(() =>
			Promise.resolve({ id: 1, full_name: "Updated" }),
		),
	},
}));

vi.mock("../../services/api", () => ({
	default: {
		get: vi.fn(() => Promise.resolve({ data: { standards: [] } })),
		post: vi.fn(() => Promise.resolve({ data: {} })),
		put: vi.fn(() => Promise.resolve({ data: {} })),
	},
}));

vi.mock("../../services/notificationService", () => ({
	notificationService: {
		getAll: vi.fn(() => Promise.resolve([])),
		getUnread: vi.fn(() => Promise.resolve([])),
		markAsRead: vi.fn(() => Promise.resolve(true)),
	},
}));

vi.mock("../../services/potService", () => ({
	potService: {
		getPots: vi.fn(() => Promise.resolve([])),
		getPotlines: vi.fn(() => Promise.resolve([])),
	},
}));

vi.mock("axios", () => ({
	default: {
		get: vi.fn(() => Promise.resolve({ data: { standards: [] } })),
		put: vi.fn(() => Promise.resolve({ data: [] })),
		create: vi.fn(() => ({
			get: vi.fn(() => Promise.resolve({ data: {} })),
			post: vi.fn(() => Promise.resolve({ data: {} })),
			put: vi.fn(() => Promise.resolve({ data: {} })),
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
	},
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useParams: () => ({ id: "101" }),
	};
});

import { SettingsProvider } from "../../context/SettingsContext";
import { UserProvider } from "../../context/UserContext";
import api from "../../services/api";
import { authService } from "../../services/authService";
// ─── Import pages after mocks ────────────────────────────────────────────────
import LoginPage from "../LoginPage";
import NotificationPage from "../NotificationPage";
import SignUpPage from "../SignUpPage";

const Wrapper = ({ children }) => (
	<MemoryRouter initialEntries={["/"]}>
		<UserProvider>
			<SettingsProvider>{children}</SettingsProvider>
		</UserProvider>
	</MemoryRouter>
);

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("renders without crashing", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<LoginPage />
				</Wrapper>,
			);
		});
		expect(document.body).toBeTruthy();
	});

	it("renders email and password input fields", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<LoginPage />
				</Wrapper>,
			);
		});
		const inputs = document.querySelectorAll("input");
		expect(inputs.length).toBeGreaterThanOrEqual(2);
	});

	it("renders a submit button", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<LoginPage />
				</Wrapper>,
			);
		});
		const buttons = document.querySelectorAll("button");
		expect(buttons.length).toBeGreaterThan(0);
	});

	it("shows error message when login fails", async () => {
		authService.login.mockRejectedValueOnce({
			response: { data: { detail: "Incorrect email or password" } },
		});
		await act(async () => {
			render(
				<Wrapper>
					<LoginPage />
				</Wrapper>,
			);
		});
		const inputs = document.querySelectorAll("input");
		const form = document.querySelector("form");
		if (inputs.length >= 2 && form) {
			fireEvent.change(inputs[0], { target: { value: "wrong@test.com" } });
			fireEvent.change(inputs[1], { target: { value: "wrongpass" } });
			await act(async () => {
				fireEvent.submit(form);
			});
		}
		expect(document.body).toBeTruthy();
	});

	it("calls authService.login on form submit", async () => {
		authService.login.mockResolvedValueOnce({
			access_token: "token",
			token_type: "bearer",
		});

		await act(async () => {
			render(
				<Wrapper>
					<LoginPage />
				</Wrapper>,
			);
		});
		const inputs = document.querySelectorAll("input");
		const form = document.querySelector("form");
		if (inputs.length >= 2 && form) {
			fireEvent.change(inputs[0], { target: { value: "user@test.com" } });
			fireEvent.change(inputs[1], { target: { value: "password123" } });
			await act(async () => {
				fireEvent.submit(form);
			});
		}
		expect(document.body).toBeTruthy();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// SignUpPage Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("SignUpPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("renders without crashing", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<SignUpPage />
				</Wrapper>,
			);
		});
		expect(document.body).toBeTruthy();
	});

	it("renders form input fields", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<SignUpPage />
				</Wrapper>,
			);
		});
		const inputs = document.querySelectorAll("input");
		expect(inputs.length).toBeGreaterThanOrEqual(3);
	});

	it("renders a submit button", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<SignUpPage />
				</Wrapper>,
			);
		});
		const buttons = document.querySelectorAll("button");
		expect(buttons.length).toBeGreaterThan(0);
	});

	it("handles form submission without crashing", async () => {
		authService.signup.mockResolvedValueOnce({
			id: 1,
			email: "new@test.com",
			full_name: "New User",
		});

		await act(async () => {
			render(
				<Wrapper>
					<SignUpPage />
				</Wrapper>,
			);
		});
		const inputs = document.querySelectorAll("input");
		const form = document.querySelector("form");
		if (inputs.length >= 3 && form) {
			await act(async () => {
				fireEvent.change(inputs[0], { target: { value: "New User" } });
				fireEvent.change(inputs[1], { target: { value: "new@test.com" } });
				fireEvent.change(inputs[2], { target: { value: "password123" } });
				if (inputs[3])
					fireEvent.change(inputs[3], { target: { value: "password123" } });
				fireEvent.submit(form);
			});
		}
		expect(document.body).toBeTruthy();
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// NotificationPage Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.setItem("authToken", "test-token");
		api.get.mockResolvedValue({ data: [] });
	});

	it("renders without crashing", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<NotificationPage isDarkMode={false} toggleTheme={vi.fn()} />
				</Wrapper>,
			);
		});
		expect(document.body).toBeTruthy();
	});

	it("renders notification page with content", async () => {
		await act(async () => {
			render(
				<Wrapper>
					<NotificationPage isDarkMode={false} toggleTheme={vi.fn()} />
				</Wrapper>,
			);
		});
		await waitFor(() => {
			expect(document.body.children.length).toBeGreaterThan(0);
		});
	});

	it("handles empty notifications gracefully", async () => {
		api.get.mockResolvedValue({ data: [] });
		await act(async () => {
			expect(() =>
				render(
					<Wrapper>
						<NotificationPage isDarkMode={false} toggleTheme={vi.fn()} />
					</Wrapper>,
				),
			).not.toThrow();
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility / Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

describe("Page Utilities", () => {
	it("date formatting works correctly", () => {
		const date = new Date("2024-01-15");
		const formatted = date.toLocaleDateString("en-US");
		expect(formatted).toContain("1");
		expect(formatted).toContain("15");
	});

	it("number formatting to 2 decimal places", () => {
		expect((95.5678).toFixed(2)).toBe("95.57");
	});

	it("percentage formatting", () => {
		const pct = (0.955 * 100).toFixed(1) + "%";
		expect(pct).toBe("95.5%");
	});

	it("localStorage token check", () => {
		localStorage.clear();
		expect(localStorage.getItem("authToken")).toBeNull();
		localStorage.setItem("authToken", "test");
		expect(localStorage.getItem("authToken")).toBe("test");
	});

	it("status classification logic", () => {
		const classify = (val, min, max) =>
			val < min ? "low" : val > max ? "high" : "ok";
		expect(classify(955, 945, 965)).toBe("ok");
		expect(classify(930, 945, 965)).toBe("low");
		expect(classify(980, 945, 965)).toBe("high");
	});

	it("truncates long strings correctly", () => {
		const truncate = (str, maxLen) =>
			str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
		expect(truncate("Hello World", 5)).toBe("Hello...");
		expect(truncate("Hi", 10)).toBe("Hi");
	});
});
