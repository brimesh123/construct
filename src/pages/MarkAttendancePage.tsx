import { useState } from 'react';
import MarkAttendanceJobSiteList from '@/components/attendance/MarkAttendanceJobSiteList';
import MarkAttendanceForm from '@/components/attendance/MarkAttendanceForm';

const MarkAttendancePage = () => {
  const [selectedJobSite, setSelectedJobSite] = useState(null);

  return (
    <div className="space-y-6">
      {!selectedJobSite ? (
        <MarkAttendanceJobSiteList onMarkAttendance={setSelectedJobSite} />
      ) : (
        <MarkAttendanceForm jobSite={selectedJobSite} onBack={() => setSelectedJobSite(null)} />
      )}
    </div>
  );
};

export default MarkAttendancePage; 