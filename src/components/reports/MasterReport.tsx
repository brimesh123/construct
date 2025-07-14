
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Download, Calendar, BarChart3, Users, MapPin, DollarSign } from 'lucide-react';
import { format, differenceInMinutes, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

interface MasterReportData {
  employee_id: string;
  first_name: string;
  last_name: string;
  employee_type: string;
  jobsite_name: string;
  date: string;
  shift_start: string;
  shift_end: string;
  shift_hours: number;
  minute_deduct: number;
  total_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
  regular_pay_rate: number;
  overtime_pay_rate: number;
  regular_hours: number;
  overtime_hours: number;
}

interface Summary {
  totalEmployees: number;
  totalJobsites: number;
  totalHours: number;
  totalPayroll: number;
}

function formatHourMinute(decimal: number) {
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.abs(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

const MasterReport = () => {
  const [masterData, setMasterData] = useState<MasterReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJobsite, setSelectedJobsite] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');
  const [jobsites, setJobsites] = useState<any[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalEmployees: 0,
    totalJobsites: 0,
    totalHours: 0,
    totalPayroll: 0,
  });
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [jobsiteOptions, setJobsiteOptions] = useState<any[]>([]);
  const [selectedJobsites, setSelectedJobsites] = useState<string[]>([]);

  useEffect(() => {
    fetchJobsites();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchMasterData();
    }
  }, [startDate, endDate]);

  // Fetch all employees for the multi-select
  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .order('last_name')
      .then(({ data }) => setEmployeeOptions(data || []));
  }, []);

  // Fetch all jobsites for the multi-select
  useEffect(() => {
    supabase
      .from('job_sites')
      .select('id, name')
      .order('name')
      .then(({ data }) => setJobsiteOptions(data || []));
  }, []);

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

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(id, first_name, last_name, type, regular_rate, overtime_rate),
          job_sites!inner(id, name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Map each attendance record to a row
      const masterArray = (attendance || []).map((record: any) => {
        const employee = record.employees;
        const jobsite = record.job_sites;
        // Calculate shift_hours from start and end time
        let shift_hours = 0;
        try {
          const start = parse(record.start_time, 'HH:mm:ss', new Date());
          const end = parse(record.end_time, 'HH:mm:ss', new Date());
          const diffMin = differenceInMinutes(end, start);
          shift_hours = diffMin / 60;
        } catch {}
        const total_hours = Math.max(shift_hours - ((record.minute_deduct || 0) / 60), 0);
        const regular_pay_rate = employee.regular_rate || 0;
        const overtime_pay_rate = employee.overtime_rate || 0;
        const regular_hours = Math.min(total_hours, 8);
        const overtime_hours = Math.max(total_hours - 8, 0);
        const regular_pay = regular_hours * regular_pay_rate;
        const overtime_pay = overtime_hours * overtime_pay_rate;
        const total_pay = regular_pay + overtime_pay;
        return {
            employee_id: record.employee_id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            employee_type: employee.type,
            jobsite_name: jobsite.name,
          date: record.date,
          shift_start: record.start_time,
          shift_end: record.end_time,
          shift_hours,
          minute_deduct: record.minute_deduct || 0,
          total_hours,
          regular_pay,
          overtime_pay,
          total_pay,
          regular_pay_rate,
          overtime_pay_rate,
          regular_hours,
          overtime_hours,
        };
      });

      setMasterData(masterArray);
      const uniqueEmployees = new Set(masterArray.map(item => item.employee_id));
      const uniqueJobsites = new Set(masterArray.map(item => item.jobsite_name));
      setSummary({
        totalEmployees: uniqueEmployees.size,
        totalJobsites: uniqueJobsites.size,
        totalHours: masterArray.reduce((sum, item) => sum + item.total_hours, 0),
        totalPayroll: masterArray.reduce((sum, item) => sum + item.total_pay, 0),
      });
      toast.success('Master report generated successfully');
    } catch (error: any) {
      toast.error('Failed to generate master report');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // In filteredData, filter by selectedEmployees and selectedJobsites if any
  const filteredData = useMemo(() => {
    let data = masterData;
    if (selectedEmployees.length > 0) {
      data = data.filter(record => selectedEmployees.includes(record.employee_id));
    }
    if (selectedJobsites.length > 0) {
      data = data.filter(record => selectedJobsites.includes(jobsites.find(js => js.name === record.jobsite_name)?.id));
    }
    return data;
  }, [masterData, selectedEmployees, selectedJobsites, jobsites]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map(record => ({
        'Employee': `${record.first_name} ${record.last_name}`,
        'Job Site': record.jobsite_name,
        'Date': record.date,
        'Shift Start': record.shift_start,
        'Shift End': record.shift_end,
        'Shift Total Hours': formatHourMinute(record.shift_hours),
        'Minute Deduct (hr)': formatHourMinute(record.minute_deduct / 60),
        'Total Hours': formatHourMinute(record.total_hours),
        'Regular Pay': `$${record.regular_pay?.toFixed(2) || '0.00'}`,
        'Overtime Pay': `$${record.overtime_pay?.toFixed(2) || '0.00'}`,
        'Total Pay': `$${record.total_pay?.toFixed(2) || '0.00'}`,
        'Regular Pay Rate': `$${record.regular_pay_rate?.toFixed(2) || '0.00'}`,
        'Overtime Pay Rate': `$${record.overtime_pay_rate?.toFixed(2) || '0.00'}`,
        'Regular Hours': formatHourMinute(record.regular_hours),
        'Overtime Hours': formatHourMinute(record.overtime_hours),
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Report');
    
    const fileName = `master_report_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success('Excel file downloaded successfully');
  };

  const employeeTypes = ['Employee', 'Foreman', 'PM'];

  const columns = [
    { key: 'employee', label: 'Employee', render: (row: MasterReportData) => `${row.first_name} ${row.last_name}` },
    { key: 'employee_type', label: 'Type', render: (row: MasterReportData) => row.employee_type },
    { key: 'jobsite_name', label: 'Job Site', render: (row: MasterReportData) => row.jobsite_name },
    { key: 'date', label: 'Date', render: (row: MasterReportData) => row.date },
    { key: 'shift_start', label: 'Start', render: (row: MasterReportData) => row.shift_start },
    { key: 'shift_end', label: 'End', render: (row: MasterReportData) => row.shift_end },
    { key: 'shift_hours', label: 'Shift', render: (row: MasterReportData) => formatHourMinute(row.shift_hours) },
    { key: 'minute_deduct', label: 'Deduct', render: (row: MasterReportData) => formatHourMinute(row.minute_deduct / 60) },
    { key: 'total_hours', label: 'Total', render: (row: MasterReportData) => formatHourMinute(row.total_hours) },
    { key: 'regular_hours', label: 'Reg Hr', render: (row: MasterReportData) => formatHourMinute(row.regular_hours) },
    { key: 'overtime_hours', label: 'OT Hr', render: (row: MasterReportData) => formatHourMinute(row.overtime_hours) },
    { key: 'regular_pay_rate', label: 'Reg $', render: (row: MasterReportData) => `$${row.regular_pay_rate?.toFixed(2) || '0.00'}` },
    { key: 'overtime_pay_rate', label: 'OT $', render: (row: MasterReportData) => `$${row.overtime_pay_rate?.toFixed(2) || '0.00'}` },
    { key: 'regular_pay', label: 'Reg Pay', render: (row: MasterReportData) => `$${row.regular_pay?.toFixed(2) || '0.00'}` },
    { key: 'overtime_pay', label: 'OT Pay', render: (row: MasterReportData) => `$${row.overtime_pay?.toFixed(2) || '0.00'}` },
    { key: 'total_pay', label: 'Total Pay', render: (row: MasterReportData) => `$${row.total_pay?.toFixed(2) || '0.00'}` },
  ];

  return (
    <Card className="border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7" />
          Master Report
        </CardTitle>
        <p className="text-orange-100">
          Complete overview of all employees across all job sites
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <Label htmlFor="start-date" className="text-orange-800 font-semibold">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-orange-500" />
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-12 border-2 border-orange-300 focus:border-orange-500 rounded-lg"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="end-date" className="text-orange-800 font-semibold">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-orange-500" />
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-12 border-2 border-orange-300 focus:border-orange-500 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Employee & Jobsite Multi-Select Searchable Dropdowns in a row */}
        <div className="w-full max-w-full flex flex-wrap gap-4 items-center mb-4">
          {/* Employee Multi-Select */}
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px] bg-white text-orange-800"
                >
                  {selectedEmployees.length === 0 && <span className="text-gray-400">Search employees...</span>}
                  {selectedEmployees.length > 0 && (
                    <span className="truncate text-left">
                      {(() => {
                        const names = employeeOptions
                          .filter(e => selectedEmployees.includes(e.id))
                          .map(e => `${e.first_name} ${e.last_name}`);
                        if (names.length <= 3) return names.join(', ');
                        return names.slice(0, 2).join(', ') + `, +${names.length - 2} more`;
                      })()}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[380px] max-h-96 overflow-y-auto">
                <Command>
                  <CommandInput placeholder="Search employees..." className="h-12 text-base px-4" />
                  <CommandList>
                    {employeeOptions.map(emp => {
                      const checked = selectedEmployees.includes(emp.id);
                      return (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.first_name} ${emp.last_name}`}
                          onSelect={() => {
                            setSelectedEmployees(sel =>
                              checked
                                ? sel.filter(id => id !== emp.id)
                                : [...sel, emp.id]
                            );
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-base cursor-pointer hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="form-checkbox h-5 w-5 accent-primary rounded border-gray-300"
                            tabIndex={-1}
                          />
                          <span>{emp.first_name} {emp.last_name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* Jobsite Multi-Select */}
          <div className="flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px] bg-white text-orange-800"
                >
                  {selectedJobsites.length === 0 && <span className="text-gray-400">Search job sites...</span>}
                  {selectedJobsites.length > 0 && (
                    <span className="truncate text-left">
                      {(() => {
                        const names = jobsiteOptions
                          .filter(j => selectedJobsites.includes(j.id))
                          .map(j => j.name);
                        if (names.length <= 3) return names.join(', ');
                        return names.slice(0, 2).join(', ') + `, +${names.length - 2} more`;
                      })()}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[380px] max-h-96 overflow-y-auto">
                <Command>
                  <CommandInput placeholder="Search job sites..." className="h-12 text-base px-4" />
                  <CommandList>
                    {jobsiteOptions.map(js => {
                      const checked = selectedJobsites.includes(js.id);
                      return (
                        <CommandItem
                          key={js.id}
                          value={js.name}
                          onSelect={() => {
                            setSelectedJobsites(sel =>
                              checked
                                ? sel.filter(id => id !== js.id)
                                : [...sel, js.id]
                            );
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-base cursor-pointer hover:bg-accent"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                            className="form-checkbox h-5 w-5 accent-primary rounded border-gray-300"
                            tabIndex={-1}
                          />
                          <span>{js.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* Export Excel Button */}
          <div className="flex-shrink-0 mt-2 md:mt-0 md:ml-4">
            <div className="relative group">
              <Button
                size="icon"
                variant="outline"
                className="border-2 border-orange-500 text-orange-700 hover:bg-orange-50 rounded-full p-2"
                onClick={exportToExcel}
                aria-label="Export to Excel"
              >
                <Download className="h-5 w-5" />
              </Button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-max px-2 py-1 rounded bg-orange-700 text-white text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                Export Excel
              </div>
            </div>
          </div>
        </div>

        {masterData.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              
              
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full mb-6">
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold text-orange-700">{summary.totalEmployees}</div>
                      <p className="text-sm text-orange-600 font-medium">Employees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold text-orange-700">{summary.totalJobsites}</div>
                      <p className="text-sm text-orange-600 font-medium">Job Sites</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                    <div>
                      <div className="text-2xl font-bold text-orange-700">{summary.totalHours.toFixed(2)}</div>
                      <p className="text-sm text-orange-600 font-medium">Total Hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-orange-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-green-700">${summary.totalPayroll.toFixed(2)}</div>
                      <p className="text-sm text-green-600 font-medium">Total Payroll</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div style={{ overflowX: 'auto' }} className="w-full max-w-full">
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
                    <tr key={row.employee_id + row.date} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', fontSize: '0.95rem', height: '32px' }}>
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

            {filteredData.length === 0 && masterData.length > 0 && (
              <div className="text-center py-8 text-orange-600">
                No records match your filter criteria.
              </div>
            )}
          </>
        )}

        {masterData.length === 0 && !loading && startDate && endDate && (
          <div className="text-center py-12 text-orange-600">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-orange-400" />
            <p className="text-lg font-medium">No data found for the selected date range.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-orange-600 font-medium">Generating master report...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterReport;
