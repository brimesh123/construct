
import { useState } from 'react';
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
import { CheckCircle } from 'lucide-react';

const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  type: z.enum(['Employee', 'Foreman', 'PM']),
  mobile_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  sst_number: z.string().optional(),
  sst_expire_date: z.date().optional(),
  regular_rate: z.number().min(0).default(0),
  overtime_rate: z.number().min(0).default(0),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const EmployeeForm = ({ employee, onSuccess, onCancel }: EmployeeFormProps) => {
  const [loading, setLoading] = useState(false);
  const [sstFile, setSstFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      ...employee,
      sst_expire_date: employee.sst_expire_date ? new Date(employee.sst_expire_date) : undefined,
    } : {
      type: 'Employee',
      regular_rate: 0,
      overtime_rate: 0,
    },
  });

  const watchedDate = watch('sst_expire_date');

  const uploadSstImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `sst-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sst-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('sst-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);
    try {
      let sst_image_url = employee?.sst_image_url;

      if (sstFile) {
        const uploadedUrl = await uploadSstImage(sstFile);
        if (uploadedUrl) {
          sst_image_url = uploadedUrl;
        }
      }

      const employeeData = {
        first_name: data.first_name,
        last_name: data.last_name,
        type: data.type,
        email: data.email || null,
        mobile_number: data.mobile_number || null,
        sst_number: data.sst_number || null,
        sst_expire_date: data.sst_expire_date ? format(data.sst_expire_date, 'yyyy-MM-dd') : null,
        regular_rate: data.regular_rate,
        overtime_rate: data.overtime_rate,
        sst_image_url,
      };

      if (employee) {
        const { error } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id);

        if (error) throw error;
        toast({
          title: 'Employee updated!',
          description: `${data.first_name} ${data.last_name} was updated successfully!`,
          variant: 'success',
        });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([employeeData]);

        if (error) throw error;
        toast({
          title: 'Employee added!',
          description: `${data.first_name} ${data.last_name} was added successfully!`,
          variant: 'success',
        });
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
    <Card className="w-full max-w-xl mx-auto border-2 border-orange-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-t-lg p-4">
        <CardTitle className="text-xl font-bold">
          {employee ? 'Edit Employee' : 'Add Employee'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-orange-800 font-medium text-sm">First Name *</Label>
              <Input id="first_name" {...register('first_name')} placeholder="First name" className="border-orange-200 focus:border-orange-500 text-base p-2" />
              {errors.first_name && <p className="text-xs text-red-500 font-medium mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="last_name" className="text-orange-800 font-medium text-sm">Last Name *</Label>
              <Input id="last_name" {...register('last_name')} placeholder="Last name" className="border-orange-200 focus:border-orange-500 text-base p-2" />
              {errors.last_name && <p className="text-xs text-red-500 font-medium mt-1">{errors.last_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="type" className="text-orange-800 font-medium text-sm">Type</Label>
              <Select onValueChange={value => setValue('type', value as any)} defaultValue={employee?.type || 'Employee'}>
                <SelectTrigger className="border-orange-200 focus:border-orange-500 text-base p-2 h-auto">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-orange-200 shadow-lg">
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Foreman">Foreman</SelectItem>
                  <SelectItem value="PM">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mobile_number" className="text-orange-800 font-medium text-sm">Mobile</Label>
              <Input id="mobile_number" {...register('mobile_number')} placeholder="Mobile" className="border-orange-200 focus:border-orange-500 text-base p-2" />
            </div>
            <div>
              <Label htmlFor="email" className="text-orange-800 font-medium text-sm">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="Email" className="border-orange-200 focus:border-orange-500 text-base p-2" />
              {errors.email && <p className="text-xs text-red-500 font-medium mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="sst_number" className="text-orange-800 font-medium text-sm">SST Number</Label>
              <Input id="sst_number" {...register('sst_number')} placeholder="SST number" className="border-orange-200 focus:border-orange-500 text-base p-2" />
            </div>
            <div>
              <Label className="text-orange-800 font-medium text-sm">SST Expiry</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-orange-200 focus:border-orange-500 text-base p-2 h-auto", !watchedDate && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {watchedDate ? format(watchedDate, "PPP") : "Pick a date"} </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-orange-200 shadow-lg">
                  <Calendar mode="single" selected={watchedDate} onSelect={date => setValue('sst_expire_date', date)} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="sst_image" className="text-orange-800 font-medium text-sm">SST Image</Label>
              <Input id="sst_image" type="file" accept="image/*" onChange={e => setSstFile(e.target.files?.[0] || null)} className="border-orange-200 focus:border-orange-500 text-base p-2" />
            </div>
            <div>
              <Label htmlFor="regular_rate" className="text-orange-800 font-medium text-sm">Regular Rate ($)</Label>
              <Input id="regular_rate" type="number" step="0.01" {...register('regular_rate', { valueAsNumber: true })} placeholder="0.00" className="border-orange-200 focus:border-orange-500 text-base p-2" />
            </div>
            <div>
              <Label htmlFor="overtime_rate" className="text-orange-800 font-medium text-sm">Overtime Rate ($)</Label>
              <Input id="overtime_rate" type="number" step="0.01" {...register('overtime_rate', { valueAsNumber: true })} placeholder="0.00" className="border-orange-200 focus:border-orange-500 text-base p-2" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 text-base font-medium">{loading ? 'Saving...' : employee ? 'Update' : 'Add'}</Button>
            <Button type="button" variant="outline" onClick={onCancel} className="border-orange-200 text-orange-600 hover:bg-orange-50 px-5 py-2 text-base font-medium">Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeForm;
