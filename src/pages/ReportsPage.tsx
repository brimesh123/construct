
import PayrollReport from '@/components/reports/PayrollReport';

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Payroll Reports</h2>
        <p className="text-orange-100 mt-2">
          Generate detailed attendance and payroll reports
        </p>
      </div>
      
      <PayrollReport />
    </div>
  );
};

export default ReportsPage;
