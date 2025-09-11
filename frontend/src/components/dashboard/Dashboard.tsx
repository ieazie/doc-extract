/**
 * Main dashboard component with role-based rendering
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import ViewerDashboard from './ViewerDashboard';

// Component
export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Render role-specific dashboard
  if (!user) {
    return <div>Loading...</div>;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'user':
      return <UserDashboard />;
    case 'viewer':
      return <ViewerDashboard />;
    default:
      return <UserDashboard />; // Default to user dashboard
  }
};

export default Dashboard;