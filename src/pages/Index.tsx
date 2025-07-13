
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Clock, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Activity,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardCards from '@/components/dashboard/DashboardCards';
import RecentAttendance from '@/components/dashboard/RecentAttendance';
import TopPayroll from '@/components/dashboard/TopPayroll';

const Index = () => {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-yellow-500 text-white p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2"> Dashboard</h1>
            <p className="text-orange-100 text-base sm:text-lg">
              Streamline your construction management operations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Activity className="w-4 h-4 mr-1" />
              Live Updates
            </Badge>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <DashboardCards />

      {/* Recent Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAttendance />
        <TopPayroll />
      </div>
    </div>
  );
};

export default Index;
