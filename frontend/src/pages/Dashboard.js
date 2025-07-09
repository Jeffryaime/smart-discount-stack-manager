import React from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Stack,
  Heading,
  Badge,
  DataTable,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useDiscountStacks } from '../hooks/useDiscountStacks';

function Dashboard() {
  const navigate = useNavigate();
  const { data: discountStacks, isLoading } = useDiscountStacks();

  const rows = discountStacks?.slice(0, 5).map(stack => [
    stack.name,
    stack.isActive ? <Badge status="success">Active</Badge> : <Badge>Inactive</Badge>,
    stack.discounts.length,
    stack.usageCount || 0,
    <Button
      plain
      onClick={() => navigate(`/discount-stacks/${stack._id}/edit`)}
    >
      Edit
    </Button>
  ]) || [];

  return (
    <Page
      title="Smart Discount Stack Manager"
      primaryAction={{
        content: 'Create Discount Stack',
        onAction: () => navigate('/discount-stacks/create'),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Stack vertical spacing="loose">
                <Heading>Welcome to Smart Discount Stack Manager</Heading>
                <Text>
                  Create and manage complex discount combinations for your Shopify store.
                  Stack multiple discounts, set conditions, and track performance.
                </Text>
                <Stack>
                  <Button
                    primary
                    onClick={() => navigate('/discount-stacks/create')}
                  >
                    Create Your First Stack
                  </Button>
                  <Button
                    onClick={() => navigate('/discount-stacks')}
                  >
                    View All Stacks
                  </Button>
                </Stack>
              </Stack>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Stack vertical spacing="loose">
                <Heading>Recent Discount Stacks</Heading>
                {isLoading ? (
                  <Text>Loading...</Text>
                ) : rows.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
                    headings={['Name', 'Status', 'Discounts', 'Usage', 'Actions']}
                    rows={rows}
                  />
                ) : (
                  <Text>No discount stacks created yet.</Text>
                )}
              </Stack>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default Dashboard;