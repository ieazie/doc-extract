import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: ${props => props.theme.spacing.lg};
`;

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  padding: ${props => props.theme.spacing.xl};
  box-shadow: ${props => props.theme.shadows.xl};
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.xl};
  color: ${props => props.theme.colors.primary};
`;

const LogoIcon = styled(Shield)`
  width: 32px;
  height: 32px;
`;

const LogoText = styled.h1`
  font-size: ${props => props.theme.typography.sizes['2xl']};
  font-weight: ${props => props.theme.typography.weights.bold};
  margin: 0;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.typography.sizes.xl};
  font-weight: ${props => props.theme.typography.weights.semibold};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const InputGroup = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.md} ${props => props.theme.spacing.md} 48px;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.sizes.base};
  transition: all ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}15;
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.text.muted};
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: ${props => props.theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.theme.colors.text.muted};
  pointer-events: none;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: ${props => props.theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.muted};
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  transition: color ${props => props.theme.animation.duration.fast} ${props => props.theme.animation.easing.easeInOut};
  
  &:hover {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const LoginButton = styled(Button)`
  width: 100%;
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.sizes.base};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const DemoCredentials = styled.div`
  margin-top: ${props => props.theme.spacing.lg};
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.colors.surfaceHover};
  border-radius: ${props => props.theme.borderRadius.md};
  border-left: 4px solid ${props => props.theme.colors.primary};
`;

const DemoTitle = styled.h4`
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  color: ${props => props.theme.colors.text.primary};
  font-size: ${props => props.theme.typography.sizes.sm};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

const DemoText = styled.p`
  margin: 0;
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.typography.sizes.sm};
  line-height: 1.5;
`;

const DemoCredentialsList = styled.div`
  margin-top: ${props => props.theme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const DemoCredential = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${props => props.theme.typography.sizes.xs};
  font-family: ${props => props.theme.typography.fonts.mono};
`;

const DemoLabel = styled.span`
  color: ${props => props.theme.colors.text.muted};
`;

const DemoValue = styled.span`
  color: ${props => props.theme.colors.text.primary};
  font-weight: ${props => props.theme.typography.weights.medium};
`;

export const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(formData);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const fillDemoCredentials = (type: 'admin' | 'user' | 'system_admin') => {
    if (type === 'admin') {
      setFormData({
        email: 'admin@docextract.com',
        password: 'admin123'
      });
    } else if (type === 'user') {
      setFormData({
        email: 'user@docextract.com',
        password: 'admin123'
      });
    } else if (type === 'system_admin') {
      setFormData({
        email: 'system@docextract.com',
        password: 'system123'
      });
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <LogoIcon />
          <LogoText>DocExtract</LogoText>
        </Logo>
        
        <Title>Welcome Back</Title>
        
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <InputIcon>
              <Mail size={20} />
            </InputIcon>
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </InputGroup>

          <InputGroup>
            <InputIcon>
              <Lock size={20} />
            </InputIcon>
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
            <PasswordToggle
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </PasswordToggle>
          </InputGroup>

          {error && <ErrorMessage message={error} />}

          <LoginButton
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
          >
            {isLoading ? <LoadingSpinner size={16} /> : 'Sign In'}
          </LoginButton>
        </Form>

        <DemoCredentials>
          <DemoTitle>Demo Credentials</DemoTitle>
          <DemoText>Use these credentials to test the application:</DemoText>
          <DemoCredentialsList>
            <DemoCredential>
              <DemoLabel>System Admin:</DemoLabel>
              <DemoValue>system@docextract.com / system123</DemoValue>
            </DemoCredential>
            <DemoCredential>
              <DemoLabel>Tenant Admin:</DemoLabel>
              <DemoValue>admin@docextract.com / admin123</DemoValue>
            </DemoCredential>
            <DemoCredential>
              <DemoLabel>User:</DemoLabel>
              <DemoValue>user@docextract.com / admin123</DemoValue>
            </DemoCredential>
          </DemoCredentialsList>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outline"
              onClick={() => fillDemoCredentials('system_admin')}
              disabled={isLoading}
            >
              Fill System Admin
            </Button>
            <Button
              size="small"
              variant="outline"
              onClick={() => fillDemoCredentials('admin')}
              disabled={isLoading}
            >
              Fill Tenant Admin
            </Button>
            <Button
              size="small"
              variant="outline"
              onClick={() => fillDemoCredentials('user')}
              disabled={isLoading}
            >
              Fill User
            </Button>
          </div>
        </DemoCredentials>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginForm;
