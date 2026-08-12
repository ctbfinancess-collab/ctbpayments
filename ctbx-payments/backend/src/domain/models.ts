export interface Money { amount: number; currency: string }
export type OperationStatus = 'PENDING' | 'PROCESSING' | 'REQUIRES_ACTION' | 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'UNDER_REVIEW' | 'CANCELLED';
export interface User { id: string; type: 'PF' | 'PJ_REPRESENTATIVE'; displayName: string }
export interface Account { id: string; type: 'PERSONAL' | 'BUSINESS'; status: string }
export interface Device { id: string; platform: 'ANDROID' | 'IOS'; trusted: boolean }
export interface Operation { id: string; operationId: string; status: OperationStatus; createdAt: string }
