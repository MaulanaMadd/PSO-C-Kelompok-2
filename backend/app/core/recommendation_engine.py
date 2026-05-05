from typing import Dict, Any, List, Optional
from datetime import datetime

class RecommendationEngine:
    """
    Expert System / DSS for Pot Recommendation.
    Implements Layer A (Status Rules) and Layer B (Decision Tree) logic.
    """

    @staticmethod
    def get_potline_from_id(pot_id: int) -> int:
        # Simple heuristic based on schema logic or provided map
        # PL1: 101-285, PL2: 301-485 (Example), PL3: 501-685
        # The user prompt mentions PL 1, 2, 3.
        # User defined: PL 1 & 3 use same rules. PL 2 uses different.
        # Let's try to infer or fallback to 1 if unknown.
        # Schema says: 101-285 -> 1, 501-685 -> 3.
        # We assume PL 2 covers some other gap? Or maybe the user just has 1 and 3 in this dataset?
        # Let's assume standard ranges if not provided, or pass explicit potline_id.
        if 101 <= pot_id <= 285: return 1
        if 501 <= pot_id <= 685: return 3
        return 2 # Default/Fallback

    @staticmethod
    def get_limits(potline_id: int) -> Dict[str, float]:
        """Layer A1: Helper - Batas per potline"""
        if potline_id in [1, 3]:
            return {
                'BT_MIN': 945, 'BT_MAX': 965,
                'AED_MAX': 200,
                'AVV_MAX': 4.500,
                'NOISE_MAX': 100, # mV
                'OA_MIN': 12, 'OA_MAX': 20,
                'AEF_MAX': 0.5,
                'SA_MIN': 8, 'SA_MAX': 12,
                'PL_CURRENT_SP': 195, # kA
                'M_MIN': 23, 'M_MAX': 27, # Added M limits
            }
        else: # PL 2
            return {
                'BT_MIN': 950, 'BT_MAX': 970,
                'AED_MAX': 150,
                'AVV_MAX': 4.270,
                'NOISE_MAX': 100,
                'OA_MIN': 12, 'OA_MAX': 20,
                'AEF_MAX': 0.5,
                'SA_MIN': 8.5, 'SA_MAX': 11.5,
                'PL_CURRENT_SP': 235, # kA
                'M_MIN': 23, 'M_MAX': 27, # Added M limits
            }

    @staticmethod
    def check_status(row: Dict[str, Any], limits: Dict[str, float]) -> Dict[str, bool]:
        """Layer A2: Status KPI (LOW/OK/HIGH)"""
        # Safely get values, defaulting to None or appropriate neutral value
        def get_val(key, default=None):
            val = row.get(key)
            return float(val) if val is not None else default

        bt = get_val('bt')
        oa = get_val('oa')
        feed_pct = get_val('feed_pct')
        avv = get_val('avv')
        noise = get_val('noise')
        sa = get_val('sa')
        caf2 = get_val('caf2')
        ae_dur = get_val('ae_dur', 0)
        aef = get_val('aef', 0)
        ae_kwh = get_val('ae_kwh', 0)
        pl_current = get_val('pl_current') or get_val('current') # alias
        
        # Determine Potline SP
        PL_CURRENT_SP = limits['PL_CURRENT_SP']
        
        status = {}
        
        # --- Metal Level (M) ---
        m = get_val('m')
        if m is not None:
            # Inclusive bounds for warning as per user request (<= 23 or >= 27 is WARNING)
            # So OK is > 23 and < 27
            status['M_LOW'] = m <= limits['M_MIN']
            status['M_HIGH'] = m >= limits['M_MAX']
            status['M_OK'] = not (status['M_LOW'] or status['M_HIGH'])
        else:
            status['M_LOW'] = False; status['M_HIGH'] = False; status['M_OK'] = True

        # --- Thermal ---
        if bt is not None:
            status['BT_LOW'] = bt < limits['BT_MIN']
            status['BT_HIGH'] = bt > limits['BT_MAX']
            status['BT_OK'] = not (status['BT_LOW'] or status['BT_HIGH'])
        else:
            status['BT_LOW'] = False; status['BT_HIGH'] = False; status['BT_OK'] = False

        # Freeze Indication
        frozen_bath = get_val('frozen_bath', 0)
        bath_powder = get_val('bath_powder', 0)
        return_crust = get_val('return_crust', 0)
        status['FREEZE_IND'] = (frozen_bath > 0) or (bath_powder > 0) or (return_crust > 0)

        # --- AE & Alumina ---
        status['AEF_HIGH'] = aef >= limits['AEF_MAX']
        status['AED_HIGH'] = ae_dur >= limits['AED_MAX']
        status['AE_HIGH'] = status['AEF_HIGH'] or status['AED_HIGH'] or (ae_kwh > 0)

        if oa is not None:
            status['OA_LOW'] = oa < limits['OA_MIN']
            status['OA_HIGH'] = oa > limits['OA_MAX']
            status['OA_OK'] = not (status['OA_LOW'] or status['OA_HIGH'])
        else:
            status['OA_LOW'] = False; status['OA_OK'] = True # Assume OK if missing

        if feed_pct is not None:
            status['FEED_LOW'] = feed_pct < 90
            status['FEED_HIGH'] = feed_pct > 110
            status['FEED_OK'] = 95 <= feed_pct <= 105
        else:
            status['FEED_LOW'] = False; status['FEED_HIGH'] = False; status['FEED_OK'] = True

        # --- Electrical ---
        if avv is not None:
            status['AVV_HIGH'] = avv >= limits['AVV_MAX']
            status['AVV_OK'] = avv < limits['AVV_MAX']
        else:
            status['AVV_HIGH'] = False

        if pl_current is not None:
            diff = abs(pl_current - PL_CURRENT_SP)
            # band_current recommendations 3-5 kA. Let's use 4.
            status['CURRENT_OK'] = diff <= 4
        else:
            status['CURRENT_OK'] = True

        # Setpoint Drift
        # Need history for this. For now, assume False if no history passed. 
        # Or simple check: osp vs psp in current row
        osp = get_val('osp')
        psp = get_val('psp')
        if osp is not None and psp is not None:
            # band_osp: plant specific. Let's assume 0.5V for now as implicit check
            # Real rule: persist N periods. Just checking instantaneous for MVP.
            status['SETPOINT_DRIFT'] = abs(osp - psp) > 0.5 
        else:
            status['SETPOINT_DRIFT'] = False

        # --- Stability ---
        if noise is not None:
            status['NOISE_HIGH'] = noise > limits['NOISE_MAX']
            status['NOISE_OK'] = noise <= limits['NOISE_MAX']
        else:
            status['NOISE_HIGH'] = False

        # --- Chemistry ---
        if sa is not None:
            status['SA_OUT'] = sa < limits['SA_MIN'] or sa > limits['SA_MAX']
            status['SA_OK'] = not status['SA_OUT']
        else:
            status['SA_OUT'] = False

        if caf2 is not None:
            status['CAF2_OK'] = 3 <= caf2 <= 6
        else:
            status['CAF2_OK'] = True # Assume OK

        # ALF3 checks require history (ZERO_RUN, SPIKE). 
        # We will set these to False by default here, and caller can override if they analyze history.
        status['ALF3_ZERO_RUN'] = False 
        status['ALF3_SPIKE'] = False

        return status

    @staticmethod
    def generate_recommendations(row: Dict[str, Any], history_rows: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Layer B: Rule Base (IF-THEN)
        Returns list of recommendations.
        """
        pot_id = row.get('pot_id', 0)
        potline_id = row.get('potline_id')
        if not potline_id:
            potline_id = RecommendationEngine.get_potline_from_id(pot_id)

        limits = RecommendationEngine.get_limits(potline_id)
        
        # Pre-process ALF3 history if available
        # ALF3_ZERO_RUN: alf3_kg == 0 berturut-turut beberapa hari (e.g. 3 days)
        # ALF3_SPIKE: alf3_kg tinggi berturut-turut
        alf3_zero = False
        alf3_spike = False
        if history_rows:
            # Sort desc by date
            # We need at least 3 days
            recent_alf3 = [r.get('alf3', 0) or 0 for r in history_rows[:3]]
            if len(recent_alf3) >= 3 and all(x == 0 for x in recent_alf3):
                alf3_zero = True
            
            # Simple spike check: > 60 for 3 days? (Limit is ~40-60 usually)
            if len(recent_alf3) >= 3 and all(x > 80 for x in recent_alf3):
                alf3_spike = True

        status = RecommendationEngine.check_status(row, limits)
        status['ALF3_ZERO_RUN'] = alf3_zero
        status['ALF3_SPIKE'] = alf3_spike

        recs = []

        def add_rec(code, label, actions, target, window, priority, impact):
            recs.append({
                "code": code,
                "diagnosis": label,
                "actions": actions, # List of strings
                "target": target,
                "window": window,
                "priority": priority,
                "impact": impact
            })

        # --- PRIORITY 0: Metal Level (M) - Critical for Prediction ---
        # R16: M Deviation (Low/High)
        if status['M_LOW'] or status['M_HIGH']:
            actions = ["Koreksi Tapping/Metal sesuai target", "Pertahankan feeding normal"]
            if status['M_LOW']:
                actions.append("Cek indikasi kebocoran/metal run out")
            diagnosis = "Tinggi Metal (M) Abnormal"
            if status['M_LOW']: diagnosis += " (Terlalu Rendah)"
            if status['M_HIGH']: diagnosis += " (Terlalu Tinggi)"
            
            add_rec("R16", diagnosis,
                    actions,
                    f"M {limits['M_MIN']+1}-{limits['M_MAX']-1} cm",
                    "Shift / 24 Jam", 0, # Top priority
                    "Akurasi Predicted CE & Stabilitas Arus")

        # --- PRIORITY 1: AE Path ---
        
        # R1: AE High + OA Low
        if status['AE_HIGH'] and status['OA_LOW']:
            actions = ["Feeding dinaikkan (recovery) \u2192 naikkan feed_pct/fd"]
            if status['BT_LOW']:
                actions.append("Jalankan R5 (Thermal Recovery) juga")
            add_rec("R1", "AE tinggi + OA rendah (kekurangan Al\u2082O\u2083 terlarut)", 
                    actions, 
                    f"OA \u2265 {limits['OA_MIN']}, AE Duration turun", 
                    "2-6 Jam", 1,
                    "Stop Anode Effect & Pulihkan CE")
        
        # R2: AE High + OA Ok + BT Low
        elif status['AE_HIGH'] and status['OA_OK'] and status['BT_LOW']:
            actions = ["OSP dinaikkan bertahap untuk naikkan BT", "Jaga feeding tetap normal"]
            if status['SA_OUT'] or status['ALF3_ZERO_RUN']:
                actions.append("Cek Rule R13/R14 (Chemistry)")
            add_rec("R2", "AE tinggi + OA normal + BT rendah (masalah pelarutan)", 
                    actions,
                    f"BT {limits['BT_MIN']}-{limits['BT_MAX']}", 
                    "2-6 Jam", 1,
                    "Cegah AE berulang & Optimalkan Pelarutan")

        # R3: AE High + Feed Low
        elif status['AE_HIGH'] and status['FEED_LOW']:
            add_rec("R3", "AE tinggi + Feed Rate rendah", 
                    ["Feeding dinaikkan sampai minimal \u2265 95%", "Monitor OA naik & AE turun"],
                    "Feed Rate \u2265 95%", 
                    "2-6 Jam", 1,
                    "Koreksi Feeding untuk Stop AE")

        # R4: AE High + Noise High
        elif status['AE_HIGH'] and status['NOISE_HIGH']:
            add_rec("R4", "AE tinggi + Noise tinggi (Unstable)",
                    ["Stabilkan operasi dulu, hold perubahan besar", "Cek tapping/operasi manual", "Setelah noise turun, lanjut rule AE"],
                    f"Noise < {limits['NOISE_MAX']} mV",
                    "2-4 Jam", 1,
                    "Stabilisasi Pot sebelum Recovery CE")

        # --- PRIORITY 2: Thermal ---
        
        # R5: BT Low
        if status['BT_LOW'] and not (status['AE_HIGH'] and status['OA_LOW']): # Avoid double rec logic if purely driven by R1
            actions = ["OSP dinaikkan bertahap sampai BT OK"]
            if status['FEED_HIGH']:
                actions.insert(0, "Feeding diturunkan bertahap (mengurangi cooling)")
            if status['FREEZE_IND']:
                actions.append("Jalankan SOP freeze recovery, tahan koreksi chemistry")
            add_rec("R5", "Bath Temperature Rendah (Dingin)",
                    actions,
                    f"BT {limits['BT_MIN']}-{limits['BT_MAX']}",
                    "Shift / 2-6 Jam", 2,
                    "Cegah Sludge & Jaga Kelarutan Alumina")
        
        # R6: BT High
        if status['BT_HIGH']:
            actions = ["OSP diturunkan bertahap"]
            if status['FEED_LOW']:
                actions.append("Kembalikan feeding ke normal (anti AE)")
            actions.append("Cek indikator heatloss/pot condition")
            add_rec("R6", "Bath Temperature Tinggi (Panas)",
                    actions,
                    f"BT {limits['BT_MIN']}-{limits['BT_MAX']}",
                    "Shift / 2-6 Jam", 2,
                    "Efisiensi Energi & Cegah Reaksi Samping")

        # --- PRIORITY 3: Noise/Stability ---
        
        # R7: Noise High (Generic)
        if status['NOISE_HIGH'] and not status['AE_HIGH']: # If AE High, R4 handles it
            actions = ["Monitor 2-4 jam (jika event operasi)"]
            if status['BT_LOW'] or status['FREEZE_IND']:
                actions.append("Jalankan R5 (Thermal)")
            if not status['CURRENT_OK']:
                actions.append("Jalankan R10/R9 (Electrical Upset)")
            add_rec("R7", "Noise Tinggi",
                    actions,
                    f"Noise \u2264 {limits['NOISE_MAX']}",
                    "2-4 Jam", 3,
                    "Kurangi Gangguan Magnetik/Fisik")

        # --- PRIORITY 4: Electrical ---
        
        # R8: AVV High
        if status['AVV_HIGH'] and not status['AE_HIGH']: # AE causes high volts naturally
            actions = ["Monitor AVV"]
            if status['BT_HIGH']: actions.append("OSP Turun")
            if status['BT_LOW']: actions.append("Cek Noise/Current sebelum ubah OSP")
            add_rec("R8", "AVV Melewati Batas",
                    actions,
                    f"AVV < {limits['AVV_MAX']}",
                    "Shift", 4,
                    "Kontrol Voltase untuk CE Optimal")
        
        # R9. Current not OK
        if not status['CURRENT_OK']:
            add_rec("R9", "Line Current Deviation",
                    ["Label 'Electrical Mode Change/Upset'", "Tahan koreksi chemistry besar", "Fokus stabilkan BT & Feeeding"],
                    "Current Stability",
                    "2-6 Jam", 4,
                    "Adaptasi Input Energi")
        
        # R10: SP Drift
        if status['SETPOINT_DRIFT']:
            add_rec("R10", "Setpoint Drift (OSP vs PSP)",
                    ["Kembalikan OSP mendekati PSP bertahap", "Lihat respon BT & AE"],
                    "OSP ~ PSP",
                    "Shift", 4,
                    "Kembali ke Target Desain")

        # --- PRIORITY 5: Chemistry ---
        
        # R11: SA Out
        if status['SA_OUT']:
            add_rec("R11", "Komposisi Bath Menyimpang (SA)",
                    ["Koreksi SA sesuai recipe (slow change)", "Monitor BT/AE/Noise"],
                    f"SA {limits['SA_MIN']}-{limits['SA_MAX']}",
                    "2-4 Hari", 5,
                    "Optimalkan Kimia Bath")

        # R12: CaF2 Out
        if not status['CAF2_OK']:
            add_rec("R12", "Komposisi Bath Menyimpang (CaF2)",
                    ["Koreksi CaF2 sesuai recipe (slow change)"],
                    "CaF2 3-6%",
                    "2-4 Hari", 5,
                    "Optimalkan Kimia Bath")
        
        # R13: AlF3 Zero Run
        if status['ALF3_ZERO_RUN']:
            add_rec("R13", "AlF3 Zero Run Alert",
                    ["Mulai koreksi AlF3 bertahap", "Monitor efek ke BT/AE/SA"],
                    "Normal Feed",
                    "2-4 Hari", 5,
                    "Jaga Rasio Kimia")

        # R14: AlF3 Spike
        if status['ALF3_SPIKE']:
            add_rec("R14", "AlF3 High Spike Alert",
                    ["Hold/Kurangi koreksi AlF3", "Stabilkan thermal (OSP)"],
                    "Normal Feed",
                    "2-4 Hari", 5,
                    "Cegah Over-Addition")

        # --- PRIORITY 6: Classical Combo ---
        
        # R15: Feed High + BT Low (Sludge Risk)
        if status['FEED_HIGH'] and status['BT_LOW']:
            # Could overlap with R5, but this is specific combination
            # We can deduplicate or just allow multple insights
            # Let's add it if not covered fully by R5 actions
            add_rec("R15", "Overfeeding + Dingin (Resiko Sludge)",
                    ["Turunkan feeding bertahap", "Fine-tune OSP setelah stabil"],
                    "Feed Normal, BT Normal",
                    "Shift", 6,
                    "Cegah Sludge/Katoda Kotor")

        # Sort by Priority
        recs.sort(key=lambda x: x['priority'])
        
        return recs
