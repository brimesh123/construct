
import { useState } from 'react';
import JobSiteForm from '@/components/jobsites/JobSiteForm';
import JobSiteList from '@/components/jobsites/JobSiteList';

const JobSitesPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingJobSite, setEditingJobSite] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingJobSite(null);
    setShowForm(true);
  };

  const handleEdit = (jobSite: any) => {
    setEditingJobSite(jobSite);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setShowForm(false);
    setEditingJobSite(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingJobSite(null);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-xl shadow-xl border-2 border-green-300">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Job Site Management</h2>
        <p className="text-green-100 mt-2 text-lg">
          Manage construction job sites, projects, and their status
        </p>
      </div>
      
      {showForm ? (
        <JobSiteForm
          jobSite={editingJobSite}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <JobSiteList
          onEdit={handleEdit}
          onAdd={handleAdd}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
};

export default JobSitesPage;
