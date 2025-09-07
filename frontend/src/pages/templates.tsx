import React, { useState } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import TemplateList from '../components/templates/TemplateList';
import TemplateForm from '../components/templates/TemplateForm';
import { TemplateBase, TemplateFull } from '../types/templates';
import { apiClient } from '../services/api';

const TemplatesPageContainer = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
`;

const Header = styled.div`
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #2563eb;
  }
`;

const TemplatesPage: React.FC = () => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<TemplateFull | undefined>();

  const handleCreateTemplate = () => {
    router.push('/templates/new');
  };

  const handleEditTemplate = (template: TemplateBase) => {
    router.push(`/templates/builder?id=${template.id}`);
  };

  const handleSave = () => {
    setCurrentView('list');
    setEditingTemplate(undefined);
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingTemplate(undefined);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return (
          <TemplateForm
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      case 'edit':
        return (
          <TemplateForm
            template={editingTemplate}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <TemplateList
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
          />
        );
    }
  };

  return (
    <TemplatesPageContainer>
      <Header>
        <HeaderTitle>Templates</HeaderTitle>
        <CreateButton onClick={handleCreateTemplate}>
          <Plus size={16} />
          Create New Template
        </CreateButton>
      </Header>
      {renderContent()}
    </TemplatesPageContainer>
  );
};

export default TemplatesPage;
