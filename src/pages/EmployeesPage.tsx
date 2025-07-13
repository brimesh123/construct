
import { useState } from 'react';
import EmployeeForm from '@/components/employees/EmployeeForm';
import EmployeeList from '@/components/employees/EmployeeList';

const EmployeesPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="space-y-6 p-4 sm:p-0">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Employee Management</h2>
        <p className="text-blue-100 mt-2">
          Manage your construction team members and their information
        </p>
      </div>
      
      {showForm ? (
        <EmployeeForm
          employee={editingEmployee}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <EmployeeList
          onEdit={handleEdit}
          onAdd={handleAdd}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
};

export default EmployeesPage;
