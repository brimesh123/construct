
import EmployeeReports from '@/components/reports/EmployeeReports';

const EmployeeReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Employee Reports</h2>
        <p className="text-orange-100 mt-2">
          Detailed reports on individual employee performance and attendance
        </p>
      </div>
      
      <EmployeeReports />
    </div>
  );
};

export default EmployeeReportsPage;
