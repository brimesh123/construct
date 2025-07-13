import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, User } from 'lucide-react';

interface PayrollRecord {
  employee_id: string;
  first_name: string;
  last_name: string;
  total_pay: number;
  total_hours: number;
}

const TopPayroll = () => {
  const [topPayroll, setTopPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPayroll();
  }, []);

  const fetchTopPayroll = async () => {
    try {
      // Get current month's payroll data
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(endOfMonth).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('pay_report_view')
        .select('employee_id, first_name, last_name, total_pay, shift_hours')
        .gte('date', startOfMonth)
        .lte('date', endOfMonthStr);

      if (error) {
        console.error('Error fetching top payroll:', error);
        return;
      }

      // Aggregate by employee
      const employeePayroll = new Map<string, PayrollRecord>();
      
      data?.forEach((record) => {
        const key = record.employee_id;
        if (!key) return;

        if (employeePayroll.has(key)) {
          const existing = employeePayroll.get(key)!;
          existing.total_pay += parseFloat(String(record.total_pay || 0));
          existing.total_hours += parseFloat(String(record.shift_hours || 0));
        } else {
          employeePayroll.set(key, {
            employee_id: key,
            first_name: record.first_name || '',
            last_name: record.last_name || '',
            total_pay: parseFloat(String(record.total_pay || 0)),
            total_hours: parseFloat(String(record.shift_hours || 0)),
          });
        }
      });

      // Convert to array and sort by total pay
      const sortedPayroll = Array.from(employeePayroll.values())
        .sort((a, b) => b.total_pay - a.total_pay)
        .slice(0, 5);

      setTopPayroll(sortedPayroll);
    } catch (error) {
      console.error('Error fetching top payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Top Payroll This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Top Payroll This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topPayroll.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No payroll data available</p>
        ) : (
          <div className="space-y-4">
            {topPayroll.map((record, index) => (
              <div key={record.employee_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {record.first_name} {record.last_name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.total_hours.toFixed(1)} hours
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">
                    ${record.total_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    <span>Monthly</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopPayroll;