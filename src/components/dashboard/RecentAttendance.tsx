import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  shift_hours: number | null;
  employee: {
    first_name: string;
    last_name: string;
  };
  jobsite: {
    name: string;
  };
}

const RecentAttendance = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentAttendance();
  }, []);

  const fetchRecentAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          start_time,
          end_time,
          shift_hours,
          employee:employees!attendance_employee_id_fkey (
            first_name,
            last_name
          ),
          jobsite:job_sites!attendance_jobsite_id_fkey (
            name
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent attendance:', error);
        return;
      }

      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Attendance
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
          <Clock className="h-5 w-5" />
          Recent Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attendance.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent attendance records</p>
        ) : (
          <div className="space-y-4">
            {attendance.map((record) => (
              <div key={record.id} className="border-l-4 border-primary pl-4 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {record.employee?.first_name} {record.employee?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{record.jobsite?.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(record.date), 'MMM dd, yyyy')} • {record.start_time} - {record.end_time}
                      {record.shift_hours && (
                        <span className="ml-2">({record.shift_hours}h)</span>
                      )}
                    </div>
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

export default RecentAttendance;