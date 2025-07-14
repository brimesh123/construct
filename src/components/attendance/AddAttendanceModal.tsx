import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface AddAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (record: any) => void;
  existingEmployeeIds: string[];
  editDate: string;
  jobsiteId: string;
}

const AddAttendanceModal: React.FC<AddAttendanceModalProps> = ({ open, onClose, onAdd, existingEmployeeIds, editDate, jobsiteId }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({
    date: '',
    employee_id: '',
    start_time: '',
    end_time: '',
    minute_deduct: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .order('last_name')
      .then(({ data }) => {
        setEmployees((data || []).filter(e => !existingEmployeeIds.includes(e.id)));
      });
    setForm({ date: editDate || '', employee_id: '', start_time: '', end_time: '', minute_deduct: '', notes: '' });
  }, [open, existingEmployeeIds, editDate]);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (!form.date || !form.employee_id || !form.start_time || !form.end_time) {
      setSubmitting(false);
      return;
    }
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      employee_id: form.employee_id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      minute_deduct: form.minute_deduct === '' || isNaN(Number(form.minute_deduct)) ? 0 : Number(form.minute_deduct),
      notes: form.notes,
      employee: employees.find(e => e.id === form.employee_id),
      type: 'Employee',
      jobsite_id: jobsiteId,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add Attendance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input type="date" value={form.date} disabled readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Select Employee/Foreman<span className="text-red-500">*</span></label>
              <select
                className="w-full border rounded px-2 py-2"
                value={form.employee_id}
                onChange={e => handleChange('employee_id', e.target.value)}
                required
              >
                <option value="">Select</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time<span className="text-red-500">*</span></label>
              <Input type="time" value={form.start_time} onChange={e => handleChange('start_time', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time<span className="text-red-500">*</span></label>
              <Input type="time" value={form.end_time} onChange={e => handleChange('end_time', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min. Deduct</label>
              <Input type="number" min="0" value={form.minute_deduct} onChange={e => handleChange('minute_deduct', e.target.value)} placeholder="Min. Deduct" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Notes" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="submit" className="bg-blue-700 text-white" disabled={submitting}>Submit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAttendanceModal; 