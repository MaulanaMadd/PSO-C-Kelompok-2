-- Performance optimization indexes for dashboard queries
-- Run this SQL to create indexes that will speed up dashboard loading

-- Index for pot_params_daily - most critical for dashboard performance
CREATE INDEX IF NOT EXISTS idx_pot_params_daily_pot_date 
ON mart.pot_params_daily (pot_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_pot_params_daily_potline_date 
ON mart.pot_params_daily (potline_id, date DESC) WHERE potline_id IS NOT NULL;

-- Index for CE predictions
CREATE INDEX IF NOT EXISTS idx_ce_predicted_pot_pred_date 
ON mart.ce_predicted_daily (pot_id, pred_date, created_at DESC) 
WHERE model_version = 'v1.0';

-- Index for non-zero CE lookups (for fallback queries)
CREATE INDEX IF NOT EXISTS idx_pot_params_daily_ce_nonzero 
ON mart.pot_params_daily (pot_id, date DESC) 
WHERE ce > 0;

-- Analyze tables to update statistics
ANALYZE mart.pot_params_daily;
ANALYZE mart.ce_predicted_daily;

-- Check if indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'mart' 
  AND tablename IN ('pot_params_daily', 'ce_predicted_daily')
ORDER BY tablename, indexname;
