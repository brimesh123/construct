
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
    <div className="space-y-6">
    
      
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
