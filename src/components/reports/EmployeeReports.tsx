
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
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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

const EmployeeReports = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reportData, setReportData] = useState<EmployeeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('thisMonth');

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

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('first_name, last_name, regular_rate, overtime_rate')
        .eq('id', selectedEmployee)
        .single();

      if (empError) throw empError;

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
        // Store daily hours - overtime calculated weekly (40+ hours = overtime)
        const regularHours = hours;
        const overtimeHours = 0;
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
    const worksheet = XLSX.utils.json_to_sheet([{
      'Employee': `${reportData.first_name} ${reportData.last_name}`,
      'Period': `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`,
      'Total Hours': reportData.total_hours.toFixed(2),
      'Total Days': reportData.total_days,
      'Average Hours/Day': reportData.average_hours_per_day.toFixed(2),
      'Total Pay': `$${reportData.total_pay.toFixed(2)}`,
      'Job Sites': reportData.job_sites.join(', '),
    }]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Report');
    
    const fileName = `employee_report_${reportData.first_name}_${reportData.last_name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Excel file downloaded successfully');
  };

  return (
    <Card className="border-2 border-blue-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3">
          <User className="h-7 w-7" />
          Employee Reports
        </CardTitle>
        <p className="text-blue-100">
          Detailed individual employee performance reports
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <Label htmlFor="employee-select" className="text-blue-800 font-semibold">Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="border-2 border-blue-300 focus:border-blue-500 rounded-lg">
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

          <div>
            <Label htmlFor="date-range" className="text-blue-800 font-semibold">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="border-2 border-blue-300 focus:border-blue-500 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-blue-300 rounded-lg shadow-lg z-50">
                <SelectItem value="thisMonth" className="hover:bg-blue-50">This Month</SelectItem>
                <SelectItem value="lastMonth" className="hover:bg-blue-50">Last Month</SelectItem>
                <SelectItem value="last3Months" className="hover:bg-blue-50">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
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
