'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessAPI, SearchParams, Business, SearchResult } from '@/lib/api/client';

interface UseBusinessesReturn {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  refetch: () => void;
  setPage: (page: number) => void;
}

export function useBusinesses(params: SearchParams = {}): UseBusinessesReturn {
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(params.page || 1);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await BusinessAPI.search({
        ...params,
        page: currentPage,
        per_page: params.per_page || 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [params, currentPage]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return {
    businesses: data?.businesses || [],
    loading,
    error,
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.total_pages || 1,
    refetch: fetchBusinesses,
    setPage: setCurrentPage,
  };
}

export function useBusiness(id: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const data = await BusinessAPI.getById(id);
        setBusiness(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load business');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadBusiness();
    }
  }, [id]);

  return { business, loading, error };
}

export function useNearbyBusinesses(
  lat: number | null,
  lng: number | null,
  radius: number = 10,
  category?: string
) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNearby() {
      if (!lat || !lng) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await BusinessAPI.nearby(lat, lng, radius, category);
        setBusinesses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load nearby');
      } finally {
        setLoading(false);
      }
    }

    loadNearby();
  }, [lat, lng, radius, category]);

  return { businesses, loading, error };
}
