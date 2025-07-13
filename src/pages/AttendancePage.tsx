
import { useState } from 'react';
import AttendanceForm from '@/components/attendance/AttendanceForm';
import AttendanceList from '@/components/attendance/AttendanceList';

const AttendancePage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingAttendance(null);
    setShowForm(true);
  };

  const handleEdit = (attendance: any) => {
    setEditingAttendance(attendance);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingAttendance(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAttendance(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Attendance Management</h2>
        <p className="text-orange-100 mt-2">
          Track employee attendance and work hours with full CRUD operations
        </p>
      </div>
      
      {showForm ? (
        <AttendanceForm
          attendance={editingAttendance}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <AttendanceList
          onEdit={handleEdit}
          onAdd={handleAdd}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
};

export default AttendancePage;
