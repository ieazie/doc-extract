import Head from 'next/head';
import styled from 'styled-components';
import { useState, useEffect } from 'react';

import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.xl};
`;

const Hero = styled.div`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing['4xl']};
`;

const Title = styled.h1`
  font-size: ${props => props.theme.typography.sizes['5xl']};
  font-weight: ${props => props.theme.typography.weights.bold};
  margin-bottom: ${props => props.theme.spacing.lg};
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primaryLight});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: ${props => props.theme.typography.sizes.xl};
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing.xl};
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${props => props.theme.spacing.xl};
  margin-bottom: ${props => props.theme.spacing['4xl']};
`;

const StatusSection = styled.div`
  margin-top: ${props => props.theme.spacing['4xl']};
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${props => props.theme.spacing.lg};
`;

const StatusCard = styled(Card)<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'loading' }>`
  border-left: 4px solid ${props => {
    switch (props.status) {
      case 'healthy': return props.theme.colors.success;
      case 'degraded': return props.theme.colors.warning;
      case 'unhealthy': return props.theme.colors.error;
      default: return props.theme.colors.border;
    }
  }};
`;

const StatusIndicator = styled.div<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'loading' }>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => {
      switch (props.status) {
        case 'healthy': return props.theme.colors.success;
        case 'degraded': return props.theme.colors.warning;
        case 'unhealthy': return props.theme.colors.error;
        default: return props.theme.colors.border;
      }
    }};
  }
`;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      message: string;
    };
  };
}

export default function HomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health/detailed');
        if (response.ok) {
          const data = await response.json();
          setHealthStatus(data);
        }
      } catch (error) {
        console.error('Failed to check health:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <Head>
        <title>Document Extraction Platform</title>
        <meta name="description" content="Extract structured data from documents using AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container>
        <Hero>
          <Title>Document Extraction Platform</Title>
          <Subtitle>
            Transform unstructured documents into structured data using advanced AI and LLMs.
            Extract key information from invoices, contracts, and insurance policies with ease.
          </Subtitle>
          <Button size="large" onClick={() => window.location.href = '/documents'}>
            Get Started
          </Button>
        </Hero>

        <FeatureGrid>
          <Card>
            <h3>Smart Document Processing</h3>
            <p>Upload PDFs, DOCX, and text files. Our system automatically extracts and structures the content using advanced text processing techniques.</p>
          </Card>
          
          <Card>
            <h3>AI-Powered Extraction</h3>
            <p>Leverage LangExtract and Gemma 3 LLM to intelligently identify and extract structured data from your documents with high accuracy.</p>
          </Card>
          
          <Card>
            <h3>Custom Templates</h3>
            <p>Create reusable extraction templates for different document types. Define fields, validation rules, and examples for consistent results.</p>
          </Card>
          
          <Card>
            <h3>Human-in-the-Loop</h3>
            <p>Review and correct extractions with confidence scores. Build feedback loops to continuously improve extraction accuracy.</p>
          </Card>
        </FeatureGrid>

        <StatusSection>
          <h2>System Status</h2>
          <StatusGrid>
            {isLoading ? (
              <StatusCard status="loading">
                <h4>System Health</h4>
                <StatusIndicator status="loading">
                  Checking services...
                </StatusIndicator>
              </StatusCard>
            ) : healthStatus ? (
              <>
                <StatusCard status={healthStatus.status}>
                  <h4>Overall Status</h4>
                  <StatusIndicator status={healthStatus.status}>
                    {healthStatus.status.charAt(0).toUpperCase() + healthStatus.status.slice(1)}
                  </StatusIndicator>
                </StatusCard>
                
                {Object.entries(healthStatus.services).map(([service, info]) => (
                  <StatusCard key={service} status={info.status}>
                    <h4>{service.charAt(0).toUpperCase() + service.slice(1)}</h4>
                    <StatusIndicator status={info.status}>
                      {info.status.charAt(0).toUpperCase() + info.status.slice(1)}
                    </StatusIndicator>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                      {info.message}
                    </p>
                  </StatusCard>
                ))}
              </>
            ) : (
              <StatusCard status="unhealthy">
                <h4>System Health</h4>
                <StatusIndicator status="unhealthy">
                  Unable to connect to backend
                </StatusIndicator>
              </StatusCard>
            )}
          </StatusGrid>
        </StatusSection>
      </Container>
    </Layout>
  );
}

