
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';

const rateCardSchema = z.object({
  regular_rate: z.number().min(0, 'Regular rate must be positive'),
  overtime_rate: z.number().min(0, 'Overtime rate must be positive'),
});

type RateCardFormData = z.infer<typeof rateCardSchema>;

interface RateCardFormProps {
  rateCard?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const RateCardForm = ({ rateCard, onSuccess, onCancel }: RateCardFormProps) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(rateCard || null);
  const [previewHours, setPreviewHours] = useState(8);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<RateCardFormData>({
    resolver: zodResolver(rateCardSchema),
    defaultValues: rateCard ? {
      regular_rate: rateCard.regular_rate || 0,
      overtime_rate: rateCard.overtime_rate || 0,
    } : {
      regular_rate: 0,
      overtime_rate: 0,
    },
  });

  const watchedRegularRate = watch('regular_rate');
  const watchedOvertimeRate = watch('overtime_rate');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PM': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Foreman': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  useEffect(() => {
    if (!rateCard) {
      supabase
        .from('employees')
        .select('id, first_name, last_name, type, regular_rate, overtime_rate')
        .order('last_name')
        .then(({ data }) => setEmployees(data || []));
    }
  }, [rateCard]);

  // When selecting an employee, update form fields with their rates
  useEffect(() => {
    if (selectedEmployee && !rateCard) {
      setValue('regular_rate', selectedEmployee.regular_rate || 0);
      setValue('overtime_rate', selectedEmployee.overtime_rate || 0);
    }
  }, [selectedEmployee, setValue, rateCard]);

  const onSubmit = async (data: RateCardFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          regular_rate: data.regular_rate,
          overtime_rate: data.overtime_rate,
        })
        .eq('id', rateCard.id);

      if (error) throw error;
      toast({ title: 'Employee rates updated successfully' });
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
    <Card className="w-full max-w-2xl mx-auto border-2 border-purple-300 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">
          {rateCard ? (
            <>Edit Rates - {rateCard?.first_name} {rateCard?.last_name}</>
          ) : (
            <>Add Employee Rate</>
          )}
        </CardTitle>
        {(rateCard?.type || selectedEmployee?.type) && (
          <Badge className={`${getTypeColor(rateCard?.type || selectedEmployee?.type)} w-fit mt-2`}>
            {rateCard?.type || selectedEmployee?.type}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Dropdown (only for add) */}
          {!rateCard && (
            <div className="mb-4">
              <label className="font-semibold mb-1 block text-purple-800">Select Employee</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="border rounded p-3 w-full flex items-center justify-between text-base font-medium min-h-[48px]"
                  >
                    {selectedEmployee
                      ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                      : <span className="text-gray-400">Select employee...</span>}
                    <ChevronsUpDown className="ml-2 h-5 w-5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[380px]">
                  <Command>
                    <CommandInput placeholder="Search employees..." className="h-12 text-base px-4" />
                    <CommandList className="max-h-72">
                      {employees.map(emp => (
                        <CommandItem
                          key={emp.id}
                          value={`${emp.first_name} ${emp.last_name}`}
                          onSelect={() => setSelectedEmployee(emp)}
                          className="flex items-center gap-3 px-4 py-3 text-base cursor-pointer hover:bg-accent"
                        >
                          <span>{emp.first_name} {emp.last_name}</span>
                          {selectedEmployee?.id === emp.id && <Check className="h-5 w-5 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
          {/* Show selected employee name/type if present */}
          {selectedEmployee && !rateCard && (
            <div className="mb-2 flex items-center gap-3">
              <span className="font-semibold text-purple-900 text-lg">{selectedEmployee.first_name} {selectedEmployee.last_name}</span>
              <Badge className={`${getTypeColor(selectedEmployee.type)} w-fit`}>{selectedEmployee.type}</Badge>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="regular_rate" className="text-purple-800 font-semibold">
                Regular Rate ($/hour)
              </Label>
              <Input
                id="regular_rate"
                type="number"
                step="0.01"
                min="0"
                {...register('regular_rate', { valueAsNumber: true })}
                placeholder="0.00"
                className="border-2 border-purple-200 focus:border-purple-500 text-lg p-3"
                disabled={!selectedEmployee && !rateCard}
              />
              {errors.regular_rate && (
                <p className="text-sm text-red-500 font-medium">{errors.regular_rate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtime_rate" className="text-purple-800 font-semibold">
                Overtime Rate ($/hour)
              </Label>
              <Input
                id="overtime_rate"
                type="number"
                step="0.01"
                min="0"
                {...register('overtime_rate', { valueAsNumber: true })}
                placeholder="0.00"
                className="border-2 border-purple-200 focus:border-purple-500 text-lg p-3"
                disabled={!selectedEmployee && !rateCard}
              />
              {errors.overtime_rate && (
                <p className="text-sm text-red-500 font-medium">{errors.overtime_rate.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-lg font-medium"
            >
              {loading ? 'Updating...' : 'Update Rates'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 px-6 py-3 text-lg font-medium"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RateCardForm;
