import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    X, Upload, FileSpreadsheet, AlertCircle,
    CheckCircle2, ArrowRight, RefreshCw, ChevronDown,
    Table2, Info
} from 'lucide-react';
import api from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// ALL columns from stg.pot_daily_ingest (exact DB column names)
// ─────────────────────────────────────────────────────────────────────────────
const STG_COLUMNS = [
    'tgl', 'potnum', 'potday', 'gen', 'ctype', 'pot_status', 'transition',
    'age_day', 'age_month', 'class', 'pot_design', 'tshift', 'ac_schedule',
    'mt_schedule', 'mt_shift', 'mt_day', 'metal_kg', 'dross', 'ov', 'ce',
    'dc', 'metal_leak', 'group_current', 'avv', 'psp', 'osp', 'noise', 'cb',
    'fd', 'oa', 'aef', 'aev', 'ae_dur', 'ae_kwh', 'm', 'mc', 's', 'cd', 'bt',
    'alf3_kg', 'mt_bb', 'feed_pct', 'pl_current', 'bt_in_target', 'bath_tap',
    'bath_charge', 'anode_reset', 'nipple_kg', 'c_tapping', 'meji',
    'frozen_bath', 'bath_powder', 'return_crust', 'dross_trp', 'bbar_miring',
    'belly_helly', 'temp_ac', 'metal_scrap', 'metal_ball', 'soda_ash',
    'break_sp', 'break_local', 'nipple_freq', 'broke_anode_kg',
    'broke_anode_freq', 'rwb_kg', 'rwb_freq', 'fe', 'si', 'sa', 'caf2',
    's1a', 's1b', 'sa_in_target', 'tacb', 'kerak_kg', 'kerak_freq', 'beto',
    'tebl', 'jf', 'mix_welding', 'ba_clad', 'n_bulat', 'rod_rj', 'fe_charge',
];

// Required columns — must be mappable or upload blocked
const REQUIRED_COLS = ['tgl', 'potnum'];

