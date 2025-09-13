import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../components/dashboard/Dashboard';
import SystemAdminDashboard from '../components/dashboard/SystemAdminDashboard';
import TenantAdminDashboard from '../components/dashboard/TenantAdminDashboard';

export default function HomePage() {
  const { user, isSystemAdmin, isTenantAdmin } = useAuth();

  const renderDashboard = () => {
    if (isSystemAdmin()) {
      return <SystemAdminDashboard />;
    }
    if (isTenantAdmin()) {
      return <TenantAdminDashboard />;
    }
    return <Dashboard />;
  };

  return (
    <>
      <Head>
        <title>Document Extraction Platform</title>
        <meta name="description" content="Extract structured data from documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {renderDashboard()}
    </>
  );
}