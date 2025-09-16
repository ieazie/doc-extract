/**
 * User-Friendly Cron Expression Builder Component
 * Phase 10.6: Scheduling & Recurring Jobs
 */
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Repeat } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import styled from 'styled-components';

// Styled Components
const CronBuilderContainer = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  background-color: #f8fafc;
`;

const CronBuilderTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CronGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
`;

const CronField = styled.div`
  display: flex;
  flex-direction: column;
`;

const CronFieldLabel = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CronExpressionDisplay = styled.div`
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #1e293b;
  text-align: center;
  margin-bottom: 12px;
`;

const CronDescription = styled.div`
  font-size: 12px;
  color: #64748b;
  text-align: center;
  font-style: italic;
`;

// Preset options
const PRESET_OPTIONS = [
  { value: '0 9 * * 1-5', label: 'Weekdays at 9 AM' },
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 0 * * 0', label: 'Weekly on Sunday' },
  { value: '0 0 1 * *', label: 'Monthly on 1st' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 0 0 * *', label: 'Daily at midnight' },
  { value: '30 14 * * *', label: 'Daily at 2:30 PM' },
];

// Time options
const MINUTE_OPTIONS = [
  { value: '*', label: 'Every minute' },
  { value: '0', label: 'At minute 0' },
  { value: '15', label: 'At minute 15' },
  { value: '30', label: 'At minute 30' },
  { value: '45', label: 'At minute 45' },
];

const HOUR_OPTIONS = [
  { value: '*', label: 'Every hour' },
  { value: '0', label: 'Midnight (12 AM)' },
  { value: '6', label: '6 AM' },
  { value: '9', label: '9 AM' },
  { value: '12', label: 'Noon (12 PM)' },
  { value: '14', label: '2 PM' },
  { value: '18', label: '6 PM' },
  { value: '21', label: '9 PM' },
];

const DAY_OPTIONS = [
  { value: '*', label: 'Every day' },
  { value: '1', label: '1st of month' },
  { value: '15', label: '15th of month' },
  { value: 'L', label: 'Last day of month' },
];

const MONTH_OPTIONS = [
  { value: '*', label: 'Every month' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const WEEKDAY_OPTIONS = [
  { value: '*', label: 'Every day of week' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
  { value: '1-5', label: 'Weekdays (Mon-Fri)' },
  { value: '0,6', label: 'Weekends (Sat-Sun)' },
];

interface CronBuilderProps {
  value?: string;
  onChange: (cronExpression: string) => void;
}

export const CronBuilder: React.FC<CronBuilderProps> = ({ value = '', onChange }) => {
  const [cronParts, setCronParts] = useState(['0', '9', '*', '*', '*']);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from value prop (only once)
  useEffect(() => {
    if (value && !isInitialized) {
      const parts = value.split(' ');
      if (parts.length === 5) {
        setCronParts(parts);
        setIsInitialized(true);
      }
    }
  }, [value, isInitialized]);

  // Update cron expression when parts change (but not during initialization)
  useEffect(() => {
    if (isInitialized) {
      const cronExpression = cronParts.join(' ');
      if (cronExpression !== value) {
        onChange(cronExpression);
      }
    }
  }, [cronParts, onChange, value, isInitialized]);

  const handlePresetChange = (presetValue: string) => {
    setSelectedPreset(presetValue);
    if (presetValue) {
      const parts = presetValue.split(' ');
      setCronParts(parts);
      setIsInitialized(true);
      onChange(presetValue);
    } else {
      // Reset to default when custom is selected
      setIsInitialized(true);
    }
  };

  const handlePartChange = (index: number, newValue: string) => {
    const newParts = [...cronParts];
    newParts[index] = newValue;
    setCronParts(newParts);
    setSelectedPreset('');
    setIsInitialized(true);
  };

  const getCronDescription = (parts: string[]) => {
    const [minute, hour, day, month, weekday] = parts;
    
    let description = '';
    
    // Hour and minute
    if (hour !== '*' && hour !== '' && minute !== '*' && minute !== '') {
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      
      if (!isNaN(hourNum) && !isNaN(minuteNum)) {
        const timeStr = hourNum === 0 ? '12 AM' : 
                       hourNum === 12 ? '12 PM' :
                       hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
        description += `At ${timeStr}`;
        if (minuteNum > 0) {
          description += `:${minuteNum.toString().padStart(2, '0')}`;
        }
      }
    } else if (hour !== '*' && hour !== '') {
      const hourNum = parseInt(hour);
      
      if (!isNaN(hourNum)) {
        const timeStr = hourNum === 0 ? 'midnight' : 
                       hourNum === 12 ? 'noon' :
                       hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
        description += `At ${timeStr}`;
      }
    } else if (minute !== '*' && minute !== '') {
      description += `At minute ${minute}`;
    }
    
    // Frequency
    if (day !== '*' || month !== '*' || weekday !== '*') {
      if (day !== '*' && month !== '*') {
        description += ` on day ${day} of ${month}`;
      } else if (weekday !== '*') {
        if (weekday === '1-5') {
          description += ' on weekdays';
        } else if (weekday === '0,6') {
          description += ' on weekends';
        } else {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayNum = parseInt(weekday);
          if (dayNum >= 0 && dayNum <= 6) {
            description += ` on ${dayNames[dayNum]}`;
          }
        }
      } else if (day !== '*') {
        description += ` on day ${day} of the month`;
      } else if (month !== '*') {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthNum = parseInt(month);
        if (monthNum >= 1 && monthNum <= 12) {
          description += ` in ${monthNames[monthNum]}`;
        }
      }
    }
    
    return description || 'Custom schedule';
  };

  return (
    <CronBuilderContainer>
      <CronBuilderTitle>
        <Clock size={16} />
        Schedule Builder
      </CronBuilderTitle>

      {/* Preset Options */}
      <CronField style={{ marginBottom: '16px' }}>
        <CronFieldLabel>Quick Presets</CronFieldLabel>
        <Dropdown
          value={selectedPreset}
          onChange={handlePresetChange}
          options={[
            { value: '', label: 'Custom schedule' },
            ...PRESET_OPTIONS
          ]}
          placeholder="Choose a preset or build custom"
        />
      </CronField>

      {/* Cron Expression Display */}
      <CronExpressionDisplay>
        {cronParts.join(' ')}
      </CronExpressionDisplay>
      
      <CronDescription>
        {getCronDescription(cronParts)}
      </CronDescription>

      {/* Cron Builder Fields */}
      <CronGrid>
        <CronField>
          <CronFieldLabel>Minute</CronFieldLabel>
          <Dropdown
            value={cronParts[0]}
            onChange={(value) => handlePartChange(0, value)}
            options={MINUTE_OPTIONS}
            placeholder="Select minute"
          />
        </CronField>

        <CronField>
          <CronFieldLabel>Hour</CronFieldLabel>
          <Dropdown
            value={cronParts[1]}
            onChange={(value) => handlePartChange(1, value)}
            options={HOUR_OPTIONS}
            placeholder="Select hour"
          />
        </CronField>

        <CronField>
          <CronFieldLabel>Day of Month</CronFieldLabel>
          <Dropdown
            value={cronParts[2]}
            onChange={(value) => handlePartChange(2, value)}
            options={DAY_OPTIONS}
            placeholder="Select day"
          />
        </CronField>

        <CronField>
          <CronFieldLabel>Month</CronFieldLabel>
          <Dropdown
            value={cronParts[3]}
            onChange={(value) => handlePartChange(3, value)}
            options={MONTH_OPTIONS}
            placeholder="Select month"
          />
        </CronField>

        <CronField>
          <CronFieldLabel>Day of Week</CronFieldLabel>
          <Dropdown
            value={cronParts[4]}
            onChange={(value) => handlePartChange(4, value)}
            options={WEEKDAY_OPTIONS}
            placeholder="Select weekday"
          />
        </CronField>
      </CronGrid>
    </CronBuilderContainer>
  );
};

export default CronBuilder;
