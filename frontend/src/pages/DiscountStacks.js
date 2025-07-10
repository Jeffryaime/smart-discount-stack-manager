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
} from '../hooks/useDiscountStacks';

function DiscountStacks() {
	const navigate = useNavigate();
	const { data: discountStacks, isLoading } = useDiscountStacks();
	const deleteDiscountStack = useDeleteDiscountStack();

	const [searchValue, setSearchValue] = useState('');
	const [statusFilter, setStatusFilter] = useState([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [stackToDelete, setStackToDelete] = useState(null);

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

	const rows = filteredStacks.map((stack) => [
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
		</Page>
	);
}

export default DiscountStacks;
