import { get, post, put, del } from './api';
import { KanbanBucket } from '../types';

export const getBuckets = (): Promise<KanbanBucket[]> => get('/buckets');

export const createBucket = (data: Partial<KanbanBucket>): Promise<KanbanBucket> =>
  post('/buckets', data);

export const updateBucket = (id: string, data: Partial<KanbanBucket>): Promise<KanbanBucket> =>
  put(`/buckets/${id}`, data);

export const deleteBucket = (id: string): Promise<void> =>
  del(`/buckets/${id}`);
