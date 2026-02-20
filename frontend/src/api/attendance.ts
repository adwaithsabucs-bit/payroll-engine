import apiClient from './client';

export const getAttendance = (params?: any) =>
  apiClient.get('/attendance/', { params });

export const markAttendance = (data: any) =>
  apiClient.post('/attendance/', data);

export const updateAttendance = (id: number, data: any) =>
  apiClient.patch(`/attendance/${id}/`, data);

export const approveAttendance = (id: number, data: any) =>
  apiClient.patch(`/attendance/${id}/approve/`, data);

export const getAttendanceSummary = (labourer: number, date_from: string, date_to: string) =>
  apiClient.get('/attendance/summary/', { params: { labourer, date_from, date_to } });