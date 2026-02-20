import apiClient from './client';

export const getDashboard = () =>
  apiClient.get('/payroll/dashboard/');

export const getPayrolls = (params?: any) =>
  apiClient.get('/payroll/', { params });

export const getPeriods = () =>
  apiClient.get('/payroll/periods/');

export const createPeriod = (data: any) =>
  apiClient.post('/payroll/periods/', data);

export const generatePayroll = (periodId: number) =>
  apiClient.post(`/payroll/periods/${periodId}/generate/`);

export const approvePayroll = (id: number, data: any) =>
  apiClient.patch(`/payroll/${id}/approve/`, data);