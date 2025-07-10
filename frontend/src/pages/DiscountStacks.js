import React, { useState } from 'react';
import {
	Page,
	Card,
	Button,
	DataTable,
	Badge,
	HorizontalStack,
	VerticalStack,
	TextField,
	ChoiceList,
	Modal,
	TextContainer,
	Text,
	Icon,
} from '@shopify/polaris';
import { EditMajor, DeleteMajor } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import {
	useDiscountStacks,
	useDeleteDiscountStack,
	useBulkDeleteDiscountStacks,
} from '../hooks/useDiscountStacks';

function DiscountStacks() {
	const navigate = useNavigate();
	const { data: discountStacks, isLoading } = useDiscountStacks();
	const deleteDiscountStack = useDeleteDiscountStack();
	const bulkDeleteDiscountStacks = useBulkDeleteDiscountStacks();

	const [searchValue, setSearchValue] = useState('');
	const [statusFilter, setStatusFilter] = useState([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [stackToDelete, setStackToDelete] = useState(null);
	const [selectedResources, setSelectedResources] = useState([]);
	const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

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

	const handleBulkDelete = () => {
		if (selectedResources.length > 0) {
			setBulkDeleteModalOpen(true);
		}
	};

	const confirmBulkDelete = async () => {
		const selectedIds = selectedResources.map(index => filteredStacks[index]._id);
		
		try {
			await bulkDeleteDiscountStacks.mutateAsync(selectedIds);
			setBulkDeleteModalOpen(false);
			setSelectedResources([]);
		} catch (error) {
			console.error('Error deleting discount stacks:', error);
		}
	};

	const handleSelectionChange = (selectedItems) => {
		setSelectedResources(selectedItems);
	};

	const handleSelectAll = () => {
		const allIndices = filteredStacks.map((_, index) => index);
		setSelectedResources(allIndices);
	};

	const handleDeselectAll = () => {
		setSelectedResources([]);
	};

	const handleSearchChange = (value) => {
		setSearchValue(value);
	};

	const handleStatusFilterChange = (value) => {
		setStatusFilter(value);
	};

	const filteredStacks =
		discountStacks?.filter((stack) => {
			if (!stack || !stack.name) return false;

			const matchesSearch = stack.name
				.toLowerCase()
				.includes(searchValue.toLowerCase());
			const matchesStatus =
				statusFilter.length === 0 ||
				statusFilter.includes(stack.isActive ? 'active' : 'inactive');

			return matchesSearch && matchesStatus;
		}) || [];

	const rows = filteredStacks.map((stack, index) => [
		stack.name,
		stack.description || '-',
		stack.isActive ? (
			<Badge status="success">Active</Badge>
		) : (
			<Badge>Inactive</Badge>
		),
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
		</HorizontalStack>,
	]);

	return (
		<Page
			title="Discount Stacks"
			primaryAction={{
				content: 'Create Discount Stack',
				onAction: () => navigate('/discount-stacks/create'),
			}}
			{...(selectedResources.length > 0 && {
				secondaryActions: [
					{
						content: `Delete ${selectedResources.length} selected`,
						onAction: handleBulkDelete,
						destructive: true,
						icon: DeleteMajor,
					},
				],
			})}
		>
			<Card>
				<div style={{ padding: '20px' }}>
					<VerticalStack gap="5">
						<div style={{ marginBottom: '16px' }}>
							<HorizontalStack gap="4" align="end">
								<div style={{ flex: 1 }}>
									<TextField
										label="Search"
										labelHidden
										value={searchValue}
										onChange={handleSearchChange}
										placeholder="Search discount stacks..."
										clearButton
										onClearButtonClick={() => setSearchValue('')}
										autoComplete="off"
									/>
								</div>
								<HorizontalStack gap="3" align="center">
									<Text variant="bodyMd" tone="subdued">
										Status:
									</Text>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											height: '40px',
										}}
									>
										<ChoiceList
											title="Status"
											titleHidden
											choices={[
												{ label: 'Active', value: 'active' },
												{ label: 'Inactive', value: 'inactive' },
											]}
											selected={statusFilter}
											onChange={handleStatusFilterChange}
											allowMultiple
										/>
									</div>
								</HorizontalStack>
							</HorizontalStack>
						</div>

						{filteredStacks.length > 0 && (
							<div style={{ marginBottom: '16px' }}>
								<HorizontalStack gap="2" align="space-between">
									<HorizontalStack gap="2">
										<Button
											size="slim"
											onClick={handleSelectAll}
											disabled={selectedResources.length === filteredStacks.length}
										>
											Select All
										</Button>
										<Button
											size="slim"
											onClick={handleDeselectAll}
											disabled={selectedResources.length === 0}
										>
											Deselect All
										</Button>
									</HorizontalStack>
									{selectedResources.length > 0 && (
										<Text variant="bodySm" tone="subdued">
											{selectedResources.length} of {filteredStacks.length} selected
										</Text>
									)}
								</HorizontalStack>
							</div>
						)}

						{isLoading ? (
							<div style={{ textAlign: 'center', padding: '20px' }}>
								<Text>Loading discount stacks...</Text>
							</div>
						) : filteredStacks.length === 0 ? (
							<div style={{ textAlign: 'center', padding: '40px' }}>
								<VerticalStack gap="4">
									<Text variant="headingMd" tone="subdued">
										{searchValue || statusFilter.length > 0
											? 'No discount stacks found matching your filters'
											: 'No discount stacks created yet'}
									</Text>
									{searchValue || statusFilter.length > 0 ? (
										<Button
											onClick={() => {
												setSearchValue('');
												setStatusFilter([]);
											}}
										>
											Clear filters
										</Button>
									) : (
										<Button
											primary
											onClick={() => navigate('/discount-stacks/create')}
										>
											Create your first discount stack
										</Button>
									)}
								</VerticalStack>
							</div>
						) : (
							<DataTable
								columnContentTypes={[
									'text',
									'text',
									'text',
									'numeric',
									'numeric',
									'text',
								]}
								headings={[
									'Name',
									'Description',
									'Status',
									'Discounts',
									'Usage',
									'Actions',
								]}
								rows={rows}
								sortable={[true, true, true, true, true, false]}
								selectable
								selectedRows={selectedResources}
								onSelectionChange={handleSelectionChange}
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
						Are you sure you want to delete "{stackToDelete?.name}"? This action
						cannot be undone.
					</TextContainer>
				</Modal.Section>
			</Modal>

			<Modal
				open={bulkDeleteModalOpen}
				onClose={() => setBulkDeleteModalOpen(false)}
				title="Delete Multiple Discount Stacks"
				primaryAction={{
					content: `Delete ${selectedResources.length} stacks`,
					onAction: confirmBulkDelete,
					destructive: true,
					loading: bulkDeleteDiscountStacks.isLoading,
				}}
				secondaryActions={[
					{
						content: 'Cancel',
						onAction: () => setBulkDeleteModalOpen(false),
					},
				]}
			>
				<Modal.Section>
					<VerticalStack gap="4">
						<Text variant="bodyMd">
							Are you sure you want to delete the following {selectedResources.length} discount stacks? This action cannot be undone.
						</Text>
						<div style={{ 
							maxHeight: '200px', 
							overflowY: 'auto', 
							padding: '12px', 
							backgroundColor: '#f6f6f7', 
							borderRadius: '6px' 
						}}>
							<VerticalStack gap="2">
								{selectedResources.map((index) => (
									<Text key={index} variant="bodySm">
										• {filteredStacks[index]?.name}
									</Text>
								))}
							</VerticalStack>
						</div>
					</VerticalStack>
				</Modal.Section>
			</Modal>
		</Page>
	);
}

export default DiscountStacks;
