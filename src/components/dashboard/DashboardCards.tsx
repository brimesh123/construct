
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Clock, DollarSign, TrendingUp, Activity } from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  totalPMs: number;
  totalJobSites: number;
  activeJobSites: number;
  todayAttendance: number;
  totalPayroll: number;
}

const DashboardCards = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalPMs: 0,
    totalJobSites: 0,
    activeJobSites: 0,
    todayAttendance: 0,
    totalPayroll: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get employee counts
      const { data: employees } = await supabase
        .from('employees')
        .select('type');

      const totalEmployees = employees?.length || 0;
      const totalPMs = employees?.filter(emp => emp.type === 'PM').length || 0;

      // Get job site counts
      const { data: jobSites } = await supabase
        .from('job_sites')
        .select('status');

      const totalJobSites = jobSites?.length || 0;
      const activeJobSites = jobSites?.filter(site => site.status === 'Active').length || 0;

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendanceData } = await supabase
        .from('attendance')
        .select('id')
        .eq('date', today);

      const todayAttendance = todayAttendanceData?.length || 0;

      // Get total payroll from pay_report_view for current month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(endOfMonth).padStart(2, '0')}`;

      console.log('Fetching payroll for:', { startOfMonth, endOfMonthStr });

      const { data: payrollData, error: payrollError } = await supabase
        .from('pay_report_view')
        .select('total_pay')
        .gte('date', startOfMonth)
        .lte('date', endOfMonthStr);

      if (payrollError) {
        console.error('Payroll fetch error:', payrollError);
      }

      console.log('Payroll data:', payrollData);

      const totalPayroll = payrollData?.reduce((sum, record) => {
        const pay = parseFloat(String(record.total_pay || 0));
        return sum + (isNaN(pay) ? 0 : pay);
      }, 0) || 0;

      console.log('Calculated total payroll:', totalPayroll);

      setStats({
        totalEmployees,
        totalPMs,
        totalJobSites,
        activeJobSites,
        todayAttendance,
        totalPayroll,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Project Managers',
      value: stats.totalPMs,
      icon: Users,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Total Job Sites',
      value: stats.totalJobSites,
      icon: MapPin,
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Active Job Sites',
      value: stats.activeJobSites,
      icon: Activity,
      color: 'bg-gradient-to-r from-orange-500 to-orange-600',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: Clock,
      color: 'bg-gradient-to-r from-red-500 to-red-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      title: 'Monthly Payroll',
      value: `$${stats.totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Loading...</CardTitle>
              <div className="bg-gray-200 p-2 rounded-lg animate-pulse">
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`border-2 ${card.borderColor} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}>
            <CardHeader className={`${card.bgColor} flex flex-row items-center justify-between space-y-0 pb-2 rounded-t-lg`}>
              <CardTitle className={`text-sm font-medium ${card.textColor} truncate`}>{card.title}</CardTitle>
              <div className={`${card.color} p-2 rounded-lg shadow-md flex-shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className={`text-xl sm:text-2xl font-bold ${card.textColor} truncate`}>{card.value}</div>
              <div className="flex items-center mt-2">
                <TrendingUp className={`h-3 w-3 ${card.textColor} mr-1 flex-shrink-0`} />
                <span className="text-xs text-gray-500 truncate">This month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardCards;
