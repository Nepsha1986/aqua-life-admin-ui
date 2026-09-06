"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantsApi } from "@/lib/api-client";
import type { CreateMerchantInput, UpdateMerchantInput } from "./types";

export const merchantsQueryKey = ["merchants"] as const;

export function useMerchants() {
  return useQuery({
    queryKey: merchantsQueryKey,
    queryFn: merchantsApi.list,
  });
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMerchantInput) => merchantsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMerchantInput }) =>
      merchantsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}

export function useDeleteMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => merchantsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: merchantsQueryKey });
    },
  });
}
