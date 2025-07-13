-- Drop the existing view first
DROP VIEW IF EXISTS public.pay_report_view;

-- Create a corrected view that joins attendance with employees, job_sites, and rate_cards
-- without causing infinite recursion
CREATE VIEW public.pay_report_view AS
SELECT 
    a.id as attendance_id,
    a.employee_id,
    a.jobsite_id,
    a.date,
    a.start_time,
    a.end_time,
    a.minute_deduct,
    a.shift_hours,
    e.first_name,
    e.last_name,
    js.name as jobsite_name,
    -- Get the rate card that's valid for the attendance date
    rc.regular_pay_rate,
    rc.overtime_pay_rate,
    -- Calculate regular and overtime hours based on 40-hour weekly limit
    CASE 
        WHEN a.shift_hours <= 8 THEN a.shift_hours
        ELSE 8
    END as regular_hours,
    CASE 
        WHEN a.shift_hours > 8 THEN a.shift_hours - 8
        ELSE 0
    END as overtime_hours,
    -- Calculate pay amounts
    (CASE 
        WHEN a.shift_hours <= 8 THEN a.shift_hours
        ELSE 8
    END * rc.regular_pay_rate) as regular_pay,
    (CASE 
        WHEN a.shift_hours > 8 THEN (a.shift_hours - 8) * rc.overtime_pay_rate
        ELSE 0
    END) as overtime_pay,
    -- Total pay
    ((CASE 
        WHEN a.shift_hours <= 8 THEN a.shift_hours
        ELSE 8
    END * rc.regular_pay_rate) + 
    (CASE 
        WHEN a.shift_hours > 8 THEN (a.shift_hours - 8) * rc.overtime_pay_rate
        ELSE 0
    END)) as total_pay
FROM attendance a
JOIN employees e ON a.employee_id = e.id
JOIN job_sites js ON a.jobsite_id = js.id
LEFT JOIN rate_cards rc ON rc.employee_id = a.employee_id 
    AND a.date >= rc.valid_from 
    AND (rc.valid_to IS NULL OR a.date <= rc.valid_to);