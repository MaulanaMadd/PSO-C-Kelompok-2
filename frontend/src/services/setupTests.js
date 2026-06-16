
Object.defineProperty(window, "location", {
	writable: true,
	value: {
		href: "",
	},
});

globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};
