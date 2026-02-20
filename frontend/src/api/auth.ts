import apiClient from './client';
import { LoginResponse, User } from '../types';

export const login = (username: string, password: string) =>
  apiClient.post<LoginResponse>('/auth/login/', { username, password });

export const logout = (refresh: string) =>
  apiClient.post('/auth/logout/', { refresh });

export const getProfile = () =>
  apiClient.get<User>('/auth/profile/');

export const getUsers = (role?: string) =>
  apiClient.get('/auth/users/', { params: role ? { role } : {} });

export const createUser = (data: any) =>
  apiClient.post('/auth/register/', data);