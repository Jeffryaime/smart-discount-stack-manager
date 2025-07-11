import React, { useState } from 'react';
import {
  Card,
  TextField,
  Button,
  HorizontalStack,
  VerticalStack,
  Text,
  Box,
  Tooltip,
  Icon,
  InlineError
} from '@shopify/polaris';
import { ViewMajor, DeleteMinor } from '@shopify/polaris-icons';

const SimpleIdSelector = ({ 
  label, 
  value = [], 
  onChange, 
  placeholder = "Enter IDs...",
  helpText,
  error,
  disabled = false,
  idType = "ID"
}) => {
  const [showRawInput, setShowRawInput] = useState(false);
  const [rawInput, setRawInput] = useState('');

  const handleRawInputSubmit = () => {
    if (!rawInput.trim()) return;

    // Parse raw input - split by commas, newlines, or spaces
    const rawIds = rawInput
      .split(/[,\n\s]+/)
      .map(id => id.trim())
      .filter(Boolean);

    if (rawIds.length > 0) {
      const currentIds = Array.isArray(value) ? value : [];
      const newIds = rawIds.filter(id => !currentIds.includes(id));
      const newValue = [...currentIds, ...newIds];
      onChange(newValue);
    }

    setRawInput('');
    setShowRawInput(false);
  };

  const handleRemove = (idToRemove) => {
    const currentIds = Array.isArray(value) ? value : [];
    const newValue = currentIds.filter(id => id !== idToRemove);
    onChange(newValue);
  };

  const selectedIds = Array.isArray(value) ? value : [];

  return (
    <VerticalStack gap="3">
      <Text variant="bodyMd" fontWeight="medium">{label}</Text>
      
      {/* Input Section */}
      <Card sectioned>
        <VerticalStack gap="3">
          <HorizontalStack gap="2" align="space-between">
            <div style={{ flex: 1 }}>
              <TextField
                value=""
                placeholder={placeholder}
                disabled={true}
                helpText={`Click "${idType} Input" to add ${idType.toLowerCase()}s`}
                autoComplete="off"
              />
            </div>
            <Tooltip content={`Enter ${idType.toLowerCase()}s directly`}>
              <Button
                plain
                icon={ViewMajor}
                onClick={() => setShowRawInput(!showRawInput)}
                pressed={showRawInput}
                disabled={disabled}
              >
                {idType} Input
              </Button>
            </Tooltip>
          </HorizontalStack>

          {/* Raw Input Section */}
          {showRawInput && (
            <Box padding="3" background="bg-surface-secondary" borderRadius="200">
              <VerticalStack gap="2">
                <Text variant="bodyMd" fontWeight="medium">Enter {idType}s</Text>
                <TextField
                  value={rawInput}
                  onChange={setRawInput}
                  placeholder="123, 456, 789"
                  helpText={`Enter ${idType.toLowerCase()}s separated by commas, spaces, or new lines`}
                  multiline={3}
                  disabled={disabled}
                  autoComplete="off"
                />
                <HorizontalStack gap="2">
                  <Button 
                    size="slim" 
                    primary 
                    onClick={handleRawInputSubmit}
                    disabled={!rawInput.trim() || disabled}
                  >
                    Add {idType}s
                  </Button>
                  <Button 
                    size="slim" 
                    onClick={() => {
                      setRawInput('');
                      setShowRawInput(false);
                    }}
                    disabled={disabled}
                  >
                    Cancel
                  </Button>
                </HorizontalStack>
              </VerticalStack>
            </Box>
          )}
        </VerticalStack>
      </Card>

      {/* Selected IDs */}
      {selectedIds.length > 0 && (
        <Card sectioned>
          <VerticalStack gap="3">
            <HorizontalStack align="space-between">
              <Text variant="bodyMd" fontWeight="medium">
                Selected {idType}s ({selectedIds.length})
              </Text>
              <Button 
                size="slim" 
                destructive 
                onClick={() => onChange([])}
                disabled={disabled}
              >
                Clear All
              </Button>
            </HorizontalStack>
            
            <VerticalStack gap="2">
              {selectedIds.map((id) => (
                <Card key={id}>
                  <div style={{ padding: '8px 12px' }}>
                    <HorizontalStack align="space-between">
                      <Text variant="bodyMd">
                        {idType}: {id}
                      </Text>
                      <Button
                        plain
                        destructive
                        icon={DeleteMinor}
                        onClick={() => handleRemove(id)}
                        disabled={disabled}
                        accessibilityLabel={`Remove ${idType.toLowerCase()} ${id}`}
                      />
                    </HorizontalStack>
                  </div>
                </Card>
              ))}
            </VerticalStack>
          </VerticalStack>
        </Card>
      )}

      {/* Help Text and Error */}
      {helpText && (
        <Text variant="bodySm" color="subdued">
          {helpText}
        </Text>
      )}
      
      {error && (
        <InlineError message={error} fieldID={`simple-id-selector-${label}`} />
      )}
    </VerticalStack>
  );
};

export default SimpleIdSelector;