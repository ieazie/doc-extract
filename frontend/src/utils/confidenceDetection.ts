/**
 * Confidence Detection Utilities
 * Handles automatic detection of low-confidence fields in extraction results
 */

export interface ConfidenceField {
  path: string;
  name: string;
  type: string;
  value: any;
  confidence: number;
  isLowConfidence: boolean;
  threshold: number;
}

export interface ConfidenceDetectionResult {
  flaggedFields: ConfidenceField[];
  totalFields: number;
  flaggedCount: number;
  overallConfidence: number;
  threshold: number;
}

/**
 * Default confidence threshold for flagging low-confidence fields
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Detect low-confidence fields in extraction results
 */
export function detectLowConfidenceFields(
  results: Record<string, any>,
  confidenceScores: Record<string, number> | null = null,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): ConfidenceDetectionResult {
  // If no confidence scores provided, return empty result
  if (!confidenceScores) {
    return {
      flaggedFields: [],
      totalFields: 0,
      flaggedCount: 0,
      overallConfidence: 0,
      threshold
    };
  }

  const flaggedFields: ConfidenceField[] = [];
  let totalFields = 0;
  let totalConfidence = 0;

  // Recursively traverse the results to find all fields
  const traverseFields = (
    data: any,
    path: string = '',
    parentName: string = ''
  ): void => {
    if (data === null || data === undefined) {
      return;
    }

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const currentPath = path ? `${path}[${index}]` : `[${index}]`;
        const currentName = `[${index}]`;
        
        // Add array item to fields
        const confidence = confidenceScores?.[currentPath] ?? undefined;
        const fieldType = Array.isArray(item) ? 'array' : 
                         typeof item === 'object' && item !== null ? 'object' :
                         typeof item === 'number' ? 'number' :
                         typeof item === 'boolean' ? 'boolean' :
                         typeof item === 'string' && !isNaN(Date.parse(item)) ? 'date' : 'text';

        const field: ConfidenceField = {
          path: currentPath,
          name: currentName,
          type: fieldType,
          value: item,
          confidence: confidence,
          isLowConfidence: confidence !== undefined && confidence < threshold,
          threshold
        };

        totalFields++;
        totalConfidence += confidence ?? 0;

        if (field.isLowConfidence) {
          flaggedFields.push(field);
        }

        // Recursively process array items
        if (typeof item === 'object' && item !== null) {
          traverseFields(item, currentPath, currentName);
        }
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        const fieldType = Array.isArray(value) ? 'array' : 
                         typeof value === 'object' && value !== null ? 'object' :
                         typeof value === 'number' ? 'number' :
                         typeof value === 'boolean' ? 'boolean' :
                         typeof value === 'string' && !isNaN(Date.parse(value)) ? 'date' : 'text';

        const confidence = confidenceScores?.[currentPath] ?? undefined;
        
        const field: ConfidenceField = {
          path: currentPath,
          name: key,
          type: fieldType,
          value: value,
          confidence: confidence,
          isLowConfidence: confidence !== undefined && confidence < threshold,
          threshold
        };

        totalFields++;
        totalConfidence += confidence ?? 0;

        if (field.isLowConfidence) {
          flaggedFields.push(field);
        }

        // Recursively process nested objects
        if (fieldType === 'object' || fieldType === 'array') {
          traverseFields(value, currentPath, key);
        }
      });
    }
  };

  traverseFields(results);

  const overallConfidence = totalFields > 0 ? totalConfidence / totalFields : 0;

  return {
    flaggedFields,
    totalFields,
    flaggedCount: flaggedFields.length,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    threshold
  };
}

/**
 * Get confidence threshold from template extraction settings
 */
export function getConfidenceThreshold(templateSettings?: Record<string, any>): number {
  if (!templateSettings?.extraction_settings?.confidence_threshold) {
    return DEFAULT_CONFIDENCE_THRESHOLD;
  }
  
  const threshold = templateSettings.extraction_settings.confidence_threshold;
  return Math.max(0, Math.min(1, threshold)); // Clamp between 0 and 1
}

/**
 * Check if a field should be flagged based on confidence
 */
export function isFieldLowConfidence(
  confidence: number,
  threshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): boolean {
  return confidence < threshold;
}

/**
 * Get confidence level category for UI styling
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.7) return 'medium';
  return 'low';
}

/**
 * Get confidence color for UI styling
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return '#16a34a'; // green
  if (confidence >= 0.7) return '#d97706'; // yellow
  return '#dc2626'; // red
}

/**
 * Get confidence background color for UI styling
 */
export function getConfidenceBackgroundColor(confidence: number): string {
  if (confidence >= 0.9) return '#dcfce7'; // light green
  if (confidence >= 0.7) return '#fef3c7'; // light yellow
  return '#fee2e2'; // light red
}

/**
 * Sort fields by confidence (lowest first) for priority display
 */
export function sortFieldsByConfidence(fields: ConfidenceField[]): ConfidenceField[] {
  return [...fields].sort((a, b) => a.confidence - b.confidence);
}

/**
 * Filter fields by confidence level
 */
export function filterFieldsByConfidenceLevel(
  fields: ConfidenceField[],
  level: 'high' | 'medium' | 'low'
): ConfidenceField[] {
  return fields.filter(field => getConfidenceLevel(field.confidence) === level);
}
