export const summaryData = {
    total: 50,
    optimal: 27,
    warning: 13,
    critical: 10,
    average: 91.0
};

// Generate 50 pots with specific determined data
export const generatePots = () => {
    return [
        { id: 1, name: 'Pot 1', value: 92.3, status: 'optimal' },
        { id: 2, name: 'Pot 2', value: 91.2, status: 'optimal' },
        { id: 3, name: 'Pot 3', value: 91.4, status: 'optimal' },
        { id: 4, name: 'Pot 4', value: 92.7, status: 'optimal' },
        { id: 5, name: 'Pot 5', value: 90.3, status: 'optimal' },
        { id: 6, name: 'Pot 6', value: 92.2, status: 'optimal' },
        { id: 7, name: 'Pot 7', value: 93.0, status: 'optimal' },
        { id: 8, name: 'Pot 8', value: 88.2, status: 'warning' },
        { id: 9, name: 'Pot 9', value: 87.5, status: 'warning' },
        { id: 10, name: 'Pot 10', value: 82.3, status: 'critical' },
        { id: 11, name: 'Pot 11', value: 91.3, status: 'optimal' },
        { id: 12, name: 'Pot 12', value: 91.6, status: 'optimal' },
        { id: 13, name: 'Pot 13', value: 88.2, status: 'warning' },
        { id: 14, name: 'Pot 14', value: 93.7, status: 'optimal' },
        { id: 15, name: 'Pot 15', value: 92.3, status: 'optimal' },
        { id: 16, name: 'Pot 16', value: 92.7, status: 'optimal' },
        { id: 17, name: 'Pot 17', value: 80.1, status: 'critical' },
        { id: 18, name: 'Pot 18', value: 78.9, status: 'critical' },
        { id: 19, name: 'Pot 19', value: 91.2, status: 'optimal' },
        { id: 20, name: 'Pot 20', value: 92.0, status: 'optimal' },
        { id: 21, name: 'Pot 21', value: 88.4, status: 'warning' },
        { id: 22, name: 'Pot 22', value: 92.0, status: 'optimal' },
        { id: 23, name: 'Pot 23', value: 92.7, status: 'optimal' },
        { id: 24, name: 'Pot 24', value: 87.6, status: 'warning' },
        { id: 25, name: 'Pot 25', value: 83.1, status: 'critical' },
        { id: 26, name: 'Pot 26', value: 84.9, status: 'critical' },
        { id: 27, name: 'Pot 27', value: 85.2, status: 'warning' },
        { id: 28, name: 'Pot 28', value: 87.1, status: 'warning' },
        { id: 29, name: 'Pot 29', value: 88.5, status: 'warning' },
        { id: 30, name: 'Pot 30', value: 90.1, status: 'optimal' },
        { id: 31, name: 'Pot 31', value: 84.2, status: 'critical' },
        { id: 32, name: 'Pot 32', value: 84.5, status: 'critical' },
        { id: 33, name: 'Pot 33', value: 81.9, status: 'critical' },
        { id: 34, name: 'Pot 34', value: 85.2, status: 'warning' },
        { id: 35, name: 'Pot 35', value: 82.1, status: 'critical' },
        { id: 36, name: 'Pot 36', value: 90.3, status: 'optimal' },
        { id: 37, name: 'Pot 37', value: 91.2, status: 'optimal' },
        { id: 38, name: 'Pot 38', value: 91.4, status: 'optimal' },
        { id: 39, name: 'Pot 39', value: 90.7, status: 'optimal' },
        { id: 40, name: 'Pot 40', value: 91.3, status: 'optimal' },
        { id: 41, name: 'Pot 41', value: 83.4, status: 'critical' },
        { id: 42, name: 'Pot 42', value: 86.1, status: 'warning' },
        { id: 43, name: 'Pot 43', value: 89.1, status: 'warning' },
        { id: 44, name: 'Pot 44', value: 88.8, status: 'warning' },
        { id: 45, name: 'Pot 45', value: 91.1, status: 'optimal' },
        { id: 46, name: 'Pot 46', value: 90.3, status: 'optimal' },
        { id: 47, name: 'Pot 47', value: 91.9, status: 'optimal' },
        { id: 48, name: 'Pot 48', value: 87.5, status: 'warning' },
        { id: 49, name: 'Pot 49', value: 91.7, status: 'optimal' },
        { id: 50, name: 'Pot 50', value: 90.3, status: 'optimal' },
    ];
};

export const highCEData = [
    { name: 'Pot 14', value: 93.7 },
    { name: 'Pot 7', value: 93.0 },
    { name: 'Pot 4', value: 92.7 },
    { name: 'Pot 16', value: 92.7 },
    { name: 'Pot 23', value: 92.7 },
    { name: 'Pot 1', value: 92.3 },
    { name: 'Pot 15', value: 92.3 },
    { name: 'Pot 6', value: 92.2 },
    { name: 'Pot 47', value: 91.9 },
    { name: 'Pot 49', value: 91.7 },
];

