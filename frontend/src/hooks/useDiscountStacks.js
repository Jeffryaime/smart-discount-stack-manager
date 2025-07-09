import { useQuery, useMutation, useQueryClient } from 'react-query';
import { discountStacksApi } from '../services/api';

export const useDiscountStacks = () => {
  return useQuery('discountStacks', discountStacksApi.getAll, {
    staleTime: 5 * 60 * 1000, // 5 minutes
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
  
  return useMutation(
    ({ id, data }) => discountStacksApi.update(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('discountStacks');
        queryClient.invalidateQueries(['discountStack', variables.id]);
      },
    }
  );
};

export const useDeleteDiscountStack = () => {
  const queryClient = useQueryClient();
  
  return useMutation(discountStacksApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('discountStacks');
    },
  });
};

export const useTestDiscountStack = () => {
  return useMutation(
    ({ id, testData }) => discountStacksApi.test(id, testData)
  );
};