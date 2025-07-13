
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

      // Group by employee and calculate totals
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
          };
        }

        const shiftHours = record.shift_hours || 0;
        acc[employeeId].total_hours += shiftHours;
        acc[employeeId].days.add(record.date);

        // Calculate pay (store daily hours, calculate overtime weekly)
        const regularRate = employee.regular_rate || 0;
        const overtimeRate = employee.overtime_rate || 0;
        
        // Store daily hours without overtime calculation yet
        acc[employeeId].total_pay += shiftHours * regularRate;

        return acc;
      }, {});

      // Convert to array and calculate weekly overtime
      const weeklyArray = Object.values(weeklyTotals).map((employee: any) => {
        const totalHours = employee.total_hours;
        const regularHours = Math.min(totalHours, 40);
        const overtimeHours = Math.max(0, totalHours - 40);
        
        // Recalculate pay with proper overtime
        const regularRate = employee.regular_rate || 0;
        const overtimeRate = employee.overtime_rate || 0;
        const correctedPay = (regularHours * regularRate) + (overtimeHours * overtimeRate);
        
        return {
          ...employee,
          total_days: employee.days.size,
          total_pay: correctedPay,
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

            <div className="overflow-x-auto border-2 border-orange-200 rounded-xl shadow-lg">
              <Table>
                <TableHeader className="bg-gradient-to-r from-orange-100 to-yellow-100">
                  <TableRow>
                    <TableHead className="text-orange-800 font-bold">Employee</TableHead>
                    <TableHead className="text-orange-800 font-bold">Total Hours</TableHead>
                    <TableHead className="text-orange-800 font-bold">Days Worked</TableHead>
                    <TableHead className="text-orange-800 font-bold">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyData.map((record) => (
                    <TableRow key={record.employee_id} className="hover:bg-orange-50 transition-colors">
                      <TableCell className="font-semibold text-orange-900">
                        {record.first_name} {record.last_name}
                      </TableCell>
                      <TableCell className="text-orange-700 font-medium">
                        {record.total_hours?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-orange-700 font-medium">
                        {record.total_days}
                      </TableCell>
                      <TableCell className="font-bold text-green-700">
                        ${record.total_pay?.toFixed(2) || '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
