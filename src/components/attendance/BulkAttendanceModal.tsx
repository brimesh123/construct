import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface JobSite {
  id: string;
  name: string;
}

interface BulkAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({ open, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [selectedJobSite, setSelectedJobSite] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [overrides, setOverrides] = useState<Record<string, { start: string; end: string; deduct?: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch employees
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .order('last_name')
      .then(({ data }) => setEmployees(data || []));
    // Fetch job sites
    supabase
      .from('job_sites')
      .select('id, name')
      .order('name')
      .then(({ data }) => setJobSites(data || []));
  }, []);

  // Generate all dates in range
  const getDatesInRange = () => {
    if (!selectedDate) return [];
    const date = new Date(selectedDate);
    const dates = [];
    for (let d = new Date(date); d <= date; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().slice(0, 10));
    }
    return dates;
  };

  // Table preview rows: one per selected employee for the selected date
  const previewRows = selectedEmployees.map(empId => ({
    empId,
    date: selectedDate,
    start: overrides[empId]?.start || '',
    end: overrides[empId]?.end || '',
    deduct: overrides[empId]?.deduct || '0',
  }));

  if (open) console.log('Bulk previewRows:', previewRows);

  const handleOverride = (empId: string, field: 'start' | 'end' | 'deduct', value: string) => {
    setOverrides(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!selectedJobSite) {
        toast({ title: 'Please select a job site.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      if (!selectedDate) {
        toast({ title: 'Please select a date.', variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      const records = previewRows.map(row => {
        const hours = parseFloat(row.deduct || '0');
        const minute_deduct = isNaN(hours) ? 0 : Math.round(hours * 60);
        return {
          employee_id: row.empId,
          jobsite_id: selectedJobSite,
          date: row.date,
          start_time: row.start,
          end_time: row.end,
          minute_deduct,
        };
      });
      // Insert all records in bulk
      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;
      toast({ title: 'Bulk attendance added successfully!' });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle>Bulk Add Attendance</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Job Site Searchable Dropdown */}
          <div>
            <label className="font-semibold mb-1 block">Select Job Site</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px]"
                >
                  {selectedJobSite
                    ? jobSites.find(site => site.id === selectedJobSite)?.name
                    : <span className="text-gray-400">Select job site...</span>}
                  <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[380px]">
                <Command>
                  <CommandInput placeholder="Search job sites..." className="h-12 text-base px-4" />
                  <CommandList className="max-h-72">
                    {jobSites.map(site => (
                      <CommandItem
                        key={site.id}
                        value={site.name}
                        onSelect={() => {
                          setSelectedJobSite(site.id);
                        }}
                        className="flex items-center justify-between px-4 py-3 text-base cursor-pointer hover:bg-accent"
                      >
                        <span>{site.name}</span>
                        {selectedJobSite === site.id && <Check className="h-5 w-5 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {/* Employee Multi-Select Searchable Dropdown */}
          <div>
            <label className="font-semibold mb-1 block">Select Employees</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px]"
                >
                  {selectedEmployees.length === 0 && <span className="text-gray-400">Select employees...</span>}
                  {selectedEmployees.length > 0 && (
                    <span className="truncate text-left">
                      {(() => {
                        const names = employees
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
                    {employees.map(emp => {
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
          {/* Date Picker */}
          <div>
            <label className="font-semibold mb-1 block">Date</label>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full sm:w-64" />
          </div>
          {/* Table Preview */}
          {previewRows.length > 0 && selectedDate && (
            <div className="overflow-x-auto border rounded-lg mt-2">
              <table className="min-w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="p-2 text-left whitespace-nowrap">Employee</th>
                    <th className="p-2 text-left whitespace-nowrap">Date</th>
                    <th className="p-2 text-left whitespace-nowrap">Start Time</th>
                    <th className="p-2 text-left whitespace-nowrap">End Time</th>
                    <th className="p-2 text-left whitespace-nowrap">Deduct (hr)</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    const emp = employees.find(e => e.id === row.empId);
                    return (
                      <tr key={row.empId} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                        <td className="p-2 whitespace-nowrap">{emp ? `${emp.first_name} ${emp.last_name}` : row.empId}</td>
                        <td className="p-2 whitespace-nowrap">{row.date}</td>
                        <td className="p-2 whitespace-nowrap">
                          <Input
                            type="time"
                            value={row.start}
                            onChange={e => handleOverride(row.empId, 'start', e.target.value)}
                            className="w-full min-w-[90px]"
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <Input
                            type="time"
                            value={row.end}
                            onChange={e => handleOverride(row.empId, 'end', e.target.value)}
                            className="w-full min-w-[90px]"
                          />
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.deduct}
                            onChange={e => handleOverride(row.empId, 'deduct', e.target.value)}
                            className="w-full min-w-[70px]"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || previewRows.length === 0} className="w-full sm:w-auto">
            {submitting ? 'Adding...' : 'Add Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceModal; 