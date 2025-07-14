import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

const MarkAttendanceForm = ({ jobSite, onBack }: { jobSite: any; onBack: () => void }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [minuteDeduct, setMinuteDeduct] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('job_sites').select('id, name').eq('id', jobSite.id),
      supabase.from('employees').select('id, first_name, last_name') as any
    ]).then(([siteRes, empRes]) => {
      // Optionally set job site name if needed: setJobSiteName(siteRes.data?.[0]?.name || '');
      setEmployees(empRes.data || []);
      setLoading(false);
    });
  }, [jobSite]);

  const toggleSelect = (id: string) => {
    setSelected(sel => sel.includes(id) ? sel.filter(eid => eid !== id) : [...sel, id]);
  };

  const handleOpenConfirm = () => {
    // Prepare confirm data for selected employees
    setConfirmData(selected.map(id => {
      const emp = employees.find(e => e.id === id);
      return {
        id,
        first_name: emp?.first_name || '',
        last_name: emp?.last_name || '',
        start_time: '',
        end_time: '',
        minute_deduct: '',
      };
    }));
    setConfirmOpen(true);
  };

  const handleConfirmField = (idx: number, field: string, value: string) => {
    setConfirmData(data => {
      const updated = [...data];
      updated[idx][field] = value;
      return updated;
    });
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const records = confirmData.map(row => ({
        employee_id: row.id,
        jobsite_id: jobSite.id,
        date,
        start_time: row.start_time,
        end_time: row.end_time,
        minute_deduct: Number(row.minute_deduct) || 0,
      }));
      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;
      setConfirmOpen(false);
      setSelected([]);
      setConfirmData([]);
      setDate('');
      setStartTime('');
      setEndTime('');
      setMinuteDeduct('');
      toast({ title: 'Attendance marked successfully!', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error saving attendance.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-2 border-orange-200 shadow-2xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-4">
          ATTENDANCE DETAIL
          <span className="bg-cyan-400 text-white px-3 py-1 rounded">Jobsite : {jobSite.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} placeholder="Date" className="max-w-xs" />
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="Start Time" className="max-w-xs" />
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="End Time" className="max-w-xs" />
          <Input type="number" value={minuteDeduct} onChange={e => setMinuteDeduct(e.target.value)} placeholder="Minute Deduct" className="max-w-xs" />
        </div>
        <div className="overflow-x-auto rounded-lg border shadow mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mark Attendance</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={3}>No employees found</TableCell></TableRow>
              ) : (
                employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggleSelect(emp.id)} />
                    </TableCell>
                    <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                    <TableCell>Employee</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Selected employees as chips/cards */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map(id => {
              const emp = employees.find(e => e.id === id);
              if (!emp) return null;
              return (
                <div key={id} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full shadow">
                  <span>{emp.first_name} {emp.last_name}</span>
                  <button onClick={() => toggleSelect(id)} className="ml-2 text-blue-600 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button className="bg-blue-800 text-white" disabled={selected.length === 0} onClick={handleOpenConfirm}>Submit Attendance</Button>
        </div>
      </CardContent>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
          </DialogHeader>
          <div className="mb-4">Date: {date || '-'}</div>
          <div className="overflow-x-auto rounded-lg border shadow mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Minute Deduct</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmData.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.first_name} {row.last_name}</TableCell>
                    <TableCell>
                      <Input type="time" value={row.start_time} onChange={e => handleConfirmField(idx, 'start_time', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="time" value={row.end_time} onChange={e => handleConfirmField(idx, 'end_time', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={row.minute_deduct} onChange={e => handleConfirmField(idx, 'minute_deduct', e.target.value)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button className="bg-blue-800 text-white" onClick={handleFinalSubmit} disabled={submitting}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MarkAttendanceForm; 