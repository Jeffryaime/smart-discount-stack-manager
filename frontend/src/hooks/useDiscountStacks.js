import { useQuery, useMutation, useQueryClient } from 'react-query';
import { discountStacksApi } from '../services/api';

export const useDiscountStacks = () => {
	return useQuery('discountStacks', discountStacksApi.getAll, {
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 1,
		onError: (error) => {
			console.error('Error fetching discount stacks:', error);
		},
	});
};

export const useDiscountStack = (id) => {
	return useQuery(['discountStack', id], () => discountStacksApi.getById(id), {
		enabled: !!id,
	});
};

export const useCreateDiscountStack = () => {
	const queryClient = useQueryClient();

	return useMutation(discountStacksApi.create, {
		onSuccess: () => {
			queryClient.invalidateQueries('discountStacks');
		},
	});
};

export const useUpdateDiscountStack = () => {
	const queryClient = useQueryClient();

	return useMutation(({ id, data }) => discountStacksApi.update(id, data), {
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries('discountStacks');
			queryClient.invalidateQueries(['discountStack', variables.id]);
		},
	});
};

export const useDeleteDiscountStack = () => {
	const queryClient = useQueryClient();

	return useMutation(discountStacksApi.delete, {
		onSuccess: () => {
			queryClient.invalidateQueries('discountStacks');
		},
	});
};

export const useBulkDeleteDiscountStacks = () => {
	const queryClient = useQueryClient();

	return useMutation(
		async (ids) => {
			const deletePromises = ids.map((id) => discountStacksApi.delete(id));
			const results = await Promise.allSettled(deletePromises);

			// Process results to provide detailed feedback
			const successful = [];
			const failed = [];

			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					successful.push(ids[index]);
				} else {
					failed.push({
						id: ids[index],
						error: result.reason,
					});
				}
			});

			// Return structured results for better error handling
			return {
				successful,
				failed,
				total: ids.length,
				successCount: successful.length,
				failureCount: failed.length,
			};
		},
		{
			onSuccess: (data) => {
				// Only invalidate queries if at least one deletion was successful
				if (data.successCount > 0) {
					queryClient.invalidateQueries('discountStacks');
				}

				// Log results for debugging
				if (data.failureCount > 0) {
					console.warn(
						`Bulk delete completed with ${data.failureCount} failures:`,
						data.failed
					);
				}
			},
		}
	);
};

export const useBulkUpdateDiscountStacks = () => {
	const queryClient = useQueryClient();

	return useMutation(
		async ({ ids, updates }) => {
			const updatePromises = ids.map((id) => 
				discountStacksApi.update(id, updates)
			);
			const results = await Promise.allSettled(updatePromises);

			// Process results to provide detailed feedback
			const successful = [];
			const failed = [];

			results.forEach((result, index) => {
				if (result.status === 'fulfilled') {
					successful.push(ids[index]);
				} else {
					failed.push({
						id: ids[index],
						error: result.reason,
					});
				}
			});

			return {
				successful,
				failed,
				total: ids.length,
				successCount: successful.length,
				failureCount: failed.length,
			};
		},
		{
			onSuccess: (data) => {
				// Only invalidate queries if at least one update was successful
				if (data.successCount > 0) {
					queryClient.invalidateQueries('discountStacks');
				}

				// Log results for debugging
				if (data.failureCount > 0) {
					console.warn(
						`Bulk update completed with ${data.failureCount} failures:`,
						data.failed
					);
				}
			},
		}
	);
};

export const useTestDiscountStack = () => {
	return useMutation(({ id, testData }) =>
		discountStacksApi.test(id, testData)
	);
};
