import Head from 'next/head';
import Dashboard from '../components/dashboard/Dashboard';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Document Extraction Platform</title>
        <meta name="description" content="Extract structured data from documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Dashboard />
    </>
  );
}