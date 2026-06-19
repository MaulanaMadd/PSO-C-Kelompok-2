import React from "react";

const HistoryTable = ({ title, data, columns, height = "400px" }) => {
	return (
		<div
			className="history-table-container"
			style={{
				background: "var(--bg-card)",
				borderRadius: "12px",
				padding: "16px",
				boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
				border: "1px solid var(--border-subtle)",
				display: "flex",
				flexDirection: "column",
				height: "100%",
				overflow: "hidden",
			}}
		>
			<h3
				style={{
					fontSize: "1.1rem",
					fontWeight: 700,
					marginBottom: "12px",
					color: "var(--text-primary)",
					borderBottom: "2px solid var(--border-subtle)",
					paddingBottom: "8px",
				}}
			>
				{title}
			</h3>

			<div
				className="table-wrapper"
				style={{
					flex: 1,
					overflowY: "auto",
					overflowX: "auto", // Enable horizontal scrolling
					position: "relative",
					maxHeight: height,
				}}
			>
				<table
					style={{
						width: "100%",
						borderCollapse: "collapse",
						fontSize: "0.85rem",
					}}
				>
					<thead
						style={{
							position: "sticky",
							top: 0,
							background: "var(--bg-card)",
							zIndex: 10,
							boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
						}}
					>
						<tr>
							<th
								style={{
									padding: "10px",
									textAlign: "left",
									color: "var(--text-secondary)",
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
							>
								Date
							</th>
							{columns.map((col, idx) => (
								<th
									key={idx}
									style={{
										padding: "10px",
										textAlign: "right",
										color: "var(--text-secondary)",
										fontWeight: 600,
										whiteSpace: "nowrap",
									}}
								>
									{col.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data && data.length > 0 ? (
							data
								.slice()
								.reverse()
								.map((row, rIdx) => (
									<tr
										key={rIdx}
										style={{
											borderBottom: "1px solid var(--border-subtle)",
											background:
												rIdx % 2 === 0 ? "transparent" : "var(--bg-subtle)",
										}}
									>
										<td
											style={{
												padding: "10px",
												color: "var(--text-primary)",
												fontWeight: 500,
												whiteSpace: "nowrap",
											}}
										>
											{new Date(row.ts_5m || row.date).toLocaleDateString(
												"en-GB",
												{ day: "numeric", month: "short" },
											)}
										</td>
										{columns.map((col, cIdx) => (
											<td
												key={cIdx}
												style={{
													padding: "10px",
													textAlign: "right",
													color: "var(--text-primary)",
													fontFamily: "monospace",
												}}
											>
												{row[col.key] !== null && row[col.key] !== undefined
													? typeof row[col.key] === "number"
														? row[col.key].toFixed(col.decimals || 0)
														: row[col.key]
													: "-"}
											</td>
										))}
									</tr>
								))
						) : (
							<tr>
								<td
									colSpan={columns.length + 1}
									style={{
										padding: "20px",
										textAlign: "center",
										color: "var(--text-secondary)",
									}}
								>
									No data available
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default HistoryTable;
