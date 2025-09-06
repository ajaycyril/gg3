export * from './types';
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const formatDate: (date: string | Date) => string;
export declare const slugify: (text: string) => string;
export declare const truncateText: (text: string, maxLength: number) => string;
export declare const generateId: () => string;
