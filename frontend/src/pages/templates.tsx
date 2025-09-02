import React, { useState } from 'react';
import styled from 'styled-components';
import TemplateList from '../components/templates/TemplateList';
import TemplateForm from '../components/templates/TemplateForm';
import { TemplateBase, TemplateFull } from '../types/templates';
import { apiClient } from '../services/api';

const TemplatesPageContainer = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
`;

const TemplatesPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<TemplateFull | undefined>();

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setCurrentView('create');
  };

  const handleEditTemplate = async (template: TemplateBase) => {
    try {
      const fullTemplate = await apiClient.getTemplate(template.id);
      setEditingTemplate(fullTemplate);
      setCurrentView('edit');
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      // Fallback to basic template for now
      setEditingTemplate(template as any);
      setCurrentView('edit');
    }
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
      {renderContent()}
    </TemplatesPageContainer>
  );
};

export default TemplatesPage;
