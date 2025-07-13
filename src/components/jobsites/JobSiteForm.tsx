
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const jobSiteSchema = z.object({
  name: z.string().min(1, 'Job site name is required'),
  address: z.string().optional(),
  assigned_pm: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
  status: z.enum(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']),
});

type JobSiteFormData = z.infer<typeof jobSiteSchema>;

interface JobSiteFormProps {
  jobSite?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const JobSiteForm = ({ jobSite, onSuccess, onCancel }: JobSiteFormProps) => {
  const [loading, setLoading] = useState(false);
  const [projectManagers, setProjectManagers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobSiteFormData>({
    resolver: zodResolver(jobSiteSchema),
    defaultValues: jobSite ? {
      ...jobSite,
      start_date: jobSite.start_date ? new Date(jobSite.start_date) : undefined,
      end_date: jobSite.end_date ? new Date(jobSite.end_date) : undefined,
    } : {
      status: 'Planning',
    },
  });

  const watchedStartDate = watch('start_date');
  const watchedEndDate = watch('end_date');

  useEffect(() => {
    fetchProjectManagers();
  }, []);

  const fetchProjectManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('type', 'PM')
        .order('last_name');

      if (error) throw error;
      setProjectManagers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching project managers',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: JobSiteFormData) => {
    setLoading(true);
    try {
      const jobSiteData = {
        name: data.name,
        address: data.address || null,
        assigned_pm: data.assigned_pm || null,
        start_date: data.start_date ? format(data.start_date, 'yyyy-MM-dd') : null,
        end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : null,
        status: data.status,
      };

      if (jobSite) {
        const { error } = await supabase
          .from('job_sites')
          .update(jobSiteData)
          .eq('id', jobSite.id);

        if (error) throw error;
        toast({ title: 'Job site updated successfully' });
      } else {
        const { error } = await supabase
          .from('job_sites')
          .insert([jobSiteData]);

        if (error) throw error;
        toast({ title: 'Job site created successfully' });
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
    <Card className="w-full max-w-3xl mx-auto border-2 border-green-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">
          {jobSite ? 'Edit Job Site' : 'Add Job Site'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-green-800 font-semibold text-lg">
              Job Site Name *
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter job site name"
              className="border-2 border-green-200 focus:border-green-500 text-lg p-3"
            />
            {errors.name && (
              <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-green-800 font-semibold text-lg">
              Address
            </Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Enter job site address"
              rows={3}
              className="border-2 border-green-200 focus:border-green-500 text-lg p-3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_pm" className="text-green-800 font-semibold text-lg">
              Assigned Project Manager
            </Label>
            <Select
              onValueChange={(value) => setValue('assigned_pm', value === 'none' ? undefined : value)}
              defaultValue={jobSite?.assigned_pm || 'none'}
            >
              <SelectTrigger className="border-2 border-green-200 focus:border-green-500 text-lg p-3 h-auto">
                <SelectValue placeholder="Select project manager" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-green-200 shadow-lg">
                <SelectItem value="none">No PM assigned</SelectItem>
                {projectManagers.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.first_name} {pm.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-green-800 font-semibold text-lg">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2 border-green-200 focus:border-green-500 text-lg p-3 h-auto",
                      !watchedStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {watchedStartDate ? format(watchedStartDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-2 border-green-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={watchedStartDate}
                    onSelect={(date) => setValue('start_date', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-green-800 font-semibold text-lg">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2 border-green-200 focus:border-green-500 text-lg p-3 h-auto",
                      !watchedEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {watchedEndDate ? format(watchedEndDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-2 border-green-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={watchedEndDate}
                    onSelect={(date) => setValue('end_date', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-green-800 font-semibold text-lg">
              Status
            </Label>
            <Select
              onValueChange={(value) => setValue('status', value as any)}
              defaultValue={jobSite?.status || 'Planning'}
            >
              <SelectTrigger className="border-2 border-green-200 focus:border-green-500 text-lg p-3 h-auto">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-green-200 shadow-lg">
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-medium"
            >
              {loading ? 'Saving...' : jobSite ? 'Update Job Site' : 'Add Job Site'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-2 border-green-200 text-green-600 hover:bg-green-50 px-6 py-3 text-lg font-medium"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default JobSiteForm;
