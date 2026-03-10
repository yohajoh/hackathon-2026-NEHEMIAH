"use client";

import { useQueryClient, useMutation } from "@tanstack/react-query";

type OptimisticData<T> = T extends (infer U)[] ? U : T;

export interface OptimisticConfig<TData, TVariables> {
  queryKey: readonly unknown[];
  getUpdateFunc: (variables: TVariables, oldData: TData) => TData;
  getFilterFunc?: (item: OptimisticData<TData>, variables: TVariables) => boolean;
}

export interface DeleteConfig<TData, TVariables> {
  queryKey: readonly unknown[];
  getId: (variables: TVariables) => string;
  getArrayPath?: (data: TData) => OptimisticData<TData>[];
}

export interface CreateConfig<TData, TVariables> {
  queryKey: readonly unknown[];
  getNewItem: (variables: TVariables) => OptimisticData<TData>;
  getArrayPath?: (data: TData) => OptimisticData<TData>[];
}

export interface UpdateConfig<TData, TVariables> {
  queryKey: readonly unknown[];
  getUpdateFunc: (variables: TVariables, oldItem: OptimisticData<TData>) => OptimisticData<TData>;
  getId: (variables: TVariables) => string;
  getArrayPath?: (data: TData) => OptimisticData<TData>[];
}

export function useOptimisticDelete<TData, TVariables>(
  config: DeleteConfig<TData, TVariables>,
  mutationFn: (variables: TVariables) => Promise<unknown>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: config.queryKey });
      const previousData = queryClient.getQueryData<TData>(config.queryKey);

      if (previousData) {
        queryClient.setQueryData<TData>(config.queryKey, (old: TData | undefined) => {
          if (!old) return old;
          const arrayPath = config.getArrayPath ? config.getArrayPath(old) : old as unknown as OptimisticData<TData>[];
          if (Array.isArray(arrayPath)) {
            const id = config.getId(variables);
            const updated = arrayPath.filter((item: OptimisticData<TData>) => 
              (item as { id: string }).id !== id
            );
            if (config.getArrayPath) {
              return { ...old, [Object.keys(old).find(k => config.getArrayPath!(old as TData) === old[k as keyof TData]) || 'data']: updated } as TData;
            }
            return updated as unknown as TData;
          }
          return old;
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });
}

export function useOptimisticCreate<TData, TVariables>(
  config: CreateConfig<TData, TVariables>,
  mutationFn: (variables: TVariables) => Promise<unknown>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: config.queryKey });
      const previousData = queryClient.getQueryData<TData>(config.queryKey);

      if (previousData) {
        queryClient.setQueryData<TData>(config.queryKey, (old: TData | undefined) => {
          if (!old) return old;
          const newItem = config.getNewItem(variables);
          const arrayPath = config.getArrayPath ? config.getArrayPath(old) : old as unknown as OptimisticData<TData>[];
          if (Array.isArray(arrayPath)) {
            const updated = [newItem, ...arrayPath];
            if (config.getArrayPath) {
              return { ...old, [Object.keys(old).find(k => config.getArrayPath!(old as TData) === old[k as keyof TData]) || 'data']: updated } as TData;
            }
            return updated as unknown as TData;
          }
          return old;
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });
}

export function useOptimisticUpdate<TData, TVariables>(
  config: UpdateConfig<TData, TVariables>,
  mutationFn: (variables: TVariables) => Promise<unknown>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: config.queryKey });
      const previousData = queryClient.getQueryData<TData>(config.queryKey);

      if (previousData) {
        queryClient.setQueryData<TData>(config.queryKey, (old: TData | undefined) => {
          if (!old) return old;
          const arrayPath = config.getArrayPath ? config.getArrayPath(old) : old as unknown as OptimisticData<TData>[];
          if (Array.isArray(arrayPath)) {
            const id = config.getId(variables);
            const updated = arrayPath.map((item: OptimisticData<TData>) => {
              const itemId = (item as { id: string }).id;
              if (itemId === id) {
                return config.getUpdateFunc(variables, item);
              }
              return item;
            });
            if (config.getArrayPath) {
              return { ...old, [Object.keys(old).find(k => config.getArrayPath!(old as TData) === old[k as keyof TData]) || 'data']: updated } as TData;
            }
            return updated as unknown as TData;
          }
          return old;
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });
}

export function useOptimisticToggle<TData, TVariables>(
  config: UpdateConfig<TData, TVariables>,
  mutationFn: (variables: TVariables) => Promise<unknown>
) {
  return useOptimisticUpdate(config, mutationFn);
}
