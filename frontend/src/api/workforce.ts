import apiClient from './client';

export const getLabourers = (params?: any) =>
  apiClient.get('/workforce/labourers/', { params });

export const createLabourer = (data: any) =>
  apiClient.post('/workforce/labourers/', data);

export const getContractors = (params?: any) =>
  apiClient.get('/workforce/contractors/', { params });

export const createContractor = (data: any) =>
  apiClient.post('/workforce/contractors/', data);

export const getMyProfile = () =>
  apiClient.get('/workforce/my-profile/');