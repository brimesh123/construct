
import DashboardCards from '@/components/dashboard/DashboardCards';
import RecentAttendance from '@/components/dashboard/RecentAttendance';
import TopPayroll from '@/components/dashboard/TopPayroll';
import { Construction } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <Construction className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate"> Dashboard</h1>
            <p className="text-orange-100 text-sm sm:text-base truncate">
              Welcome to your construction management system
            </p>
          </div>
        </div>
      </div>
      
      <DashboardCards />
      
      <div className="grid gap-6 md:grid-cols-2">
        <RecentAttendance />
        <TopPayroll />
      </div>
    </div>
  );
};

export default Dashboard;
