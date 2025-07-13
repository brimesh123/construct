
import ProjectManagerList from '@/components/projectmanager/ProjectManagerList';

const ProjectManagerPage = () => {
  return (
    <div className="space-y-6 p-4 sm:p-0">
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Project Manager Management</h2>
        <p className="text-orange-100 mt-2">
          Manage project managers, their assignments, and track their status
        </p>
      </div>
      
      <ProjectManagerList />
    </div>
  );
};

export default ProjectManagerPage;
