
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Calendar, BarChart3 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';

interface WeeklyData {
  employee_id: string;
  first_name: string;
  last_name: string;
  total_hours: number;
  total_days: number;
  total_pay: number;
  week_start: string;
  week_end: string;
}

const WeeklyReport = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const today = new Date();
    return format(startOfWeek(today), 'yyyy-MM-dd');
  });
  const [dateFilter, setDateFilter] = useState('custom');

  const dateFilterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'custom', label: 'Custom Week' },
  ];

  const getDateRange = (filter: string) => {
    const today = new Date();
    
    switch (filter) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'last7days':
        return { start: subDays(today, 6), end: today };
      case 'last30days':
        return { start: subDays(today, 29), end: today };
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
      default:
        const weekStart = new Date(selectedWeek);
        return { start: weekStart, end: endOfWeek(weekStart) };
    }
  };

  useEffect(() => {
    if (selectedWeek || dateFilter !== 'custom') {
      fetchWeeklyData();
    }
  }, [selectedWeek, dateFilter]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(dateFilter);

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(id, first_name, last_name, regular_rate, overtime_rate)
        `)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Group by employee and calculate totals (per-day overtime logic)
      const weeklyTotals = (attendance || []).reduce((acc: any, record: any) => {
        const employeeId = record.employee_id;
        const employee = record.employees;
        if (!acc[employeeId]) {
          acc[employeeId] = {
            employee_id: employeeId,
            first_name: employee.first_name,
            last_name: employee.last_name,
            total_hours: 0,
            total_days: 0,
            total_pay: 0,
            week_start: format(start, 'yyyy-MM-dd'),
            week_end: format(end, 'yyyy-MM-dd'),
            days: new Set(),
            regular_rate: employee.regular_rate || 0,
            overtime_rate: employee.overtime_rate || 0,
            regular_hours: 0,
            overtime_hours: 0,
            regular_pay: 0,
            overtime_pay: 0,
          };
        }
        const shiftHours = record.shift_hours || 0;
        let regularHours = 0;
        let overtimeHours = 0;
        if (shiftHours > 8) {
          regularHours = 8;
          overtimeHours = shiftHours - 8;
        } else {
          regularHours = shiftHours;
          overtimeHours = 0;
        }
        const regularPay = regularHours * acc[employeeId].regular_rate;
        const overtimePay = overtimeHours * acc[employeeId].overtime_rate;
        acc[employeeId].total_hours += shiftHours;
        acc[employeeId].days.add(record.date);
        acc[employeeId].regular_hours += regularHours;
        acc[employeeId].overtime_hours += overtimeHours;
        acc[employeeId].regular_pay += regularPay;
        acc[employeeId].overtime_pay += overtimePay;
        acc[employeeId].total_pay += regularPay + overtimePay;
        return acc;
      }, {});

      // Convert to array for display
      const weeklyArray = Object.values(weeklyTotals).map((employee: any) => {
        return {
          ...employee,
          total_days: employee.days.size,
        };
      });

      setWeeklyData(weeklyArray);
      toast.success('Weekly report generated successfully');
    } catch (error: any) {
      toast.error('Failed to generate weekly report');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const { start, end } = getDateRange(dateFilter);
    const worksheet = XLSX.utils.json_to_sheet(
      weeklyData.map(record => ({
        'Employee': `${record.first_name} ${record.last_name}`,
        'Period': `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`,
        'Total Hours': record.total_hours?.toFixed(2) || '0.00',
        'Days Worked': record.total_days,
        'Total Pay': `$${record.total_pay?.toFixed(2) || '0.00'}`,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Report');
    
    const fileName = `weekly_report_${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Excel file downloaded successfully');
  };

  const totals = useMemo(() => {
    return weeklyData.reduce((acc, record) => ({
      totalHours: acc.totalHours + record.total_hours,
      totalPay: acc.totalPay + record.total_pay,
    }), { totalHours: 0, totalPay: 0 });
  }, [weeklyData]);

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value === 'custom') {
      const today = new Date();
      setSelectedWeek(format(startOfWeek(today), 'yyyy-MM-dd'));
    }
  };

  const { start, end } = getDateRange(dateFilter);

  return (
    <Card className="border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7" />
          Weekly Report
        </CardTitle>
        <p className="text-orange-100">
          Weekly summary of employee hours and payroll
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <Label htmlFor="date-filter" className="text-orange-800 font-semibold">Date Filter</Label>
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="border-2 border-orange-300 focus:border-orange-500 rounded-lg">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-orange-300 rounded-lg shadow-lg z-50">
                {dateFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-orange-50">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dateFilter === 'custom' && (
            <div>
              <Label htmlFor="week-select" className="text-orange-800 font-semibold">Select Week</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-orange-500" />
                <Input
                  id="week-select"
                  type="date"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="pl-12 border-2 border-orange-300 focus:border-orange-500 rounded-lg"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-end">
            <Button 
              onClick={exportToExcel} 
              variant="outline" 
              className="border-2 border-orange-500 text-orange-700 hover:bg-orange-50 rounded-lg font-semibold"
            >
              <Upload className="h-5 w-5 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-orange-600 font-medium">
            Period: {format(start, 'MMM dd, yyyy')} - {format(end, 'MMM dd, yyyy')}
          </p>
        </div>

        {weeklyData.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-700">{weeklyData.length}</div>
                  <p className="text-sm text-orange-600 font-medium">Employees</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-700">{totals.totalHours.toFixed(2)}</div>
                  <p className="text-sm text-orange-600 font-medium">Total Hours</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-700">${totals.totalPay.toFixed(2)}</div>
                  <p className="text-sm text-green-600 font-medium">Total Payroll</p>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto w-full max-w-full" style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: '700px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
                  <tr>
                    <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Employee</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total Hours</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Days Worked</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#16a34a', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Total Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((record, idx) => (
                    <tr key={record.employee_id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', fontSize: '0.95rem', height: '32px' }}>
                      <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{record.first_name} {record.last_name}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{record.total_hours?.toFixed(2) || '0.00'}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{record.total_days}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#16a34a', background: '#dcfce7', fontWeight: 'bold', whiteSpace: 'nowrap' }}>${record.total_pay?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {weeklyData.length === 0 && !loading && (
          <div className="text-center py-12 text-orange-600">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-orange-400" />
            <p className="text-lg font-medium">No data found for the selected period.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-orange-600 font-medium">Generating weekly report...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyReport;
