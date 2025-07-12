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
	Popover,
	ActionList,
} from '@shopify/polaris';
import { EditMajor, DeleteMajor, CircleTickMajor, CircleCancelMajor, PlayMajor } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router-dom';
import {
	useDiscountStacks,
	useDeleteDiscountStack,
	useBulkDeleteDiscountStacks,
	useBulkUpdateDiscountStacks,
} from '../hooks/useDiscountStacks';
import UnifiedTestDiscountModal from '../components/UnifiedTestDiscountModal';
import { discountStacksApi } from '../services/api';
import { navigateWithShop } from '../utils/navigation';

function DiscountStacks() {
	const navigate = useNavigate();
	const { data: discountStacks, isLoading } = useDiscountStacks();
	
	// Ensure discountStacks is an array
	const stacksArray = Array.isArray(discountStacks) ? discountStacks : [];
	const deleteDiscountStack = useDeleteDiscountStack();
	const bulkDeleteDiscountStacks = useBulkDeleteDiscountStacks();
	const bulkUpdateDiscountStacks = useBulkUpdateDiscountStacks();

	const [searchValue, setSearchValue] = useState('');
	const [statusFilter, setStatusFilter] = useState([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [stackToDelete, setStackToDelete] = useState(null);
	const [selectedResources, setSelectedResources] = useState([]);
	const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
	const [errorModalOpen, setErrorModalOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [moreActionsOpen, setMoreActionsOpen] = useState(false);
	const [testModalOpen, setTestModalOpen] = useState(false);
	const [stackToTest, setStackToTest] = useState(null);

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
			setMoreActionsOpen(false);
			setBulkDeleteModalOpen(true);
		}
	};

	const confirmBulkDelete = async () => {
		const selectedIds = selectedResources.map(
			(index) => filteredStacks[index]._id
		);

		try {
			await bulkDeleteDiscountStacks.mutateAsync(selectedIds);
			setBulkDeleteModalOpen(false);
			setSelectedResources([]);
		} catch (error) {
			console.error('Error deleting discount stacks:', error);
			setErrorMessage(
				error.response?.data?.message ||
					error.message ||
					'Failed to delete discount stacks. Please try again.'
			);
			setErrorModalOpen(true);
		}
	};

	const handleBulkActivate = async () => {
		// Only activate inactive items
		const inactiveSelectedIds = selectedResources
			.filter(index => !filteredStacks[index]?.isActive)
			.map(index => filteredStacks[index]._id);

		if (inactiveSelectedIds.length === 0) return;

		setMoreActionsOpen(false);

		try {
			await bulkUpdateDiscountStacks.mutateAsync({
				ids: inactiveSelectedIds,
				updates: { isActive: true }
			});
			setSelectedResources([]);
		} catch (error) {
			console.error('Error activating discount stacks:', error);
			setErrorMessage(
				error.response?.data?.message ||
					error.message ||
					'Failed to activate discount stacks. Please try again.'
			);
			setErrorModalOpen(true);
		}
	};

	const handleBulkDeactivate = async () => {
		// Only deactivate active items
		const activeSelectedIds = selectedResources
			.filter(index => filteredStacks[index]?.isActive)
			.map(index => filteredStacks[index]._id);

		if (activeSelectedIds.length === 0) return;

		setMoreActionsOpen(false);

		try {
			await bulkUpdateDiscountStacks.mutateAsync({
				ids: activeSelectedIds,
				updates: { isActive: false }
			});
			setSelectedResources([]);
		} catch (error) {
			console.error('Error deactivating discount stacks:', error);
			setErrorMessage(
				error.response?.data?.message ||
					error.message ||
					'Failed to deactivate discount stacks. Please try again.'
			);
			setErrorModalOpen(true);
		}
	};

	const handleSelectionChange = (selectedItems) => {
		setSelectedResources(selectedItems);
	};

	const handleSelectAll = () => {
		const allIndices = filteredStacks.map((_, index) => index);
		setSelectedResources(allIndices);
	};

	const handleTestDiscount = async (testData) => {
		if (!stackToTest) return;
		
		try {
			const result = await discountStacksApi.test(stackToTest._id, testData);
			return result;
		} catch (error) {
			console.error('Error testing discount stack:', error);
			throw error;
		}
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
		stacksArray?.filter((stack) => {
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
		<Button
			plain
			onClick={() => navigateWithShop(navigate, `/discount-stacks/${stack._id}/edit`)}
			textAlign="left"
		>
			{stack.name}
		</Button>,
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
				onClick={() => {
					setStackToTest(stack);
					setTestModalOpen(true);
				}}
				accessibilityLabel="Test discount stack"
				icon={<Icon source={PlayMajor} />}
			/>
			<Button
				plain
				onClick={() => navigateWithShop(navigate, `/discount-stacks/${stack._id}/edit`)}
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
			title={
				<div
					onClick={() => navigateWithShop(navigate, '/')}
					style={{
						cursor: 'pointer',
						fontSize: '24px',
						fontWeight: '600',
						color: '#202223',
						lineHeight: '1.2',
						userSelect: 'none'
					}}
					onMouseEnter={(e) => e.target.style.color = '#0969da'}
					onMouseLeave={(e) => e.target.style.color = '#202223'}
				>
					Discount Stacks
				</div>
			}
			primaryAction={{
				content: 'Create Discount Stack',
				onAction: () => navigateWithShop(navigate, '/discount-stacks/create'),
			}}
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
											disabled={
												selectedResources.length === filteredStacks.length
											}
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
										{selectedResources.length > 0 && (
											<Popover
												active={moreActionsOpen}
												activator={
													<Button
														size="slim"
														onClick={() => setMoreActionsOpen(!moreActionsOpen)}
														disclosure
													>
														More Actions
													</Button>
												}
												onClose={() => setMoreActionsOpen(false)}
											>
												<ActionList
													items={[
														// Only show activate if there are inactive items selected
														...(selectedResources.some(index => !filteredStacks[index]?.isActive) ? [{
															content: `Activate ${selectedResources.filter(index => !filteredStacks[index]?.isActive).length} selected`,
															onAction: handleBulkActivate,
															icon: CircleTickMajor,
														}] : []),
														// Only show deactivate if there are active items selected
														...(selectedResources.some(index => filteredStacks[index]?.isActive) ? [{
															content: `Deactivate ${selectedResources.filter(index => filteredStacks[index]?.isActive).length} selected`,
															onAction: handleBulkDeactivate,
															icon: CircleCancelMajor,
														}] : []),
														// Delete action (always show if items are selected)
														{
															content: `Delete ${selectedResources.length} selected`,
															onAction: handleBulkDelete,
															destructive: true,
															icon: DeleteMajor,
														},
													]}
												/>
											</Popover>
										)}
									</HorizontalStack>
									{selectedResources.length > 0 && (
										<Text variant="bodySm" tone="subdued">
											{selectedResources.length} of {filteredStacks.length}{' '}
											selected
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
											onClick={() => navigateWithShop(navigate, '/discount-stacks/create')}
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
							Are you sure you want to delete the following{' '}
							{selectedResources.length} discount stacks? This action cannot be
							undone.
						</Text>
						<div
							style={{
								maxHeight: '200px',
								overflowY: 'auto',
								padding: '12px',
								backgroundColor: '#f6f6f7',
								borderRadius: '6px',
							}}
						>
							<VerticalStack gap="2">
								{selectedResources.map((index) => {
									const stack = filteredStacks[index];
									return (
										<Text key={stack?._id || `stack-${index}`} variant="bodySm">
											• {stack?.name}
										</Text>
									);
								})}
							</VerticalStack>
						</div>
					</VerticalStack>
				</Modal.Section>
			</Modal>

			<Modal
				open={errorModalOpen}
				onClose={() => setErrorModalOpen(false)}
				title="Error"
				primaryAction={{
					content: 'OK',
					onAction: () => setErrorModalOpen(false),
				}}
			>
				<Modal.Section>
					<TextContainer>
						<Text variant="bodyMd" tone="critical">
							{errorMessage}
						</Text>
					</TextContainer>
				</Modal.Section>
			</Modal>

			{stackToTest && (
				<UnifiedTestDiscountModal
					open={testModalOpen}
					onClose={() => {
						setTestModalOpen(false);
						setStackToTest(null);
					}}
					discountStack={stackToTest}
					onTest={handleTestDiscount}
				/>
			)}
		</Page>
	);
}

export default DiscountStacks;