export const downCEData = [
    { name: 'Pot 18', value: 78.9 },
    { name: 'Pot 17', value: 80.1 },
    { name: 'Pot 33', value: 81.9 },
    { name: 'Pot 35', value: 82.1 },
    { name: 'Pot 10', value: 82.3 },
    { name: 'Pot 25', value: 83.1 },
    { name: 'Pot 41', value: 83.4 },
    { name: 'Pot 31', value: 84.2 },
    { name: 'Pot 32', value: 84.5 },
    { name: 'Pot 42', value: 84.9 },
];

export const potDetailData = {
    id: '1',
    currentEfficiency: {
        value: 92.3,
        target: 95,
        status: 'Good'
    },
    sensors: [
        { id: 1, type: 'temperature', value: '960°C', label: 'Bath Temperature', status: 'optimal', trend: '-2°C' },
        { id: 2, type: 'level', value: '18 cm', label: 'Bath Level', status: 'warning', trend: '+1 cm' },
        { id: 3, type: 'level', value: '22 cm', label: 'Metal Level', status: 'optimal', trend: '0 cm' },
        { id: 4, type: 'level', value: '40 cm', label: 'Liquid Level', status: 'optimal', trend: '+1 cm' },
        { id: 5, type: 'noise', value: '0.045 mV', label: 'Noise', status: 'optimal', trend: '-0.001' },
        { id: 6, type: 'voltage', value: '4.2 V', label: 'Set Point Voltage', status: 'optimal', trend: '0 V' },
        { id: 7, type: 'time', value: '85 s', label: 'Feeding Interval', status: 'warning', trend: '+5 s' },
        { id: 8, type: 'weight', value: '1.5 kg', label: 'Alumina Dose', status: 'optimal', trend: '0 kg' },
        { id: 9, type: 'ratio', value: '1.13', label: 'Bath Ratio', status: 'critical', trend: '-0.05' },
        { id: 10, type: 'current', value: '180 kA', label: 'Anode Current', status: 'optimal', trend: '+1 kA' },
    ],
    warnings: [
        { level: 'warning', title: 'CE mendekati batas minimum', message: 'Penyebab : Terdapat Lumpur yang banyak menyebabkan ketidakstabilan temperature suhu' }
    ],
    recommendations: [
        { type: 'optimasi', title: 'Optimasi parameter operasi', impact: '+1-2% CE' },
        { type: 'feeding', title: 'Tambahkan Frekuensi Feeding', impact: '+0.5% CE' }
    ],
    charts: {
        bathTemperature: [
            { day: '01 Jan', value: 940 }, { day: '02 Jan', value: 950 }, { day: '03 Jan', value: 945 }, { day: '04 Jan', value: 960 }, { day: '05 Jan', value: 955 }, { day: '06 Jan', value: 965 }, { day: '07 Jan', value: 950 }
        ],
        anodeEffect: [
            { day: '01 Jan', value: 1 }, { day: '02 Jan', value: 3 }, { day: '03 Jan', value: 2 }, { day: '04 Jan', value: 0 }, { day: '05 Jan', value: 3 }, { day: '06 Jan', value: 0 }, { day: '07 Jan', value: 2 }
        ],
        anodeCatodeDistance: [
            { day: '01 Jan', value: 945 }, { day: '02 Jan', value: 955 }, { day: '03 Jan', value: 950 }, { day: '04 Jan', value: 960 }, { day: '05 Jan', value: 958 }, { day: '06 Jan', value: 962 }, { day: '07 Jan', value: 950 }
        ],
        bathAcidity: [
            { day: '01 Jan', value: 10 }, { day: '02 Jan', value: 8 }, { day: '03 Jan', value: 12 }, { day: '04 Jan', value: 11 }, { day: '05 Jan', value: 5 }, { day: '06 Jan', value: 14 }, { day: '07 Jan', value: 10 }
        ],
        averageVoltage: [
            { day: '01 Jan', value: 4.5 }, { day: '02 Jan', value: 4.2 }, { day: '03 Jan', value: 4.3 }, { day: '04 Jan', value: 3.8 }, { day: '05 Jan', value: 4.5 }, { day: '06 Jan', value: 4.4 }, { day: '07 Jan', value: 4.0 }
        ],
        feedingFrequency: [
            { day: '01 Jan', value: 2600 }, { day: '02 Jan', value: 2750 }, { day: '03 Jan', value: 2400 }, { day: '04 Jan', value: 2650 }, { day: '05 Jan', value: 2500 }, { day: '06 Jan', value: 2900 }, { day: '07 Jan', value: 2700 }
        ]
    }
};

export const donutData = [
    { name: 'Optimal', value: 54, fill: '#4ade80' }, // Green
    { name: 'Critical', value: 20, fill: '#f87171' }, // Red
    { name: 'Warning', value: 26, fill: '#fbbf24' }, // Yellow
];
