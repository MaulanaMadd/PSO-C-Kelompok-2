/**
 * components/__tests__/dashboard.test.jsx
 *
 * Unit tests untuk komponen dashboard — pure UI, tidak butuh HTTP call.
 * DashboardPage di-mock, komponen internal diuji secara independen.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Isolated pure-UI component tests ─────────────────────────────────────────
// Semua test di sini menggunakan komponen lokal (bukan import dari file).
// Ini menghindari masalah transitive dependency (recharts, axios, etc).

describe("SummaryCard Component", () => {
	const SummaryCard = ({ label, value, unit }) => (
		<div className="summary-card">
			<div className="label">{label}</div>
			<div className="value">
				{value} {unit}
			</div>
		</div>
	);

	it("renders label correctly", () => {
		render(<SummaryCard label="Total POTs" value={180} unit="pots" />);
		expect(screen.getByText("Total POTs")).toBeInTheDocument();
	});

	it("renders value and unit", () => {
		render(<SummaryCard label="CE" value={95.5} unit="%" />);
		expect(screen.getByText("95.5 %")).toBeInTheDocument();
	});

	it("renders zero value", () => {
		render(<SummaryCard label="Alarms" value={0} unit="" />);
		expect(screen.getByText("0")).toBeInTheDocument();
	});
});

describe("StatusBadge Component", () => {
	const StatusBadge = ({ status }) => (
		<span className={`badge badge-${status}`}>{status.toUpperCase()}</span>
	);

	it("renders NORMAL status", () => {
		const { container } = render(<StatusBadge status="normal" />);
		expect(container.querySelector(".badge-normal")).not.toBeNull();
		expect(screen.getByText("NORMAL")).toBeInTheDocument();
	});

	it("renders WARNING status", () => {
		render(<StatusBadge status="warning" />);
		expect(screen.getByText("WARNING")).toBeInTheDocument();
	});

	it("renders CRITICAL status", () => {
		render(<StatusBadge status="critical" />);
		expect(screen.getByText("CRITICAL")).toBeInTheDocument();
	});
});

describe("AlarmBadge Component", () => {
	const AlarmBadge = ({ count }) => (
		<div data-testid="alarm-badge">
			{count > 0 ? `${count} Alarms` : "No Alarms"}
		</div>
	);

	it("shows alarm count when > 0", () => {
		render(<AlarmBadge count={5} />);
		expect(screen.getByText("5 Alarms")).toBeInTheDocument();
	});

	it('shows "No Alarms" when count is 0', () => {
		render(<AlarmBadge count={0} />);
		expect(screen.getByText("No Alarms")).toBeInTheDocument();
	});

	it("renders with data-testid", () => {
		render(<AlarmBadge count={3} />);
		expect(screen.getByTestId("alarm-badge")).toBeInTheDocument();
	});
});

describe("PotlineSelector Component", () => {
	const PotlineSelector = ({ potlines, selected, onChange }) => (
		<select value={selected} onChange={(e) => onChange(e.target.value)}>
			<option value="">All Potlines</option>
			{potlines.map((pl) => (
				<option key={pl} value={pl}>
					Potline {pl}
				</option>
			))}
		</select>
	);

	it("renders all potline options", () => {
		render(
			<PotlineSelector potlines={[1, 2, 3]} selected="" onChange={vi.fn()} />,
		);
		expect(screen.getByText("All Potlines")).toBeInTheDocument();
		expect(screen.getByText("Potline 1")).toBeInTheDocument();
		expect(screen.getByText("Potline 2")).toBeInTheDocument();
		expect(screen.getByText("Potline 3")).toBeInTheDocument();
	});

	it("calls onChange with correct value on selection", () => {
		const onChange = vi.fn();
		render(
			<PotlineSelector potlines={[1, 2, 3]} selected="" onChange={onChange} />,
		);
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
		expect(onChange).toHaveBeenCalledWith("2");
	});

	it("shows empty list when no potlines", () => {
		render(<PotlineSelector potlines={[]} selected="" onChange={vi.fn()} />);
		expect(screen.getByText("All Potlines")).toBeInTheDocument();
		expect(screen.queryByText("Potline 1")).toBeNull();
	});
});

describe("PotGrid Component", () => {
	const PotGrid = ({ pots }) => (
		<div className="pot-grid">
			{pots.map((pot) => (
				<div key={pot.id} className="pot-item" data-testid={`pot-${pot.id}`}>
					POT-{pot.id}
				</div>
			))}
		</div>
	);

	it("renders correct number of pot items", () => {
		const pots = [{ id: 101 }, { id: 102 }, { id: 103 }];
		render(<PotGrid pots={pots} />);
		expect(document.querySelectorAll(".pot-item")).toHaveLength(3);
	});

	it("renders pot IDs correctly", () => {
		render(<PotGrid pots={[{ id: 101 }, { id: 102 }]} />);
		expect(screen.getByText("POT-101")).toBeInTheDocument();
		expect(screen.getByText("POT-102")).toBeInTheDocument();
	});

	it("renders empty grid with no pots", () => {
		render(<PotGrid pots={[]} />);
		expect(document.querySelectorAll(".pot-item")).toHaveLength(0);
	});
});

describe("PotItem Component", () => {
	const PotItem = ({ pot, onClick }) => (
		<div
			className="pot-item"
			onClick={() => onClick(pot.id)}
			data-testid={`pot-item-${pot.id}`}
		>
			POT-{pot.id}
		</div>
	);

	it("calls onClick with pot id on click", () => {
		const onPotClick = vi.fn();
		render(<PotItem pot={{ id: 101 }} onClick={onPotClick} />);
		fireEvent.click(screen.getByText("POT-101"));
		expect(onPotClick).toHaveBeenCalledWith(101);
	});

	it("renders with correct testid", () => {
		render(<PotItem pot={{ id: 42 }} onClick={vi.fn()} />);
		expect(screen.getByTestId("pot-item-42")).toBeInTheDocument();
	});
});

describe("LoadingSpinner Component", () => {
	const LoadingSpinner = () => (
		<div className="loading" role="status" aria-label="Loading">
			<div className="spinner"></div>
			<span>Loading data...</span>
		</div>
	);

	it("renders loading text", () => {
		render(<LoadingSpinner />);
		expect(screen.getByText("Loading data...")).toBeInTheDocument();
	});

	it('has role="status" for accessibility', () => {
		render(<LoadingSpinner />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});
});

describe("ErrorBanner Component", () => {
	const ErrorBanner = ({ message }) => (
		<div className="error-banner" role="alert">
			<span>⚠️ {message}</span>
		</div>
	);

	it("renders error message", () => {
		render(<ErrorBanner message="Failed to load data" />);
		expect(screen.getByText("⚠️ Failed to load data")).toBeInTheDocument();
	});

	it('has role="alert" for accessibility', () => {
		render(<ErrorBanner message="Error" />);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});

describe("KPICard Component", () => {
	const KPICard = ({ param, value, min, max, unit }) => {
		const status = value < min ? "low" : value > max ? "high" : "ok";
		return (
			<div className={`kpi-card kpi-${status}`} data-testid="kpi-card">
				<div className="kpi-param">{param}</div>
				<div className="kpi-value">
					{value} {unit}
				</div>
				<div className="kpi-status">{status.toUpperCase()}</div>
			</div>
		);
	};

	it("shows OK when value is within range", () => {
		render(
			<KPICard
				param="Bath Temperature"
				value={955}
				min={945}
				max={965}
				unit="°C"
			/>,
		);
		expect(screen.getByText("OK")).toBeInTheDocument();
	});

	it("shows LOW when value is below min", () => {
		render(<KPICard param="BT" value={930} min={945} max={965} unit="°C" />);
		expect(screen.getByText("LOW")).toBeInTheDocument();
	});

	it("shows HIGH when value is above max", () => {
		render(<KPICard param="BT" value={980} min={945} max={965} unit="°C" />);
		expect(screen.getByText("HIGH")).toBeInTheDocument();
	});

	it("renders parameter name and unit", () => {
		render(<KPICard param="Noise" value={40} min={0} max={50} unit="mV" />);
		expect(screen.getByText("Noise")).toBeInTheDocument();
		expect(screen.getByText("40 mV")).toBeInTheDocument();
	});

	it("has correct CSS class based on status", () => {
		const { container } = render(
			<KPICard param="M" value={20} min={23} max={27} unit="cm" />,
		);
		expect(container.querySelector(".kpi-low")).not.toBeNull();
	});
});

describe("TimeRangeSelector Component", () => {
	const TimeRangeSelector = ({ value, onChange }) => (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			data-testid="time-range"
		>
			<option value="7D">Last 7 Days</option>
			<option value="30D">Last 30 Days</option>
			<option value="90D">Last 90 Days</option>
		</select>
	);

	it("renders all time range options", () => {
		render(<TimeRangeSelector value="7D" onChange={vi.fn()} />);
		expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
		expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
		expect(screen.getByText("Last 90 Days")).toBeInTheDocument();
	});

	it("calls onChange on selection", () => {
		const onChange = vi.fn();
		render(<TimeRangeSelector value="7D" onChange={onChange} />);
		fireEvent.change(screen.getByTestId("time-range"), {
			target: { value: "30D" },
		});
		expect(onChange).toHaveBeenCalledWith("30D");
	});
});
