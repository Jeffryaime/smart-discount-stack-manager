import React, { useState } from 'react';
import {
  Page,
  Card,
  Button,
  DataTable,
  Badge,
  HorizontalStack,
  VerticalStack,
  Filters,
  ChoiceList,
  TextField,
  Modal,
  TextContainer,
  Icon,
} from '@shopify/polaris';
import {
  EditMajor,
  DeleteMajor,
} from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import { useDiscountStacks, useDeleteDiscountStack } from '../hooks/useDiscountStacks';

function DiscountStacks() {
  const navigate = useNavigate();
  const { data: discountStacks, isLoading } = useDiscountStacks();
  const deleteDiscountStack = useDeleteDiscountStack();
  
  const [selectedResources, setSelectedResources] = useState([]);
  const [sortValue, setSortValue] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stackToDelete, setStackToDelete] = useState(null);

  const handleFiltersChange = (filters) => {
    setStatusFilter(filters.status || []);
    setSearchValue(filters.search || '');
  };

  const handleDelete = (stack) => {
    setStackToDelete(stack);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (stackToDelete) {
      deleteDiscountStack.mutate(stackToDelete._id);
      setDeleteModalOpen(false);
      setStackToDelete(null);
    }
  };

  const filteredStacks = discountStacks?.filter(stack => {
    const matchesSearch = stack.name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || 
      statusFilter.includes(stack.isActive ? 'active' : 'inactive');
    
    return matchesSearch && matchesStatus;
  }) || [];

  const rows = filteredStacks.map(stack => [
    stack.name,
    stack.description || '-',
    stack.isActive ? <Badge status="success">Active</Badge> : <Badge>Inactive</Badge>,
    stack.discounts.length,
    stack.usageCount || 0,
    <HorizontalStack gap="2">
      <Button
        plain
        onClick={() => navigate(`/discount-stacks/${stack._id}/edit`)}
        accessibilityLabel="Edit discount stack"
        icon={<Icon source={EditMajor} />}
      />
      <Button
        plain
        destructive
        onClick={() => handleDelete(stack)}
        accessibilityLabel="Delete discount stack"
        icon={<Icon source={DeleteMajor} />}
      />
    </HorizontalStack>
  ]);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          selected={statusFilter}
          onChange={setStatusFilter}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  return (
    <Page
      title="Discount Stacks"
      primaryAction={{
        content: 'Create Discount Stack',
        onAction: () => navigate('/discount-stacks/create'),
      }}
    >
      <Card>
        <div style={{ padding: '20px' }}>
          <VerticalStack gap="5">
            <Filters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search discount stacks..."
            />
            
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric', 'text']}
                headings={['Name', 'Description', 'Status', 'Discounts', 'Usage', 'Actions']}
                rows={rows}
                sortable={[true, true, true, true, true, false]}
              />
            )}
          </VerticalStack>
        </div>
      </Card>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Discount Stack"
        primaryAction={{
          content: 'Delete',
          onAction: confirmDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setDeleteModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            Are you sure you want to delete "{stackToDelete?.name}"? This action cannot be undone.
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default DiscountStacks;