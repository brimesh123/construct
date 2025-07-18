import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parse, format as formatDate } from 'date-fns';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  employee: { first_name: string; last_name: string };
}

interface JobSite {
  id: string;
  name: string;
}

const DailyAttendancePage = () => {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [selectedJobSite, setSelectedJobSite] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobSites();
  }, []);

  useEffect(() => {
    if (selectedJobSite && date) {
      fetchAttendance();
    } else {
      setAttendance([]);
    }
  }, [selectedJobSite, date]);

  const fetchJobSites = async () => {
    const { data, error } = await supabase.from('job_sites').select('id, name').order('name');
    if (!error) setJobSites(data || []);
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('id, employee_id, start_time, end_time, employees(id, first_name, last_name)')
      .eq('jobsite_id', selectedJobSite)
      .eq('date', date)
      .order('start_time');
    if (!error) {
      setAttendance(
        (data || []).map((rec: any) => ({
          ...rec,
          employee: rec.employees,
        }))
      );
    }
    setLoading(false);
  };

  // Helper to format time in 24-hour format
  const formatTime = (time: string) => {
    if (!time) return '';
    let parsed;
    try {
      parsed = parse(time, 'HH:mm:ss', new Date());
      if (isNaN(parsed.getTime())) {
        parsed = parse(time, 'HH:mm', new Date());
      }
    } catch {
      return time;
    }
    // Format as HH:mm (24-hour)
    return formatDate(parsed, 'HH:mm');
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      attendance.map(rec => ({
        'Name': `${rec.employee?.first_name || ''} ${rec.employee?.last_name || ''}`.trim(),
        'Time In': formatTime(rec.start_time),
        'Time Out': formatTime(rec.end_time),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const fileName = `attendance_${date}_${selectedJobSite}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to CSV
  const exportToCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      attendance.map(rec => ({
        'Name': `${rec.employee?.first_name || ''} ${rec.employee?.last_name || ''}`.trim(),
        'Time In': formatTime(rec.start_time),
        'Time Out': formatTime(rec.end_time),
      }))
    );
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${date}_${selectedJobSite}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border-2 border-orange-300 shadow-xl max-w-3xl mx-auto mt-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label className="block text-orange-800 font-semibold mb-1">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-2 border-orange-300" />
            </div>
            <div>
              <label className="block text-orange-800 font-semibold mb-1">Job Site</label>
              <Select value={selectedJobSite} onValueChange={setSelectedJobSite}>
                <SelectTrigger className="border-2 border-orange-300">
                  <SelectValue placeholder="Select Job Site" />
                </SelectTrigger>
                <SelectContent>
                  {jobSites.map(js => (
                    <SelectItem key={js.id} value={js.id}>{js.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button onClick={exportToExcel} className="flex items-center gap-2 border-2 border-orange-500 text-orange-700 hover:bg-orange-50 rounded-lg font-semibold px-3 py-1">
              <Upload className="h-4 w-4" /> Export Excel
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 border-2 border-orange-500 text-orange-700 hover:bg-orange-50 rounded-lg font-semibold px-3 py-1">
              <Upload className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto w-full max-w-full" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '500px', width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
            <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
              <tr>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Time In</th>
                <th style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Time Out</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: '#b45309', border: '1px solid #fdba74' }}>No attendance records found.</td>
                </tr>
              )}
              {attendance.map((rec, idx) => (
                <tr key={rec.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FFFBEB', height: '36px' }}>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{rec.employee?.first_name} {rec.employee?.last_name}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{formatTime(rec.start_time)}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{formatTime(rec.end_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyAttendancePage; 