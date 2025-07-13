
-- Create enums for employee types and job site status
CREATE TYPE employee_type AS ENUM ('Employee', 'Foreman', 'PM');
CREATE TYPE jobsite_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled');

-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    type employee_type NOT NULL DEFAULT 'Employee',
    mobile_number TEXT,
    email TEXT UNIQUE,
    sst_number TEXT,
    sst_expire_date DATE,
    sst_image_url TEXT,
    regular_rate DECIMAL(10,2) DEFAULT 0.00,
    overtime_rate DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job sites table
CREATE TABLE job_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    assigned_pm UUID REFERENCES employees(id),
    start_date DATE,
    end_date DATE,
    status jobsite_status DEFAULT 'Planning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    jobsite_id UUID NOT NULL REFERENCES job_sites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    minute_deduct INTEGER DEFAULT 0,
    shift_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        ROUND(
            (EXTRACT(EPOCH FROM end_time) - EXTRACT(EPOCH FROM start_time)) / 3600.0 - (minute_deduct / 60.0),
            2
        )
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, jobsite_id, date)
);

-- Create rate cards table
CREATE TABLE rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL,
    valid_to DATE,
    regular_pay_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    overtime_pay_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user roles table for authentication
CREATE TYPE app_role AS ENUM ('admin', 'pm', 'employee');

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'employee',
    employee_id UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Create storage bucket for SST images
INSERT INTO storage.buckets (id, name, public) VALUES ('sst-images', 'sst-images', true);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for employees table
CREATE POLICY "Admins and PMs can view all employees" ON employees
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Employees can view their own record" ON employees
    FOR SELECT TO authenticated
    USING (id IN (SELECT employee_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage employees" ON employees
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for job_sites table
CREATE POLICY "Admins and PMs can view all job sites" ON job_sites
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Admins can manage job sites" ON job_sites
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance table
CREATE POLICY "Users can view relevant attendance" ON attendance
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'pm') OR
        employee_id IN (SELECT employee_id FROM user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins and PMs can manage attendance" ON attendance
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pm'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pm'));

-- RLS Policies for rate_cards table
CREATE POLICY "Users can view relevant rate cards" ON rate_cards
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'pm') OR
        employee_id IN (SELECT employee_id FROM user_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage rate cards" ON rate_cards
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage policies for SST images
CREATE POLICY "Anyone can view SST images" ON storage.objects
    FOR SELECT USING (bucket_id = 'sst-images');

CREATE POLICY "Authenticated users can upload SST images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'sst-images');

CREATE POLICY "Admins can manage SST images" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'sst-images' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'sst-images' AND public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee');
    RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_employees_type ON employees(type);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_job_sites_status ON job_sites(status);
CREATE INDEX idx_job_sites_assigned_pm ON job_sites(assigned_pm);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_attendance_jobsite_date ON attendance(jobsite_id, date);
CREATE INDEX idx_rate_cards_employee_dates ON rate_cards(employee_id, valid_from, valid_to);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Create view for pay report calculations
CREATE OR REPLACE VIEW pay_report_view AS
SELECT 
    a.id as attendance_id,
    a.employee_id,
    e.first_name,
    e.last_name,
    a.jobsite_id,
    js.name as jobsite_name,
    a.date,
    a.start_time,
    a.end_time,
    a.minute_deduct,
    a.shift_hours,
    rc.regular_pay_rate,
    rc.overtime_pay_rate,
    LEAST(a.shift_hours, 8) as regular_hours,
    GREATEST(a.shift_hours - 8, 0) as overtime_hours,
    ROUND(LEAST(a.shift_hours, 8) * rc.regular_pay_rate, 2) as regular_pay,
    ROUND(GREATEST(a.shift_hours - 8, 0) * rc.overtime_pay_rate, 2) as overtime_pay,
    ROUND(
        (LEAST(a.shift_hours, 8) * rc.regular_pay_rate) + 
        (GREATEST(a.shift_hours - 8, 0) * rc.overtime_pay_rate), 
        2
    ) as total_pay
FROM attendance a
JOIN employees e ON a.employee_id = e.id
JOIN job_sites js ON a.jobsite_id = js.id
LEFT JOIN rate_cards rc ON a.employee_id = rc.employee_id 
    AND a.date >= rc.valid_from 
    AND (rc.valid_to IS NULL OR a.date <= rc.valid_to)
ORDER BY a.date DESC, e.last_name, e.first_name;
