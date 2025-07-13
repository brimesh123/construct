
import MasterReport from '@/components/reports/MasterReport';

const MasterReportPage = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Master Reports</h2>
        <p className="text-orange-100 mt-2">
          Complete overview of all projects, employees, and financial data
        </p>
      </div>
      
      <MasterReport />
    </div>
  );
};

export default MasterReportPage;
