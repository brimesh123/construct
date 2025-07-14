import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddAttendanceModal from './AddAttendanceModal';

interface EditAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  records: any[];
  onSubmit: (records: any[]) => void;
}

const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({ open, onClose, records, onSubmit }) => {
  const [data, setData] = useState(records);
  const [addModalOpen, setAddModalOpen] = useState(false);

  React.useEffect(() => {
    setData(records);
  }, [records]);

  const handleFieldChange = (index: number, field: string, value: any) => {
    const updated = [...data];
    updated[index][field] = value;
    setData(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...data];
    updated.splice(index, 1);
    setData(updated);
  };

  const handleAdd = () => {
    setAddModalOpen(true);
  };

  const handleAddAttendance = (record: any) => {
    setData([...data, record]);
  };

  const handleSubmit = () => {
    // Ensure minute_deduct is always a number (default 0 if empty or invalid)
    const sanitized = data.map(row => ({
      ...row,
      minute_deduct: row.minute_deduct === '' || isNaN(Number(row.minute_deduct)) ? 0 : Number(row.minute_deduct),
    }));
    onSubmit(sanitized);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
        </DialogHeader>
        <div className="flex justify-between mb-4">
          <div>
            <Button variant="outline" size="sm" disabled>Export to Excel</Button>
            <Button variant="outline" size="sm" className="ml-2" disabled>Export to PDF</Button>
          </div>
          <Button onClick={handleAdd} className="bg-blue-600 text-white">Add</Button>
        </div>
        <AddAttendanceModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAdd={record => { handleAddAttendance({ ...record, jobsite_id: data[0]?.jobsite_id }); setAddModalOpen(false); }}
          existingEmployeeIds={data.map(row => row.employee_id)}
          editDate={data[0]?.date || ''}
          jobsiteId={data[0]?.jobsite_id || ''}
        />
        <div className="overflow-x-auto rounded-lg border-2 border-orange-100 shadow-lg bg-white">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2"></th>
                <th className="p-2 text-left">Employee</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Shift Start</th>
                <th className="p-2 text-left">Shift End</th>
                <th className="p-2 text-left">Min. Deduct</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No data found</td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      <Button variant="destructive" size="sm" onClick={() => handleRemove(idx)}>X</Button>
                    </td>
                    <td className="p-2">{row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : ''}</td>
                    <td className="p-2">Employee</td>
                    <td className="p-2">
                      <Input type="time" value={row.start_time} onChange={e => handleFieldChange(idx, 'start_time', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Input type="time" value={row.end_time} onChange={e => handleFieldChange(idx, 'end_time', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Input type="number" value={row.minute_deduct} onChange={e => handleFieldChange(idx, 'minute_deduct', e.target.value)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleSubmit} className="bg-blue-700 text-white">Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAttendanceModal; 