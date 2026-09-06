"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storesApi } from "@/lib/api-client";
import type { CreateStoreInput, UpdateStoreInput } from "./types";

export const storesQueryKey = ["stores"] as const;

export function useStores() {
  return useQuery({
    queryKey: storesQueryKey,
    queryFn: storesApi.list,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStoreInput) => storesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStoreInput }) =>
      storesApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storesQueryKey });
    },
  });
}
