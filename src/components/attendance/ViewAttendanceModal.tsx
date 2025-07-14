import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

interface ViewAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  records: any[];
}

function getShiftHours(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function hoursToHHMM(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

const ViewAttendanceModal: React.FC<ViewAttendanceModalProps> = ({ open, onClose, records }) => {
  if (!records || records.length === 0) return null;
  const group = records[0];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full">
        <DialogHeader>
          <DialogTitle>VIEW ATTENDANCE</DialogTitle>
        </DialogHeader>
        <div className="flex gap-12 mb-4">
          <div>
            <div className="font-semibold text-gray-700">Attendance Date</div>
            <div>{group.date ? new Date(group.date).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Job Site</div>
            <div>{group.job_site?.name || '-'}</div>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => {
            // Export to Excel for modal records
            const exportData = records.map(row => ({
              'Employee': `${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim(),
              'Job Site': row.job_site?.name || '-',
              'Date': row.date || '-',
              'Start Time': row.start_time || '-',
              'End Time': row.end_time || '-',
              'Hours': hoursToHHMM(getShiftHours(row.start_time, row.end_time)),
              'Deduct (min)': row.minute_deduct || 0,
              'Created Date': row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '-',
              'Updated Date': row.updated_at ? row.updated_at.slice(0, 16).replace('T', ' ') : '-',
            }));
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
            const fileName = `attendance_view_${records[0]?.date || 'export'}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast({ title: 'Excel file downloaded successfully' });
          }}>Export to Excel</Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Export to CSV for modal records
            const exportData = records.map(row => ({
              'Employee': `${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim(),
              'Job Site': row.job_site?.name || '-',
              'Date': row.date || '-',
              'Start Time': row.start_time || '-',
              'End Time': row.end_time || '-',
              'Hours': hoursToHHMM(getShiftHours(row.start_time, row.end_time)),
              'Deduct (min)': row.minute_deduct || 0,
              'Created Date': row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '-',
              'Updated Date': row.updated_at ? row.updated_at.slice(0, 16).replace('T', ' ') : '-',
            }));
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `attendance_view_${records[0]?.date || 'export'}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: 'CSV file downloaded successfully' });
          }}>Export to CSV</Button>
          <Button variant="outline" size="sm" disabled>Export to PDF</Button>
          <Input placeholder="Search..." className="w-64 ml-auto" disabled />
        </div>
        <div className="overflow-x-auto rounded-lg border shadow mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48 min-w-[180px]">Employee/Foreman</TableHead>
                <TableHead className="w-28 min-w-[100px]">No of Worker</TableHead>
                <TableHead className="w-40 min-w-[120px]">Shift Start Time</TableHead>
                <TableHead className="w-40 min-w-[120px]">Shift End Time</TableHead>
                <TableHead className="w-32 min-w-[100px]">Shift Hours</TableHead>
                <TableHead className="w-32 min-w-[100px]">Hrs Deduct</TableHead>
                <TableHead className="w-32 min-w-[100px]">Total Hours</TableHead>
                <TableHead className="w-44 min-w-[140px]">Created Date</TableHead>
                <TableHead className="w-44 min-w-[140px]">Updated Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((row: any) => {
                const shiftHours = getShiftHours(row.start_time, row.end_time);
                const hrsDeduct = (row.minute_deduct / 60);
                const totalHours = shiftHours - hrsDeduct;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="w-48 min-w-[180px]">{row.employee?.first_name} {row.employee?.last_name}</TableCell>
                    <TableCell className="w-28 min-w-[100px]">1</TableCell>
                    <TableCell className="w-40 min-w-[120px]">{row.start_time}</TableCell>
                    <TableCell className="w-40 min-w-[120px]">{row.end_time}</TableCell>
                    <TableCell className="w-32 min-w-[100px]">{hoursToHHMM(shiftHours)}</TableCell>
                    <TableCell className="w-32 min-w-[100px]">{hoursToHHMM(hrsDeduct)}</TableCell>
                    <TableCell className="w-32 min-w-[100px]">{hoursToHHMM(totalHours)}</TableCell>
                    <TableCell className="w-44 min-w-[140px]">{row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '-'}</TableCell>
                    <TableCell className="w-44 min-w-[140px]">{row.updated_at ? row.updated_at.slice(0, 16).replace('T', ' ') : '-'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewAttendanceModal; 