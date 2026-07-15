import { get, post, put, del } from './api';
import { Client } from '../types';

export const getClients = async (): Promise<Client[]> => {
  return await get('/clients');
};

export const createClient = async (data: Partial<Client>): Promise<Client> => {
  return await post('/clients', data);
};

export const updateClient = async (id: string, data: Partial<Client>): Promise<Client> => {
  return await put(`/clients/${id}`, data);
};

export const deleteClient = async (id: string): Promise<void> => {
  return await del(`/clients/${id}`);
};
