import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, Calendar, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import BulkAttendanceModal from './BulkAttendanceModal';
import EditAttendanceModal from './EditAttendanceModal';
import ViewAttendanceModal from './ViewAttendanceModal';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  jobsite_id: string;
  date: string;
  start_time: string;
  end_time: string;
  minute_deduct: number;
  shift_hours: number;
  employee: {
    first_name: string;
    last_name: string;
  };
  job_site: {
    name: string;
  };
  created_at?: string;
}

interface AttendanceListProps {
  onEdit: (attendance: AttendanceRecord) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

function formatMinutesToHourMinute(min: number) {
  const hours = Math.floor(min / 60);
  const minutes = Math.abs(min % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function formatHoursToHourMinute(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}


const AttendanceList = ({ onEdit, onAdd, refreshTrigger }: AttendanceListProps) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecords, setEditRecords] = useState<AttendanceRecord[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewRecords, setViewRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, [refreshTrigger, searchTerm, dateFilter, currentPage]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          employee:employees(first_name, last_name),
          job_site:job_sites(name)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`employee.first_name.ilike.%${searchTerm}%,employee.last_name.ilike.%${searchTerm}%,job_site.name.ilike.%${searchTerm}%`);
      }

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setAttendance(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error: any) {
      toast({
        title: 'Error fetching attendance',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Attendance record deleted successfully' });
      fetchAttendance();
    } catch (error: any) {
      toast({
        title: 'Error deleting attendance record',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    // Find all records for the same site and date
    const siteRecords = attendance.filter(r => r.jobsite_id === record.jobsite_id && r.date === record.date);
    setEditRecords(siteRecords);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (records: AttendanceRecord[]) => {
    setLoading(true);
    try {
      // Split records into new and existing
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const newRecords = records.filter(r => !uuidRegex.test(r.id));
      const existingRecords = records.filter(r => uuidRegex.test(r.id));
      // Insert new records
      if (newRecords.length > 0) {
        await supabase.from('attendance').insert(newRecords.map(rec => ({
          employee_id: rec.employee_id,
          jobsite_id: rec.jobsite_id,
          date: rec.date,
          start_time: rec.start_time,
          end_time: rec.end_time,
          minute_deduct: rec.minute_deduct,
        })));
      }
      // Update existing records
      for (const rec of existingRecords) {
        await supabase.from('attendance').update({
          start_time: rec.start_time,
          end_time: rec.end_time,
          minute_deduct: rec.minute_deduct
        }).eq('id', rec.id);
      }
      toast({ title: 'Attendance records updated successfully' });
      setEditModalOpen(false);
      fetchAttendance();
    } catch (error: any) {
      toast({ title: 'Error updating attendance', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (group: any) => {
    setViewRecords(group.records);
    setViewModalOpen(true);
  };

  const handleDeleteGroup = async (group: any) => {
    if (!window.confirm('Are you sure you want to delete all attendance records for this site and date?')) return;
    for (const rec of group.records) {
      await supabase.from('attendance').delete().eq('id', rec.id);
    }
    fetchAttendance();
  };

  const exportToExcel = () => {
    const exportData = groupedAttendance.map(group => {
      const firstRecord = group.records[0];
      const startTime = firstRecord?.start_time || '-';
      const endTime = firstRecord?.end_time || '-';
      let shiftHours = '-';
      if (firstRecord?.start_time && firstRecord?.end_time) {
        const [sh, sm] = firstRecord.start_time.split(':').map(Number);
        const [eh, em] = firstRecord.end_time.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (!isNaN(diff) && diff >= 0) {
          const hours = Math.floor(diff / 60);
          const minutes = diff % 60;
          shiftHours = `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      const createdDate = firstRecord?.created_at ? firstRecord.created_at.slice(0, 16).replace('T', ' ') : '-';
      return {
        'Attendance Date': group.date ? format(new Date(group.date), 'MM-dd-yyyy') : '-',
        'Start Time': startTime,
        'End Time': endTime,
        'Shift Hours': shiftHours,
        'Site Name': group.siteName,
        'No of Employee': group.employeeIds.size,
        'Created Date': createdDate,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const fileName = `attendance_table_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({ title: 'Excel file downloaded successfully' });
  };

  const exportToCSV = () => {
    const exportData = groupedAttendance.map(group => {
      const firstRecord = group.records[0];
      const startTime = firstRecord?.start_time || '-';
      const endTime = firstRecord?.end_time || '-';
      let shiftHours = '-';
      if (firstRecord?.start_time && firstRecord?.end_time) {
        const [sh, sm] = firstRecord.start_time.split(':').map(Number);
        const [eh, em] = firstRecord.end_time.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (!isNaN(diff) && diff >= 0) {
          const hours = Math.floor(diff / 60);
          const minutes = diff % 60;
          shiftHours = `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      const createdDate = firstRecord?.created_at ? firstRecord.created_at.slice(0, 16).replace('T', ' ') : '-';
      return {
        'Attendance Date': group.date ? format(new Date(group.date), 'MM-dd-yyyy') : '-',
        'Start Time': startTime,
        'End Time': endTime,
        'Shift Hours': shiftHours,
        'Site Name': group.siteName,
        'No of Employee': group.employeeIds.size,
        'Created Date': createdDate,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_table_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV file downloaded successfully' });
  };

  // Group attendance by site and date
  const groupedAttendance = React.useMemo(() => {
    const groups: Record<string, { key: string, date: string, jobsite_id: string, siteName: string, records: AttendanceRecord[], employeeIds: Set<string> }> = {};
    attendance.forEach(record => {
      const key = `${record.jobsite_id}_${record.date}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          date: record.date,
          jobsite_id: record.jobsite_id,
          siteName: record.job_site.name,
          records: [],
          employeeIds: new Set(),
        };
      }
      groups[key].records.push(record);
      groups[key].employeeIds.add(record.employee_id);
    });
    return Object.values(groups);
  }, [attendance]);

  if (loading) {
    return (
      <Card className="border-2 border-orange-200 shadow-2xl">
        <CardContent className="p-12">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mr-4"></div>
            <span className="text-xl text-orange-600 font-medium">Loading attendance records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200 shadow-2xl bg-white">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Attendance Records</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={exportToExcel}>Export to Excel</Button>
          <Button variant="outline" onClick={exportToCSV}>Export to CSV</Button>
        </div>
        <div style={{ overflowX: 'auto' }} className="w-full max-w-full">
          <table style={{ minWidth: '1100px', width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead style={{ background: 'linear-gradient(to right, #FFEDD5, #FEF3C7)' }}>
              <tr>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Attendance Date</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Start Time</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>End Time</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Shift Hours</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Site Name</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>No of Employee</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Action</th>
                <th style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#b45309', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {groupedAttendance.map((group, index) => {
                // Use the first record in the group for group-level fields
                const firstRecord = group.records[0];
                const startTime = firstRecord?.start_time || '-';
                const endTime = firstRecord?.end_time || '-';
                // Calculate shift hours if both times are present
                let shiftHours = '-';
                if (firstRecord?.start_time && firstRecord?.end_time) {
                  const [sh, sm] = firstRecord.start_time.split(':').map(Number);
                  const [eh, em] = firstRecord.end_time.split(':').map(Number);
                  const diff = (eh * 60 + em) - (sh * 60 + sm);
                  if (!isNaN(diff) && diff >= 0) {
                    const hours = Math.floor(diff / 60);
                    const minutes = diff % 60;
                    shiftHours = `${hours}:${minutes.toString().padStart(2, '0')}`;
                  }
                }
                const createdDate = firstRecord?.created_at ? firstRecord.created_at.slice(0, 16).replace('T', ' ') : '-';
                return (
                  <tr key={group.key} style={{ background: index % 2 === 0 ? '#fff' : '#FFFBEB', fontSize: '0.95rem', height: '32px' }}>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{format(new Date(group.date), 'MM-dd-yyyy')}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{startTime}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{endTime}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{shiftHours}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{group.siteName}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{group.employeeIds.size}</td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', whiteSpace: 'nowrap' }}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(group)}
                          className="border-2 border-blue-200 text-blue-600 hover:bg-blue-500 hover:text-white px-2 py-1 text-xs"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditRecords(group.records);
                            setEditModalOpen(true);
                          }}
                          className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white px-2 py-1 text-xs"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group)}
                          className="border-2 border-red-200 text-red-600 hover:bg-red-500 hover:text-white px-2 py-1 text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                    <td style={{ padding: '4px 6px', border: '1px solid #fdba74', color: '#92400e', whiteSpace: 'nowrap' }}>{createdDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {groupedAttendance.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No attendance records found</p>
          </div>
        )}
      </CardContent>
      <EditAttendanceModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        records={editRecords}
        onSubmit={handleEditSubmit}
      />
      <ViewAttendanceModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        records={viewRecords}
      />
    </Card>
  );
};

export default AttendanceList;
