import React, { useId } from 'react';
import { 
  FormGroup,
  Label,
  InputContainer,
  Input,
  StatusIndicator,
  HelpText
} from './ApiKeyInput.styled';

interface ApiKeyInputProps {
  label: string;
  value: string;
  hasKey: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  label,
  value,
  hasKey,
  onChange,
  placeholder
}) => {
  const inputId = useId();
  const defaultPlaceholder = hasKey 
    ? "Enter new API key to rotate" 
    : "No key set - enter one";

  return (
    <FormGroup>
      <Label htmlFor={inputId}>{label}</Label>
      <InputContainer>
        <Input
          id={inputId}
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || defaultPlaceholder}
          hasKey={hasKey}
        />
        {hasKey && (
          <StatusIndicator>
            <span>✓ Set</span>
          </StatusIndicator>
        )}
      </InputContainer>
      <HelpText>
        {hasKey ? (
          <>✓ API key is configured. Enter a new key above to rotate it.</>
        ) : (
          <>⚠️ No API key set - authentication will not work properly</>
        )}
      </HelpText>
    </FormGroup>
  );
};

export default ApiKeyInput;
