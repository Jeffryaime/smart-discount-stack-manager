import React, { useState } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  HorizontalStack,
  Checkbox,
  Banner,
  TextContainer,
  Text,
} from '@shopify/polaris';

function Settings() {
  const [settings, setSettings] = useState({
    defaultDiscountType: 'percentage',
    enableTestMode: true,
    enableNotifications: true,
    notificationEmail: '',
    maxDiscountsPerStack: '10',
    autoDeactivateExpired: true,
    webhookEndpoint: '',
    enableDebugMode: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = () => {
    // In a real implementation, this would save to the backend
    console.log('Saving settings:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const discountTypeOptions = [
    { label: 'Percentage', value: 'percentage' },
    { label: 'Fixed Amount', value: 'fixed' },
    { label: 'Free Shipping', value: 'shipping' },
  ];

  return (
    <Page
      title="Settings"
      breadcrumbs={[
        { content: 'Dashboard', url: '/' },
      ]}
    >
      {saved && (
        <Banner status="success" onDismiss={() => setSaved(false)}>
          <p>Settings saved successfully</p>
        </Banner>
      )}

      <Card>
        <Card.Section>
          <TextContainer>
            <Text variant="headingLg">General Settings</Text>
          </TextContainer>
        </Card.Section>
        <Card.Section>
          <FormLayout>
            <Select
              label="Default Discount Type"
              options={discountTypeOptions}
              value={settings.defaultDiscountType}
              onChange={(value) => handleSettingChange('defaultDiscountType', value)}
              helpText="Default discount type when creating new discounts"
            />

            <TextField
              label="Maximum Discounts per Stack"
              type="number"
              value={settings.maxDiscountsPerStack}
              onChange={(value) => handleSettingChange('maxDiscountsPerStack', value)}
              helpText="Limit the number of discounts that can be added to a single stack"
              autoComplete="off"
            />

            <Checkbox
              label="Enable Test Mode"
              checked={settings.enableTestMode}
              onChange={(value) => handleSettingChange('enableTestMode', value)}
              helpText="Allow testing discount stacks before making them live"
            />

            <Checkbox
              label="Auto-deactivate Expired Discounts"
              checked={settings.autoDeactivateExpired}
              onChange={(value) => handleSettingChange('autoDeactivateExpired', value)}
              helpText="Automatically deactivate discount stacks when they reach their end date"
            />
          </FormLayout>
        </Card.Section>
      </Card>

      <Card>
        <Card.Section>
          <TextContainer>
            <Text variant="headingLg">Notifications</Text>
          </TextContainer>
        </Card.Section>
        <Card.Section>
          <FormLayout>
            <Checkbox
              label="Enable Email Notifications"
              checked={settings.enableNotifications}
              onChange={(value) => handleSettingChange('enableNotifications', value)}
              helpText="Receive notifications about discount usage and errors"
            />

            {settings.enableNotifications && (
              <TextField
                label="Notification Email"
                type="email"
                value={settings.notificationEmail}
                onChange={(value) => handleSettingChange('notificationEmail', value)}
                helpText="Email address for receiving notifications"
                autoComplete="email"
              />
            )}
          </FormLayout>
        </Card.Section>
      </Card>

      <Card>
        <Card.Section>
          <TextContainer>
            <Text variant="headingLg">Developer Settings</Text>
          </TextContainer>
        </Card.Section>
        <Card.Section>
          <FormLayout>
            <TextField
              label="Webhook Endpoint"
              type="url"
              value={settings.webhookEndpoint}
              onChange={(value) => handleSettingChange('webhookEndpoint', value)}
              helpText="Optional webhook endpoint for discount events"
              autoComplete="off"
            />

            <Checkbox
              label="Enable Debug Mode"
              checked={settings.enableDebugMode}
              onChange={(value) => handleSettingChange('enableDebugMode', value)}
              helpText="Show detailed logging information in the console"
            />
          </FormLayout>
        </Card.Section>
      </Card>

      <HorizontalStack align="end">
        <Button primary onClick={handleSave}>
          Save Settings
        </Button>
      </HorizontalStack>
    </Page>
  );
}

export default Settings;