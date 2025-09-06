export interface Database {
    public: {
        Tables: {
            gadgets: {
                Row: {
                    id: string;
                    name: string;
                    brand: string | null;
                    price: number | null;
                    image_url: string | null;
                    link: string | null;
                    specs: any | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    brand?: string | null;
                    price?: number | null;
                    image_url?: string | null;
                    link?: string | null;
                    specs?: any | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    brand?: string | null;
                    price?: number | null;
                    image_url?: string | null;
                    link?: string | null;
                    specs?: any | null;
                    created_at?: string;
                };
            };
            reviews: {
                Row: {
                    id: string;
                    gadget_id: string;
                    content: string;
                    author: string | null;
                    source: string | null;
                    rating: number | null;
                    created_at: string;
                };
            };
            users: {
                Row: {
                    id: string;
                    auth_id: string | null;
                    display_name: string | null;
                    email: string | null;
                    preferences: any | null;
                    created_at: string;
                };
            };
            recommendations: {
                Row: {
                    id: string;
                    user_id: string;
                    gadget_id: string | null;
                    prompt: string;
                    result: any;
                    created_at: string;
                };
            };
        };
    };
}
