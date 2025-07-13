
import WeeklyReport from '@/components/reports/WeeklyReport';

const WeeklyReportPage = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-white">Weekly Reports</h2>
        <p className="text-orange-100 mt-2">
          Generate comprehensive weekly attendance and payroll summaries
        </p>
      </div>
      
      <WeeklyReport />
    </div>
  );
};

export default WeeklyReportPage;
