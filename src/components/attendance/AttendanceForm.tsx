
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const attendanceSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  jobsite_id: z.string().min(1, 'Job site is required'),
  date: z.date(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  minute_deduct: z.number().min(0, 'Minute deduct must be positive').default(0),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

interface AttendanceFormProps {
  attendance?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const AttendanceForm = ({ attendance, onSuccess, onCancel }: AttendanceFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobSites, setJobSites] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: attendance ? {
      ...attendance,
      date: attendance.date ? new Date(attendance.date) : new Date(),
      minute_deduct: attendance.minute_deduct || 0,
    } : {
      date: new Date(),
      minute_deduct: 0,
    },
  });

  const watchedDate = watch('date');

  useEffect(() => {
    fetchEmployees();
    fetchJobSites();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .order('last_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching employees',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchJobSites = async () => {
    try {
      const { data, error } = await supabase
        .from('job_sites')
        .select('id, name')
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      setJobSites(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching job sites',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: AttendanceFormData) => {
    setLoading(true);
    try {
      const attendanceData = {
        employee_id: data.employee_id,
        jobsite_id: data.jobsite_id,
        date: format(data.date, 'yyyy-MM-dd'),
        start_time: data.start_time,
        end_time: data.end_time,
        minute_deduct: data.minute_deduct,
      };

      if (attendance) {
        const { error } = await supabase
          .from('attendance')
          .update(attendanceData)
          .eq('id', attendance.id);

        if (error) throw error;
        toast({ title: 'Attendance updated successfully' });
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert([attendanceData]);

        if (error) throw error;
        toast({ title: 'Attendance recorded successfully' });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">
          {attendance ? 'Edit Attendance' : 'Record Attendance'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employee_id" className="text-orange-800 font-semibold text-lg">Employee *</Label>
            <Select
              onValueChange={(value) => setValue('employee_id', value)}
              defaultValue={attendance?.employee_id}
            >
              <SelectTrigger className="border-2 border-orange-200 focus:border-orange-500 text-lg p-3 h-auto">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-orange-200 shadow-lg">
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employee_id && (
              <p className="text-sm text-red-500 font-medium">{errors.employee_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobsite_id" className="text-orange-800 font-semibold text-lg">Job Site *</Label>
            <Select
              onValueChange={(value) => setValue('jobsite_id', value)}
              defaultValue={attendance?.jobsite_id}
            >
              <SelectTrigger className="border-2 border-orange-200 focus:border-orange-500 text-lg p-3 h-auto">
                <SelectValue placeholder="Select job site" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-orange-200 shadow-lg">
                {jobSites.map((jobsite) => (
                  <SelectItem key={jobsite.id} value={jobsite.id}>
                    {jobsite.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.jobsite_id && (
              <p className="text-sm text-red-500 font-medium">{errors.jobsite_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-orange-800 font-semibold text-lg">Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-2 border-orange-200 focus:border-orange-500 text-lg p-3 h-auto",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {watchedDate ? format(watchedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-orange-200 shadow-lg">
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => setValue('date', date || new Date())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_time" className="text-orange-800 font-semibold text-lg">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time')}
                className="border-2 border-orange-200 focus:border-orange-500 text-lg p-3"
              />
              {errors.start_time && (
                <p className="text-sm text-red-500 font-medium">{errors.start_time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time" className="text-orange-800 font-semibold text-lg">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                {...register('end_time')}
                className="border-2 border-orange-200 focus:border-orange-500 text-lg p-3"
              />
              {errors.end_time && (
                <p className="text-sm text-red-500 font-medium">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minute_deduct" className="text-orange-800 font-semibold text-lg">Minute Deduct</Label>
            <Input
              id="minute_deduct"
              type="number"
              min="0"
              {...register('minute_deduct', { valueAsNumber: true })}
              placeholder="Minutes to deduct"
              className="border-2 border-orange-200 focus:border-orange-500 text-lg p-3"
            />
            {errors.minute_deduct && (
              <p className="text-sm text-red-500 font-medium">{errors.minute_deduct.message}</p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-lg font-medium"
            >
              {loading ? 'Saving...' : attendance ? 'Update Attendance' : 'Record Attendance'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-2 border-orange-200 text-orange-600 hover:bg-orange-50 px-6 py-3 text-lg font-medium"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AttendanceForm;
