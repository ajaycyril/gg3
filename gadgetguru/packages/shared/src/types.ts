// This file exports TypeScript types used across the application, promoting type safety and consistency.

export interface Gadget {
    id: string;
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    specs: Spec[];
    reviews: Review[];
}

export interface Spec {
    key: string;
    value: string;
}

export interface Review {
    id: string;
    content: string;
    rating: number;
    author: string;
    createdAt: Date;
}

export interface Recommendation {
    id: string;
    gadgetId: string;
    userId: string;
    insights: string;
    createdAt: Date;
}

export interface User {
    id: string;
    email: string;
    preferences: UserPreferences;
}

export interface UserPreferences {
    savedGadgets: string[];
    notificationsEnabled: boolean;
}