
import { useState } from 'react';
import AttendanceForm from '@/components/attendance/AttendanceForm';
import AttendanceList from '@/components/attendance/AttendanceList';

const AttendancePage = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      
        <AttendanceList
        onEdit={() => {}}
        onAdd={() => {}}
          refreshTrigger={refreshTrigger}
        />
    </div>
  );
};

export default AttendancePage;
