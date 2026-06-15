const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }
  
  return result.data as T;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  user_id?: string;
  rating: number;
  title?: string;
  content?: string;
  author_name?: string;
  is_verified: boolean;
  created_at: string;
}

export interface SearchResult {
  businesses: Business[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SearchParams {
  q?: string;
  category?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: 'relevance' | 'rating' | 'distance' | 'newest';
  page?: number;
  per_page?: number;
}

export const BusinessAPI = {
  search: (params: SearchParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    return apiRequest<SearchResult>(`/api/businesses?${query}`);
  },

  getById: (id: string) => apiRequest<Business>(`/api/businesses/${id}`),

  getBySlug: (slug: string) => apiRequest<Business>(`/api/businesses/slug/${slug}`),

  nearby: (lat: number, lng: number, radius: number = 10, category?: string) => {
    let url = `/api/businesses/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
    if (category) url += `&category=${category}`;
    return apiRequest<Business[]>(url);
  },

  getReviews: (id: string) => apiRequest<Review[]>(`/api/businesses/${id}/reviews`),
};

export const SearchAPI = {
  suggestions: (query: string) => 
    apiRequest<string[]>(`/api/search/suggestions?q=${encodeURIComponent(query)}`),
};

export const CacheAPI = {
  clear: () => apiRequest<string>('/api/cache/clear', { method: 'POST' }),
  stats: () => apiRequest<{ keys_count: number; memory_used: string }>('/api/cache/stats'),
};
