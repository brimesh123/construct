
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, User, BarChart3, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, differenceInMinutes, parse } from 'date-fns';
import * as XLSX from 'xlsx';

interface EmployeeReportData {
  employee_id: string;
  first_name: string;
  last_name: string;
  total_hours: number;
  total_days: number;
  average_hours_per_day: number;
  total_pay: number;
  job_sites: string[];
}

function formatHourMinute(decimal: number) {
  const totalMinutes = Math.round((decimal || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

const EmployeeReports = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reportData, setReportData] = useState<EmployeeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [employeeRates, setEmployeeRates] = useState<{ regular_rate: number; overtime_rate: number }>({ regular_rate: 0, overtime_rate: 0 });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      generateEmployeeReport();
    }
  }, [selectedEmployee, dateRange]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .order('last_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch employees');
      console.error('Error:', error);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    
    switch (dateRange) {
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last3Months':
        return { start: subMonths(today, 3), end: today };
      case 'custom':
        return { start: customStart ? new Date(customStart) : startOfMonth(today), end: customEnd ? new Date(customEnd) : endOfMonth(today) };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  };

  const generateEmployeeReport = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const { data: attendance, error } = await supabase
        .from('attendance')
        .select(`
          *,
          job_sites!inner(name)
        `)
        .eq('employee_id', selectedEmployee)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      if (error) throw error;

      setAttendanceRows(attendance || []);

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('first_name, last_name, regular_rate, overtime_rate')
        .eq('id', selectedEmployee)
        .single();

      if (empError) throw empError;

      setEmployeeRates({ regular_rate: employee.regular_rate || 0, overtime_rate: employee.overtime_rate || 0 });

      // Calculate totals
      const totalHours = attendance?.reduce((sum, record) => sum + (record.shift_hours || 0), 0) || 0;
      const totalDays = new Set(attendance?.map(record => record.date)).size;
      const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

      // Calculate pay
      const regularRate = employee.regular_rate || 0;
      const overtimeRate = employee.overtime_rate || 0;
      let totalPay = 0;

      attendance?.forEach(record => {
        const hours = record.shift_hours || 0;
        let regularHours = 0;
        let overtimeHours = 0;
        if (hours > 8) {
          regularHours = 8;
          overtimeHours = hours - 8;
        } else {
          regularHours = hours;
          overtimeHours = 0;
        }
        totalPay += (regularHours * regularRate) + (overtimeHours * overtimeRate);
      });

      // Get unique job sites
      const jobSites = [...new Set(attendance?.map(record => record.job_sites.name))];

      const reportData: EmployeeReportData = {
        employee_id: selectedEmployee,
        first_name: employee.first_name,
        last_name: employee.last_name,
        total_hours: totalHours,
        total_days: totalDays,
        average_hours_per_day: averageHoursPerDay,
        total_pay: totalPay,
        job_sites: jobSites,
      };

      setReportData(reportData);
      toast.success('Employee report generated successfully');
    } catch (error: any) {
      toast.error('Failed to generate employee report');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;
    const { start, end } = getDateRange();
    // Detailed attendance export
    const detailedRows = attendanceRows.map(row => {
      let shiftHoursDec = 0;
      try {
        const start = parse(row.start_time, 'HH:mm:ss', new Date());
        const end = parse(row.end_time, 'HH:mm:ss', new Date());
        const diffMin = differenceInMinutes(end, start);
        shiftHoursDec = diffMin / 60;
      } catch {}
      const hourDeductDec = (Number(row.minute_deduct) || 0) / 60;
      const totalHoursDec = Math.max(shiftHoursDec - hourDeductDec, 0);
      let regularHoursDec = 0;
      let overtimeHoursDec = 0;
      if (totalHoursDec > 8) {
        regularHoursDec = 8;
        overtimeHoursDec = totalHoursDec - 8;
      } else {
        regularHoursDec = totalHoursDec;
        overtimeHoursDec = 0;
      }
      const regularRate = employeeRates.regular_rate;
      const overtimeRate = employeeRates.overtime_rate;
      const regularPay = regularHoursDec * regularRate;
      const overtimePay = overtimeHoursDec * overtimeRate;
      const totalPay = regularPay + overtimePay;
      return {
        'Date': row.date,
        'Job Site': row.job_sites?.name || '-',
        'Start Time': row.start_time || '-',
        'End Time': row.end_time || '-',
        'Shift Hours': formatHourMinute(shiftHoursDec),
        'Hour Deduct': formatHourMinute(hourDeductDec),
        'Total Hours': formatHourMinute(totalHoursDec),
        'Regular Hours': formatHourMinute(regularHoursDec),
        'Overtime Hours': formatHourMinute(overtimeHoursDec),
        'Regular Pay': `$${regularPay.toFixed(2)}`,
        'Overtime Pay': `$${overtimePay.toFixed(2)}`,
        'Total Pay': `$${totalPay.toFixed(2)}`,
      };
    });
    const attendanceSheet = XLSX.utils.json_to_sheet(detailedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance Details');
    const fileName = `employee_attendance_${reportData.first_name}_${reportData.last_name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Excel file downloaded successfully');
  };

  return (
    <Card className="border-2 border-blue-300 shadow-xl">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col min-w-[220px]">
              <Label htmlFor="employee-select" className="text-blue-800 font-semibold mb-1">Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="border-2 border-blue-300 focus:border-blue-500 rounded-lg min-w-[200px]">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-300 rounded-lg shadow-lg z-50">
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id} className="hover:bg-blue-50">
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-[160px]">
              <Label htmlFor="date-range" className="text-blue-800 font-semibold mb-1">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-2 border-blue-300 focus:border-blue-500 rounded-lg min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-300 rounded-lg shadow-lg z-50">
                  <SelectItem value="thisMonth" className="hover:bg-blue-50">This Month</SelectItem>
                  <SelectItem value="lastMonth" className="hover:bg-blue-50">Last Month</SelectItem>
                  <SelectItem value="last3Months" className="hover:bg-blue-50">Last 3 Months</SelectItem>
                  <SelectItem value="custom" className="hover:bg-blue-50">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <>
                <div className="flex flex-col min-w-[140px]">
                  <Label className="text-blue-700 text-xs mb-1">Start</Label>
                  <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="border-2 border-blue-200 min-w-[120px]" placeholder="dd-mm-yyyy" />
                </div>
                <div className="flex flex-col min-w-[140px]">
                  <Label className="text-blue-700 text-xs mb-1">End</Label>
                  <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="border-2 border-blue-200 min-w-[120px]" placeholder="dd-mm-yyyy" />
                </div>
              </>
            )}
            <div className="flex flex-col justify-end min-w-[150px]">
              <Button 
                onClick={exportToExcel} 
                disabled={!reportData}
                variant="outline" 
                className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50 rounded-lg font-semibold"
              >
                <Upload className="h-5 w-5 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {reportData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-700">{reportData.total_hours.toFixed(2)}</div>
                  <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-700">{reportData.total_days}</div>
                  <p className="text-sm text-blue-600 font-medium">Days Worked</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-700">{reportData.average_hours_per_day.toFixed(2)}</div>
                  <p className="text-sm text-blue-600 font-medium">Avg Hours/Day</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-700">${reportData.total_pay.toFixed(2)}</div>
                  <p className="text-sm text-green-600 font-medium">Total Pay</p>
                </CardContent>
              </Card>
            </div>

            {attendanceRows.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Daily Attendance</h3>
                <div className="overflow-x-auto">
                  <table style={{ minWidth: '1100px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead style={{ background: 'linear-gradient(to right, #EFF6FF, #E0E7FF)' }}>
                      <tr>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Date</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Job Site</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Start Time</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>End Time</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Shift Hours</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Hour Deduct</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total Hours</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Regular Hours</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Overtime Hours</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#059669', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Regular Pay</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#059669', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Overtime Pay</th>
                        <th style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#16a34a', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRows.map((row, idx) => {
                        let shiftHoursDec = 0;
                        try {
                          const start = parse(row.start_time, 'HH:mm:ss', new Date());
                          const end = parse(row.end_time, 'HH:mm:ss', new Date());
                          const diffMin = differenceInMinutes(end, start);
                          shiftHoursDec = diffMin / 60;
                        } catch {}
                        const hourDeductDec = (Number(row.minute_deduct) || 0) / 60;
                        const totalHoursDec = Math.max(shiftHoursDec - hourDeductDec, 0);
                        let regularHoursDec = 0;
                        let overtimeHoursDec = 0;
                        if (totalHoursDec > 8) {
                          regularHoursDec = 8;
                          overtimeHoursDec = totalHoursDec - 8;
                        } else {
                          regularHoursDec = totalHoursDec;
                          overtimeHoursDec = 0;
                        }
                        const regularRate = employeeRates.regular_rate;
                        const overtimeRate = employeeRates.overtime_rate;
                        const regularPay = regularHoursDec * regularRate;
                        const overtimePay = overtimeHoursDec * overtimeRate;
                        const totalPay = regularPay + overtimePay;
                        return (
                          <tr key={row.id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#F1F5F9', height: '32px' }}>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{row.date}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{row.job_sites?.name || '-'}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{row.start_time || '-'}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{row.end_time || '-'}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{formatHourMinute(shiftHoursDec)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{formatHourMinute(hourDeductDec)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{formatHourMinute(totalHoursDec)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{formatHourMinute(regularHoursDec)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#1e40af', whiteSpace: 'nowrap' }}>{formatHourMinute(overtimeHoursDec)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#059669', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>${regularPay.toFixed(2)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#059669', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>${overtimePay.toFixed(2)}</td>
                            <td style={{ padding: '4px 6px', border: '1px solid #60a5fa', color: '#16a34a', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>${totalPay.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Job Sites Worked</h3>
              <div className="flex flex-wrap gap-2">
                {reportData.job_sites.map((site, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {site}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {!selectedEmployee && !loading && (
          <div className="text-center py-12 text-blue-600">
            <User className="h-16 w-16 mx-auto mb-4 text-blue-400" />
            <p className="text-lg font-medium">Please select an employee to generate their report.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-blue-600 font-medium">Generating employee report...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeReports;
