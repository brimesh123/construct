
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Calendar, Search, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PayrollData {
  attendance_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  jobsite_name: string;
  date: string;
  shift_hours: number;
  regular_hours: number;
  overtime_hours: number;
  regular_rate: number;
  overtime_rate: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
}

interface JobSite {
  id: string;
  name: string;
}

// Format decimal hours as h:mm (like MasterReport)
function formatHourMinute(decimal: number) {
  const totalMinutes = Math.round((decimal || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

const PayrollReport = () => {
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [jobsites, setJobsites] = useState<JobSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedJobsite, setSelectedJobsite] = useState('');
  const [totals, setTotals] = useState({
    totalHours: 0,
    totalRegularPay: 0,
    totalOvertimePay: 0,
    totalPay: 0,
  });

  useEffect(() => {
    fetchJobsites();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchPayrollData();
    }
  }, [startDate, endDate]);

  const fetchJobsites = async () => {
    try {
      const { data, error } = await supabase
        .from('job_sites')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setJobsites(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch job sites');
    }
  };

  const calculatePayroll = (attendance: any[], employees: any[], jobsites: any[]) => {
    return attendance.map(record => {
      const employee = employees.find(emp => emp.id === record.employee_id);
      const jobsite = jobsites.find(js => js.id === record.jobsite_id);
      
      const shiftHours = record.shift_hours || 0;
      let regularHours = 0;
      let overtimeHours = 0;
      let regularPay = 0;
      let overtimePay = 0;

      // Overtime logic: per day, hours over 8 are overtime
      if (shiftHours > 8) {
        regularHours = 8;
        overtimeHours = shiftHours - 8;
      } else {
        regularHours = shiftHours;
        overtimeHours = 0;
      }

      // Calculate pay
      const regularRate = employee?.regular_rate || 0;
      const overtimeRate = employee?.overtime_rate || 0;
      
      regularPay = regularHours * regularRate;
      overtimePay = overtimeHours * overtimeRate;

      return {
        attendance_id: record.id,
        employee_id: record.employee_id,
        first_name: employee?.first_name || '',
        last_name: employee?.last_name || '',
        jobsite_name: jobsite?.name || '',
        date: record.date,
        shift_hours: shiftHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        regular_rate: regularRate,
        overtime_rate: overtimeRate,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        total_pay: regularPay + overtimePay,
      };
    });
  };

  const fetchPayrollData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      // Fetch attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Fetch employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*');

      if (employeesError) throw employeesError;

      // Fetch jobsites
      const { data: jobsites, error: jobsitesError } = await supabase
        .from('job_sites')
        .select('*');

      if (jobsitesError) throw jobsitesError;

      // Calculate payroll data
      const calculatedPayroll = calculatePayroll(attendance || [], employees || [], jobsites || []);
      setPayrollData(calculatedPayroll);
      
      toast.success('Payroll report generated successfully');
    } catch (error: any) {
      toast.error('Failed to generate payroll report');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return payrollData.filter(record => {
      const employeeMatch = searchEmployee === '' || 
        `${record.first_name} ${record.last_name}`.toLowerCase().includes(searchEmployee.toLowerCase());
      
      const jobsiteMatch = selectedJobsite === '' || selectedJobsite === 'all' || 
        record.jobsite_name === jobsites.find(js => js.id === selectedJobsite)?.name;

      return employeeMatch && jobsiteMatch;
    });
  }, [payrollData, searchEmployee, selectedJobsite, jobsites]);

  useEffect(() => {
    // Calculate totals for filtered data
    const totalHours = filteredData.reduce((sum, record) => sum + record.shift_hours, 0);
    const totalRegularPay = filteredData.reduce((sum, record) => sum + record.regular_pay, 0);
    const totalOvertimePay = filteredData.reduce((sum, record) => sum + record.overtime_pay, 0);
    const totalPay = filteredData.reduce((sum, record) => sum + record.total_pay, 0);

    setTotals({
      totalHours,
      totalRegularPay,
      totalOvertimePay,
      totalPay,
    });
  }, [filteredData]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map(record => ({
        'Employee': `${record.first_name} ${record.last_name}`,
        'Job Site': record.jobsite_name,
        'Date': format(new Date(record.date), 'MMM dd, yyyy'),
        'Total Hours': formatHourMinute(record.shift_hours),
        'Regular Hours': formatHourMinute(record.regular_hours),
        'Overtime Hours': formatHourMinute(record.overtime_hours),
        'Regular Rate': `$${record.regular_rate?.toFixed(2) || '0.00'}`,
        'Overtime Rate': `$${record.overtime_rate?.toFixed(2) || '0.00'}`,
        'Regular Pay': `$${record.regular_pay?.toFixed(2) || '0.00'}`,
        'Overtime Pay': `$${record.overtime_pay?.toFixed(2) || '0.00'}`,
        'Total Pay': `$${record.total_pay?.toFixed(2) || '0.00'}`,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report');
    
    const fileName = `payroll_report_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Excel file downloaded successfully');
  };

  const exportToCSV = () => {
    const exportData = filteredData.map(record => ({
      'Employee': `${record.first_name} ${record.last_name}`,
      'Job Site': record.jobsite_name,
      'Date': format(new Date(record.date), 'MMM dd, yyyy'),
      'Total Hours': formatHourMinute(record.shift_hours),
      'Regular Hours': formatHourMinute(record.regular_hours),
      'Overtime Hours': formatHourMinute(record.overtime_hours),
      'Regular Rate': `$${record.regular_rate?.toFixed(2) || '0.00'}`,
      'Overtime Rate': `$${record.overtime_rate?.toFixed(2) || '0.00'}`,
      'Regular Pay': `$${record.regular_pay?.toFixed(2) || '0.00'}`,
      'Overtime Pay': `$${record.overtime_pay?.toFixed(2) || '0.00'}`,
      'Total Pay': `$${record.total_pay?.toFixed(2) || '0.00'}`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_report_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file downloaded successfully');
  };

  const columns = [
    { key: 'employee', label: 'Employee', render: (row: PayrollData) => `${row.first_name} ${row.last_name}` },
    { key: 'jobsite_name', label: 'Job Site', render: (row: PayrollData) => row.jobsite_name },
    { key: 'date', label: 'Date', render: (row: PayrollData) => format(new Date(row.date), 'MMM dd, yyyy') },
    { key: 'shift_hours', label: 'Total Hours', render: (row: PayrollData) => formatHourMinute(row.shift_hours) },
    { key: 'regular_hours', label: 'Reg Hr', render: (row: PayrollData) => formatHourMinute(row.regular_hours) },
    { key: 'overtime_hours', label: 'OT Hr', render: (row: PayrollData) => formatHourMinute(row.overtime_hours) },
    { key: 'regular_rate', label: 'Reg $', render: (row: PayrollData) => `$${row.regular_rate?.toFixed(2) || '0.00'}` },
    { key: 'overtime_rate', label: 'OT $', render: (row: PayrollData) => `$${row.overtime_rate?.toFixed(2) || '0.00'}` },
    { key: 'regular_pay', label: 'Reg Pay', render: (row: PayrollData) => `$${row.regular_pay?.toFixed(2) || '0.00'}` },
    { key: 'overtime_pay', label: 'OT Pay', render: (row: PayrollData) => `$${row.overtime_pay?.toFixed(2) || '0.00'}` },
    { key: 'total_pay', label: 'Total Pay', render: (row: PayrollData) => `$${row.total_pay?.toFixed(2) || '0.00'}` },
  ];

  return (
    <Card className="border-orange-200 shadow-lg">
     
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="start-date" className="text-orange-800 font-medium">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-orange-500" />
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 border-orange-300 focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="end-date" className="text-orange-800 font-medium">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-orange-500" />
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 border-orange-300 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {payrollData.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="search-employee" className="text-orange-800 font-medium">Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-orange-500" />
                  <Input
                    id="search-employee"
                    placeholder="Search by employee name..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="pl-10 border-orange-300 focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <Label className="text-orange-800 font-medium">Filter by Job Site</Label>
                <Select value={selectedJobsite} onValueChange={setSelectedJobsite}>
                  <SelectTrigger className="border-orange-300 focus:border-orange-500">
                    <SelectValue placeholder="All Job Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Job Sites</SelectItem>
                    {jobsites.map((jobsite) => (
                      <SelectItem key={jobsite.id} value={jobsite.id}>
                        {jobsite.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={exportToExcel} variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={exportToCSV} variant="outline" className="border-orange-500 text-orange-700 hover:bg-orange-50">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-700">{totals.totalHours.toFixed(2)}</div>
                  <p className="text-sm text-orange-600">Total Hours</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-700">${totals.totalRegularPay.toFixed(2)}</div>
                  <p className="text-sm text-green-600">Regular Pay</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-700">${totals.totalOvertimePay.toFixed(2)}</div>
                  <p className="text-sm text-blue-600">Overtime Pay</p>
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-700">${totals.totalPay.toFixed(2)}</div>
                  <p className="text-sm text-orange-600">Total Pay</p>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto w-full max-w-full" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '1100px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
                  <tr>
                    {columns.map(col => (
                      <th
                        key={col.key}
                        style={{
                          padding: '4px 6px',
                          border: '1px solid #fdba74',
                          color: col.key === 'total_pay' ? '#16a34a' : '#b45309',
                          background: col.key === 'total_pay' ? '#dcfce7' : undefined,
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={row.attendance_id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', fontSize: '0.95rem', height: '32px' }}>
                      {columns.map(col => (
                        <td
                          key={col.key}
                          style={{
                            padding: '4px 6px',
                            border: '1px solid #fdba74',
                            color: col.key === 'total_pay' ? '#16a34a' : '#92400e',
                            background: col.key === 'total_pay' ? '#dcfce7' : undefined,
                            whiteSpace: 'nowrap',
                            fontWeight: col.key === 'total_pay' ? 'bold' : undefined,
                          }}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && payrollData.length > 0 && (
              <div className="text-center py-8 text-orange-600">
                No records match your search criteria.
              </div>
            )}
          </>
        )}

        {payrollData.length === 0 && !loading && startDate && endDate && (
          <div className="text-center py-8 text-orange-600">
            No attendance data found for the selected date range.
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="mt-2 text-orange-600">Generating report...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollReport;
