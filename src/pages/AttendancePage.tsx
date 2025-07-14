
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
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Attendance Management</h2>
        <p className="text-orange-100 mt-2">
          Track employee attendance and work hours with full CRUD operations
        </p>
      </div>
      <AttendanceList
        onEdit={() => {}}
        onAdd={() => {}}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
};

export default AttendancePage;
