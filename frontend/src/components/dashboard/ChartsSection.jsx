import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Sector } from 'recharts';

const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontWeight="bold">
                {payload.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 8}
                outerRadius={outerRadius + 12}
                fill={fill}
            />
        </g>
    );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const ChartsSection = ({ donutData = [], highCEData = [], downCEData = [], isDarkMode }) => {
    const navigate = useNavigate();
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = (_, index) => {
        setActiveIndex(index);
    };

    const handleBarClick = (data) => {
        if (data && data.id) {
            navigate(`/pot/${data.id}`);
        }
    };

    const textColor = isDarkMode ? '#f1f5f9' : '#64748b'; // slate-100 vs slate-500

    return (
        <div className="charts-section">
            {/* Donut Chart */}
            <div className="chart-card">
                <h3 className="chart-title">Proporsi Status Pot</h3>
                <div style={{ height: '250px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                stroke={isDarkMode ? '#1e293b' : 'white'}
                                strokeWidth={5}
                                dataKey="value"
                                onMouseEnter={onPieEnter}
                                label={renderCustomizedLabel}
                                labelLine={false}
                            >
                                {donutData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                    borderColor: isDarkMode ? '#334155' : '#ccc',
                                    color: isDarkMode ? '#fff' : '#000'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Custom Legend */}
                    <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                        {donutData.map(d => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                                <div style={{ width: 14, height: 14, background: d.fill, borderRadius: 3 }}></div>
                                <span style={{ fontWeight: 500, color: textColor }}>{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bar Charts Row */}
            <div className="chart-row">
                {/* High CE */}
                <div className="chart-card" style={{ flex: 1 }}>
                    <h3 className="chart-title">Highest CE</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={highCEData} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, angle: -45, textAnchor: 'end', fill: textColor }}
                                interval={0}
                                height={50}
                                stroke={textColor}
                            />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip
                                cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                    borderColor: isDarkMode ? '#334155' : '#ccc',
                                    color: isDarkMode ? '#fff' : '#000'
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="#4ade80"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                                label={{ position: 'top', fontSize: 9, fill: textColor, formatter: (val) => `${Number(val).toFixed(1)}%` }}
                                onClick={handleBarClick}
                                style={{ cursor: 'pointer' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Low CE */}
                <div className="chart-card" style={{ flex: 1 }}>
                    <h3 className="chart-title">Lowest CE</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={downCEData} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, angle: -45, textAnchor: 'end', fill: textColor }}
                                interval={0}
                                height={50}
                                stroke={textColor}
                            />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip
                                cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                                contentStyle={{
                                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                    borderColor: isDarkMode ? '#334155' : '#ccc',
                                    color: isDarkMode ? '#fff' : '#000'
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="#f87171"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                                label={{ position: 'top', fontSize: 9, fill: textColor, formatter: (val) => `${Number(val).toFixed(1)}%` }}
                                onClick={handleBarClick}
                                style={{ cursor: 'pointer' }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div >
    );
};

export default ChartsSection;
