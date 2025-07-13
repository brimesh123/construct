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


const AttendanceList = ({ onEdit, onAdd, refreshTrigger }: AttendanceListProps) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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

  const exportToExcel = () => {
    const exportData = attendance.map(record => ({
      'Employee': `${record.employee.first_name} ${record.employee.last_name}`,
      'Job Site': record.job_site.name,
      'Date': format(new Date(record.date), 'MMM dd, yyyy'),
      'Start Time': record.start_time,
      'End Time': record.end_time,
      'Hours': record.shift_hours,
      'Deduct (min)': formatMinutesToHourMinute(record.minute_deduct)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    const fileName = `attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({ title: 'Excel file downloaded successfully' });
  };

  const exportToCSV = () => {
    const exportData = attendance.map(record => ({
      'Employee': `${record.employee.first_name} ${record.employee.last_name}`,
      'Job Site': record.job_site.name,
      'Date': format(new Date(record.date), 'MMM dd, yyyy'),
      'Start Time': record.start_time,
      'End Time': record.end_time,
      'Hours': record.shift_hours,
      'Deduct (min)': formatMinutesToHourMinute(record.minute_deduct)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: 'CSV file downloaded successfully' });
  };

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
    <TooltipProvider>
      <Card className="border-2 border-orange-200 shadow-2xl bg-white">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Attendance Records</CardTitle>
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={exportToExcel}
                    className="bg-white text-orange-600 border-2 border-white hover:bg-orange-50 hover:text-orange-700 font-medium"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export attendance records to Excel file</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={exportToCSV}
                    className="bg-white text-orange-600 border-2 border-white hover:bg-orange-50 hover:text-orange-700 font-medium"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export attendance records to CSV file</p>
                </TooltipContent>
              </Tooltip>

              <Button 
                onClick={onAdd}
                className="bg-white text-orange-600 hover:bg-orange-50 font-medium shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Attendance
              </Button>
              <Button
                onClick={() => setBulkModalOpen(true)}
                className="bg-orange-500 text-white hover:bg-orange-600 font-medium shadow-lg"
              >
                Bulk Add Attendance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-6 w-full">
            <div className="relative flex-1 min-w-[260px] mb-3 sm:mb-0">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-400 pointer-events-none" />
              <Input
                placeholder="Search by employee or job site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-16 border-2 border-orange-200 focus:border-orange-500 text-lg p-3 w-full min-w-[220px]"
              />
            </div>
            <div className="relative min-w-[220px] w-full sm:w-auto">
              <Calendar className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-400 pointer-events-none" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-16 border-2 border-orange-200 focus:border-orange-500 text-lg p-3 w-full"
                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border-2 border-orange-100 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50 border-b-2 border-orange-200">
                  <TableHead className="font-bold text-orange-800 text-lg">Employee</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Job Site</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Date</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Start Time</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">End Time</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Hours</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Deduct (Hours)</TableHead>
                  <TableHead className="font-bold text-orange-800 text-lg">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record, index) => (
                  <TableRow key={record.id} className={`hover:bg-orange-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <TableCell className="font-semibold text-gray-800 text-lg">
                      {record.employee.first_name} {record.employee.last_name}
                    </TableCell>
                    <TableCell className="text-gray-600">{record.job_site.name}</TableCell>
                    <TableCell className="text-gray-600">{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-gray-600">{record.start_time}</TableCell>
                    <TableCell className="text-gray-600">{record.end_time}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border border-orange-300 font-medium text-sm px-3 py-1">
                        {record.shift_hours} hrs
                      </Badge>
                    </TableCell>
                    <TableCell className="text-orange-700 font-medium">{formatMinutesToHourMinute(record.minute_deduct)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(record)}
                              className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit attendance record</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              className="border-2 border-red-200 text-red-600 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete attendance record</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {attendance.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No attendance records found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white font-medium"
              >
                Previous
              </Button>
              <span className="px-6 py-2 bg-orange-100 text-orange-800 rounded-lg font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-2 border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white font-medium"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <BulkAttendanceModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={fetchAttendance}
      />
    </TooltipProvider>
  );
};

export default AttendanceList;
