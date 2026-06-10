/**
 * services/__tests__/api.test.js
 *
 * Unit test untuk axios instance dan interceptors di api.js.
 * Menguji behavior interceptor request/response secara langsung.
 */

import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import api from "../api";

describe("API Instance", () => {
	it("is an axios instance", () => {
		expect(api).toBeDefined();
		expect(api.interceptors).toBeDefined();
		expect(api.interceptors.request).toBeDefined();
		expect(api.interceptors.response).toBeDefined();
	});
});

describe("API Request Interceptor", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	function getRequestInterceptor() {
		const handlers = api.interceptors.request.handlers;
		return handlers.find((h) => typeof h.fulfilled === "function")?.fulfilled;
	}

	test("adds Authorization header when authToken exists in localStorage", () => {
		localStorage.setItem("authToken", "abc123");
		const fulfilled = getRequestInterceptor();
		const config = { headers: {} };
		const result = fulfilled(config);
		expect(result.headers.Authorization).toBe("Bearer abc123");
	});

	test("does not add Authorization header when no token in localStorage", () => {
		const fulfilled = getRequestInterceptor();
		const config = { headers: {} };
		const result = fulfilled(config);
		expect(result.headers.Authorization).toBeUndefined();
	});

	test("returns the config object with headers intact", () => {
		localStorage.setItem("authToken", "my-token");
		const fulfilled = getRequestInterceptor();
		const config = { headers: { "Content-Type": "application/json" } };
		const result = fulfilled(config);
		expect(result.headers["Content-Type"]).toBe("application/json");
		expect(result.headers.Authorization).toBe("Bearer my-token");
	});

	test("request error handler rejects with error", async () => {
		const handlers = api.interceptors.request.handlers;
		const rejected = handlers.find(
			(h) => typeof h.rejected === "function",
		)?.rejected;
		if (rejected) {
			const error = new Error("Request failed");
			await expect(rejected(error)).rejects.toThrow("Request failed");
		}
	});
});

describe("API Response Interceptor", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
		delete window.location;
		window.location = { href: "" };
	});

	function getResponseInterceptor() {
		const handlers = api.interceptors.response.handlers;
		return handlers.find((h) => typeof h.rejected === "function")?.rejected;
	}

	test("removes authToken from localStorage on 401 response", async () => {
		localStorage.setItem("authToken", "abc123");
		const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

		const rejected = getResponseInterceptor();
		const error = { response: { status: 401 } };

		await expect(rejected(error)).rejects.toEqual(error);
		expect(removeSpy).toHaveBeenCalledWith("authToken");
	});

	test("redirects to /login on 401 response", async () => {
		localStorage.setItem("authToken", "abc123");
		const rejected = getResponseInterceptor();
		const error = { response: { status: 401 } };

		try {
			await rejected(error);
		} catch (_) {}

		expect(window.location.href).toBe("/login");
	});

	test("does not remove token on 500 response", async () => {
		localStorage.setItem("authToken", "abc123");
		const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

		const rejected = getResponseInterceptor();
		const error = { response: { status: 500 } };

		await expect(rejected(error)).rejects.toEqual(error);
		expect(removeSpy).not.toHaveBeenCalled();
	});

	test("does not remove token on 403 response", async () => {
		localStorage.setItem("authToken", "abc123");
		const removeSpy = vi.spyOn(Storage.prototype, "removeItem");

		const rejected = getResponseInterceptor();
		const error = { response: { status: 403 } };

		await expect(rejected(error)).rejects.toEqual(error);
		expect(removeSpy).not.toHaveBeenCalled();
	});

	test("handles error without response (network error)", async () => {
		const rejected = getResponseInterceptor();
		const networkError = new Error("Network Error");
		// Tidak ada response property

		await expect(rejected(networkError)).rejects.toEqual(networkError);
	});

	test("success interceptor passes response through", () => {
		const handlers = api.interceptors.response.handlers;
		const fulfilled = handlers.find(
			(h) => typeof h.fulfilled === "function",
		)?.fulfilled;
		if (fulfilled) {
			const response = { status: 200, data: { ok: true } };
			const result = fulfilled(response);
			expect(result).toEqual(response);
		}
	});
});
