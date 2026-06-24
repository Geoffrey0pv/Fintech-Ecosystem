'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { PublicUser } from '../lib/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiFetch<PublicUser>('/auth/me')).data,
  });
}

interface Credentials {
  email: string;
  password: string;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creds: Credentials) =>
      (await apiFetch<PublicUser>('/auth/login', { method: 'POST', body: JSON.stringify(creds) }))
        .data,
    onSuccess: (user) => qc.setQueryData(['me'], user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (creds: Credentials) =>
      (await apiFetch<PublicUser>('/auth/register', { method: 'POST', body: JSON.stringify(creds) }))
        .data,
    onSuccess: (user) => qc.setQueryData(['me'], user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiFetch('/auth/logout', { method: 'POST' });
    },
    onSuccess: () => qc.clear(),
  });
}