// ─────────────────────────────────────────────────────────────────────────────
// Auto-map: normalise both sides and match
// ─────────────────────────────────────────────────────────────────────────────
function buildAutoMapping(xlsxHeaders) {
    const norm = (s) =>
        String(s)
            .toLowerCase()
            .replace(/[\s\-./\\]/g, '_')   // spaces/dashes/dots → _
            .replace(/_+/g, '_')              // collapse repeated _
            .replace(/^_|_$/g, '');           // trim leading/trailing _

    // Build lookup: normalisedDbCol → dbCol
    const dbLookup = {};
    STG_COLUMNS.forEach((col) => {
        dbLookup[norm(col)] = col;
    });

    // Additional aliases for common Excel header variations
    const aliases = {
        tgl: ['tanggal', 'date', 'tgl_produksi', 'production_date'],
        potnum: ['pot', 'pot_no', 'pot_number', 'no_pot', 'nomor_pot', 'potnumber'],
        ce: ['current_efficiency', 'efisiensi', 'efisiensi_arus'],
        bt: ['bath_temp', 'temperature', 'bath_temperature', 'suhu'],
        avv: ['voltage', 'volt', 'av', 'anoda_volt'],
        noise: ['noice', 'bising'],
        m: ['measurement', 'measure', 'bath_ratio'],
        metal_kg: ['metal', 'produksi_metal', 'kg_metal'],
        group_current: ['current', 'arus', 'group_arus'],
        pot_status: ['status', 'status_pot'],
        age_day: ['umur_hari', 'pot_age_day'],
        age_month: ['umur_bulan', 'pot_age_month'],
        ae_dur: ['ae_duration', 'durasi_ae'],
        ae_kwh: ['ae_energy', 'energi_ae'],
        alf3_kg: ['alf3', 'aluminium_fluoride'],
        feed_pct: ['feeding', 'feed_percent'],
        broke_anode_kg: ['anode_patah_kg', 'broken_anode_kg'],
        broke_anode_freq: ['anode_patah_freq', 'broken_anode_freq'],
    };

    const mapping = {}; // { dbCol: xlsxHeader }
    const usedXlsx = new Set();

    // Pass 1 — exact match after normalisation
    xlsxHeaders.forEach((header) => {
        const n = norm(header);
        if (dbLookup[n] && !mapping[dbLookup[n]]) {
            mapping[dbLookup[n]] = header;
            usedXlsx.add(header);
        }
    });

    // Pass 2 — alias match
    xlsxHeaders.forEach((header) => {
        if (usedXlsx.has(header)) return;
        const n = norm(header);
        for (const [dbCol, aliasList] of Object.entries(aliases)) {
            if (!mapping[dbCol] && aliasList.includes(n)) {
                mapping[dbCol] = header;
                usedXlsx.add(header);
                break;
            }
        }
    });

    return mapping; // { 'tgl': 'Tanggal', 'potnum': 'Pot No', ... }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse xlsx → { headers, rows }
// ─────────────────────────────────────────────────────────────────────────────
function parseXlsx(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
                resolve({ headers, rows });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = ['Upload File', 'Review Mapping', 'Preview & Confirm', 'Selesai'];

function StepIndicator({ currentStep }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            {STEPS.map((label, idx) => {
                const done = idx < currentStep;
                const active = idx === currentStep;
                return (
                    <React.Fragment key={label}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.8rem', fontWeight: 700,
                                background: done ? '#10b981' : active ? '#3b82f6' : 'var(--bg-hover)',
                                color: (done || active) ? 'white' : 'var(--text-muted)',
                                border: active ? '2px solid #93c5fd' : '2px solid transparent',
                                transition: 'all 0.3s',
                            }}>
                                {done ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                                color: active ? 'var(--text-primary)' : done ? '#10b981' : 'var(--text-muted)',
                            }}>{label}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, marginBottom: 18,
                                background: done ? '#10b981' : 'var(--border-subtle)',
                                transition: 'background 0.3s',
                            }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drop zone
// ─────────────────────────────────────────────────────────────────────────────
function DropZone({ onFileAccepted, error }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const handle = (file) => {
        if (!file || !file.name.match(/\.(xlsx|xls)$/i)) return;
        onFileAccepted(file);
    };

    return (
        <div
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
            style={{
                border: `2px dashed ${dragging ? '#3b82f6' : error ? '#ef4444' : 'var(--border-subtle)'}`,
                borderRadius: 16, padding: '3rem 2rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'rgba(59,130,246,0.05)' : 'var(--bg-hover)',
            }}
        >
            <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(59,130,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <FileSpreadsheet size={28} color="#3b82f6" />
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Drag &amp; drop file Excel di sini
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                    atau klik untuk memilih file <strong>.xlsx / .xls</strong>
                </p>
            </div>
            {error && (
                <div style={{ display: 'flex', gap: 6, color: '#ef4444', fontSize: '0.85rem', alignItems: 'center' }}>
                    <AlertCircle size={14} /> {error}
                </div>
            )}
            <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                onChange={(e) => handle(e.target.files[0])} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping review table (Step 1)
// ─────────────────────────────────────────────────────────────────────────────
function MappingReview({ mapping, xlsxHeaders, onMappingChange }) {
    const mappedCount = Object.values(mapping).filter(Boolean).length;
    const unmappedReq = REQUIRED_COLS.filter(c => !mapping[c]);
    const mappedEntries = STG_COLUMNS.filter(c => mapping[c]);
    const unmapped = STG_COLUMNS.filter(c => !mapping[c]);

    return (
        <div>
            {/* Summary badges */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{
                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                }}>
                    ✓ {mappedCount} kolom ter-mapping
                </div>
                <div style={{
                    background: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)',
                    padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                }}>
                    {unmapped.length} kolom tidak ada di file
                </div>
                {unmappedReq.length > 0 && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                        padding: '0.4rem 0.85rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                    }}>
                        ✗ Wajib belum terpetakan: {unmappedReq.join(', ')}
                    </div>
                )}
            </div>

            {/* Info box */}
            <div style={{
                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.82rem',
                color: 'var(--text-secondary)', marginBottom: '1.25rem',
                display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
                <Info size={14} style={{ marginTop: 2, flexShrink: 0, color: '#3b82f6' }} />
                <div>
                    Auto-mapping dilakukan berdasarkan nama kolom di file Excel.
                    Kolom yang tidak ditemukan di file akan diisi <code style={{ background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 4 }}>NULL</code> di database.
                    Kamu bisa ubah mapping secara manual jika ada yang salah.
                </div>
            </div>

            {/* Mapped columns table */}
            <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 10 }}>
                        <tr>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', width: '35%' }}>
                                Kolom DB (stg)
                            </th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>
                                Kolom Excel → (ubah jika perlu)
                            </th>
                            <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', width: 60 }}>
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Required columns first */}
                        {REQUIRED_COLS.map(dbCol => (
                            <MappingRow key={dbCol} dbCol={dbCol} mapping={mapping}
                                xlsxHeaders={xlsxHeaders} onMappingChange={onMappingChange} required />
                        ))}
                        {/* Then mapped non-required */}
                        {mappedEntries.filter(c => !REQUIRED_COLS.includes(c)).map(dbCol => (
                            <MappingRow key={dbCol} dbCol={dbCol} mapping={mapping}
                                xlsxHeaders={xlsxHeaders} onMappingChange={onMappingChange} />
                        ))}
                        {/* Then unmapped */}
                        {unmapped.filter(c => !REQUIRED_COLS.includes(c)).map(dbCol => (
                            <MappingRow key={dbCol} dbCol={dbCol} mapping={mapping}
                                xlsxHeaders={xlsxHeaders} onMappingChange={onMappingChange} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MappingRow({ dbCol, mapping, xlsxHeaders, onMappingChange, required }) {
    const mapped = !!mapping[dbCol];
    return (
        <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: required && !mapped ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
            <td style={{ padding: '0.5rem 0.75rem', color: required ? '#3b82f6' : 'var(--text-primary)', fontWeight: required ? 700 : 400, fontFamily: 'monospace' }}>
                {dbCol}{required && <span style={{ color: '#ef4444' }}>*</span>}
            </td>
            <td style={{ padding: '0.5rem 0.75rem' }}>
                <div style={{ position: 'relative' }}>
                    <select
                        value={mapping[dbCol] || ''}
                        onChange={(e) => onMappingChange(dbCol, e.target.value)}
                        style={{
                            width: '100%', padding: '0.35rem 1.75rem 0.35rem 0.6rem',
                            borderRadius: 6, border: '1px solid var(--border-subtle)',
                            background: mapped ? 'var(--bg-main)' : 'var(--bg-hover)',
                            color: mapped ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontSize: '0.82rem', appearance: 'none', cursor: 'pointer',
                        }}
                    >
                        <option value="">— tidak dipetakan —</option>
                        {xlsxHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <ChevronDown size={12} style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none', color: 'var(--text-muted)'
                    }} />
                </div>
            </td>
            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                {mapped
                    ? <CheckCircle2 size={15} color="#10b981" />
                    : required
                        ? <AlertCircle size={15} color="#ef4444" />
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                }
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────────────────────
const UploadDataModal = ({ isOpen, onClose, onUploadSuccess, apiUrl }) => {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState(null);
    const [parseError, setParseError] = useState('');
    const [xlsxHeaders, setXlsxHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [mapping, setMapping] = useState({});
    const [mapError, setMapError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const reset = () => {
        setStep(0); setFile(null); setParseError(''); setXlsxHeaders([]);
        setRows([]); setMapping({}); setMapError(''); setResult(null);
    };

    const handleClose = () => { reset(); onClose(); };

    // ── Step 0: File accepted ──────────────────────────────────────────────
    const handleFileAccepted = useCallback(async (f) => {
        setParseError('');
        setFile(f);
        try {
            const { headers, rows: r } = await parseXlsx(f);
            if (headers.length === 0) {
                setParseError('File kosong atau tidak memiliki header.');
                return;
            }
            setXlsxHeaders(headers);
            setRows(r);
            setMapping(buildAutoMapping(headers));
            setStep(1);
        } catch {
            setParseError('Gagal membaca file. Pastikan format .xlsx / .xls yang valid.');
        }
    }, []);

    const handleMappingChange = (dbCol, xlsxHeader) => {
        setMapping(prev => ({ ...prev, [dbCol]: xlsxHeader || undefined }));
    };

    // ── Step 1 → 2: Validate required cols ────────────────────────────────
    const handleConfirmMapping = () => {
        const missing = REQUIRED_COLS.filter(c => !mapping[c]);
        if (missing.length) {
            setMapError(`Kolom wajib belum dipetakan: ${missing.join(', ')}`);
            return;
        }
        setMapError('');
        setStep(2);
    };

    // ── Build payload: each row → only mapped keys ─────────────────────────
    const buildPayload = () =>
        rows.map(row => {
            const item = { source: file.name };
            STG_COLUMNS.forEach(dbCol => {
                const xlsxCol = mapping[dbCol];
                if (!xlsxCol || row[xlsxCol] === undefined || row[xlsxCol] === null || row[xlsxCol] === '') {
                    item[dbCol] = null;
                } else {
                    const val = row[xlsxCol];
                    if (dbCol === 'tgl') {
                        if (val instanceof Date) {
                            const y = val.getFullYear();
                            const m = String(val.getMonth() + 1).padStart(2, '0');
                            const d = String(val.getDate()).padStart(2, '0');
                            item[dbCol] = `${y}-${m}-${d}`;
                        } else if (typeof val === 'number') {
                            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            item[dbCol] = `${y}-${m}-${day}`;
                        } else {
                            item[dbCol] = String(val).trim();
                        }
                    } else {
                        item[dbCol] = String(val);
                    }
                }
            });
            return item;
        });

    // Preview: 5 rows, only mapped columns
    const mappedDbCols = STG_COLUMNS.filter(c => mapping[c]);
    const previewRows = rows.slice(0, 5).map(row => {
        const r = {};
        mappedDbCols.forEach(dbCol => { r[dbCol] = row[mapping[dbCol]]; });
        return r;
    });

    const handleConfirmUpload = async () => {
        setUploading(true);
        try {
            const payload = buildPayload();

            const res = await api.post("/ingest/pot-daily", { 
                filename: file.name, 
                rows: payload 
            });

            setResult({ success: true, count: payload.length, response: res.data });
            onUploadSuccess?.({ count: payload.length });
        } catch (err) {
            setResult({ success: false, error: err.response?.data?.detail || err.message });
        } finally {
            setUploading(false);
            setStep(3);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: 20,
                width: '100%', maxWidth: 720,
                maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'rgba(59,130,246,0.1)', padding: 10, borderRadius: 10 }}>
                            <Upload size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Upload Data Excel
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {file
                                    ? `${file.name} · ${rows.length} baris · ${Object.values(mapping).filter(Boolean).length} kolom ter-mapping`
                                    : 'Import data harian pot dari file .xlsx'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem 2rem 2rem' }}>
                    <StepIndicator currentStep={step} />

                    {/* ── STEP 0: Drop zone ──────────────────────────────── */}
                    {step === 0 && (
                        <DropZone onFileAccepted={handleFileAccepted} error={parseError} />
                    )}

                    {/* ── STEP 1: Mapping review ─────────────────────────── */}
                    {step === 1 && (
                        <div>
                            <MappingReview
                                mapping={mapping}
                                xlsxHeaders={xlsxHeaders}
                                onMappingChange={handleMappingChange}
                            />

                            {mapError && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                                    padding: '0.75rem 1rem', color: '#ef4444', fontSize: '0.85rem',
                                    display: 'flex', gap: 8, alignItems: 'center', marginBottom: '1rem',
                                }}>
                                    <AlertCircle size={14} /> {mapError}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                                <button className="nav-btn" onClick={() => setStep(0)}
                                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                                    ← Kembali
                                </button>
                                <button className="nav-btn" onClick={handleConfirmMapping}
                                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none' }}>
                                    Lanjut <ArrowRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Preview ───────────────────────────────── */}
                    {step === 2 && (
                        <div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                Preview <strong>5 baris pertama</strong> dari <strong>{rows.length}</strong> total baris.
                                Hanya kolom yang ter-mapping ditampilkan.
                            </p>

                            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-hover)' }}>
                                            {mappedDbCols.map(col => (
                                                <th key={col} style={{
                                                    padding: '0.55rem 0.75rem', textAlign: 'left',
                                                    color: REQUIRED_COLS.includes(col) ? '#3b82f6' : 'var(--text-secondary)',
                                                    fontWeight: 600, borderBottom: '1px solid var(--border-subtle)',
                                                    whiteSpace: 'nowrap', fontFamily: 'monospace',
                                                }}>
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((row, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                {mappedDbCols.map(col => (
                                                    <td key={col} style={{ padding: '0.55rem 0.75rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                        {String(row[col] ?? '—')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{
                                background: 'rgba(59,130,246,0.07)', borderRadius: 10,
                                padding: '0.75rem 1rem', fontSize: '0.83rem',
                                color: 'var(--text-secondary)', marginBottom: '1.25rem',
                                display: 'flex', gap: 8, alignItems: 'flex-start',
                            }}>
                                <Table2 size={14} style={{ marginTop: 2, flexShrink: 0, color: '#3b82f6' }} />
                                <span>
                                    File <strong>{file?.name}</strong> siap untuk diunggah ke sistem.
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button className="nav-btn" onClick={() => setStep(1)}
                                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                                    ← Kembali
                                </button>
                                <button className="nav-btn" onClick={handleConfirmUpload} disabled={uploading}
                                    style={{
                                        background: uploading ? 'var(--bg-hover)' : 'linear-gradient(135deg, #10b981, #059669)',
                                        color: uploading ? 'var(--text-muted)' : 'white', border: 'none',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                    {uploading
                                        ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Mengupload...</>
                                        : <><Upload size={15} /> Konfirmasi Upload ({rows.length} baris)</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Result ────────────────────────────────── */}
                    {step === 3 && result && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 1.25rem',
                                background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {result.success
                                    ? <CheckCircle2 size={36} color="#10b981" />
                                    : <AlertCircle size={36} color="#ef4444" />
                                }
                            </div>

                            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                                {result.success ? 'Upload Berhasil!' : 'Upload Gagal'}
                            </h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
                                {result.success
                                    ? `${result.count} baris data berhasil diunggah`
                                    : `Error: ${result.error}`
                                }
                            </p>
                            {result.success && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
                                    Data telah selesai diproses oleh Machine Learning dan siap dilihat di Dashboard.
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                {!result.success && (
                                    <button className="nav-btn" onClick={() => setStep(2)}
                                        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                                        ← Coba Lagi
                                    </button>
                                )}
                                <button className="nav-btn" onClick={result.success ? handleClose : reset}
                                    style={{
                                        background: result.success
                                            ? 'linear-gradient(135deg, #10b981, #059669)'
                                            : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        color: 'white', border: 'none',
                                    }}>
                                    {result.success ? 'Tutup' : 'Upload File Baru'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default UploadDataModal;