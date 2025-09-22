/**
 * Jobs Management Page
 * Phase 10.4: Frontend Job Management
 */
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { JobList, JobModal, JobDetails } from '@/components/jobs';
import { Job } from '@/services/api/index';
import { SuccessMessage } from '@/components/common/SuccessMessage';

type ViewMode = 'list' | 'details' | 'create' | 'edit';

const JobsPage: React.FC = () => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleJobCreate = () => {
    setSelectedJob(null);
    setViewMode('create');
  };

  const handleJobEdit = (job: Job) => {
    setSelectedJob(job);
    setViewMode('edit');
  };

  const handleJobDetails = (job: Job) => {
    setSelectedJob(job);
    setViewMode('details');
  };

  const handleJobExecute = (job: Job) => {
    setSuccessMessage(`Job "${job.name}" execution started successfully!`);
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleJobSave = (job: Job) => {
    if (viewMode === 'create') {
      setSuccessMessage(`Job "${job.name}" created successfully!`);
    } else {
      setSuccessMessage(`Job "${job.name}" updated successfully!`);
    }
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
    
    // Return to list view
    setViewMode('list');
    setSelectedJob(null);
  };

  const handleJobDelete = async (job: Job) => {
    setSuccessMessage(`Job "${job.name}" deleted successfully!`);
    // Auto-hide success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
    
    // Return to list view if we're viewing this job's details
    if (viewMode === 'details' && selectedJob?.id === job.id) {
      setViewMode('list');
      setSelectedJob(null);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedJob(null);
  };

  const handleCloseModal = () => {
    setViewMode('list');
    setSelectedJob(null);
  };

  return (
    <>
      {successMessage && (
        <SuccessMessage message={successMessage} />
      )}

      {viewMode === 'list' && (
        <JobList
          onJobCreate={handleJobCreate}
          onJobEdit={handleJobEdit}
          onJobExecute={handleJobExecute}
          onJobDetails={handleJobDetails}
        />
      )}

      {viewMode === 'details' && selectedJob && (
        <JobDetails
          jobId={selectedJob.id}
          onBack={handleBackToList}
          onEdit={handleJobEdit}
          onDelete={handleJobDelete}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <JobModal
          isOpen={true}
          onClose={handleCloseModal}
          onSave={handleJobSave}
          job={viewMode === 'edit' ? selectedJob : null}
        />
      )}
    </>
  );
};

export default JobsPage;
