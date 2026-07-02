// src/hooks/useListings.ts

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchListings,
  fetchListing,
  fetchListingsBySeller,
  searchListings,
} from '../services/listingService';
import type { Listing, ListingFilters } from '../types';

export interface UseListingsReturn {
  listings: Listing[];
  currentListing: Listing | null;
  loading: boolean;
  error: Error | null;
  filters: ListingFilters;
  setFilters: (filters: ListingFilters) => void;
  searchListings: (query: string) => Promise<void>;
  fetchSellerListings: (sellerId: string) => Promise<Listing[]>;
  refetch: () => Promise<void>;
}

const useListings = (
  initialFilters?: ListingFilters,
  autoFetch: boolean = true
): UseListingsReturn => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentListing, setCurrentListing] = useState<Listing | null>(null);
  const [filters, setFiltersState] = useState<ListingFilters>(
    initialFilters || {}
  );
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const lastFiltersRef = useRef<ListingFilters>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchListings(filters);
      setListings(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!autoFetch) return;

    // Only fetch if filters actually changed
    const filtersChanged = JSON.stringify(lastFiltersRef.current) !== JSON.stringify(filters);
    if (filtersChanged) {
      lastFiltersRef.current = filters;
      fetchData();
    }
  }, [filters, fetchData, autoFetch]);

  const setFilters = useCallback((newFilters: ListingFilters) => {
    setFiltersState(newFilters);
  }, []);

  const searchListingsHandler = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!query || query.length < 2) {
        setListings([]);
        return;
      }

      const results = await searchListings(query);
      setListings(results);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setError(error);
      console.error('Error searching listings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellerListingsHandler = useCallback(
    async (sellerId: string): Promise<Listing[]> => {
      try {
        setLoading(true);
        setError(null);

        const sellerListings = await fetchListingsBySeller(sellerId);
        setListings(sellerListings);
        return sellerListings;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to fetch seller listings');
        setError(error);
        console.error('Error fetching seller listings:', error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    listings,
    currentListing,
    loading,
    error,
    filters,
    setFilters,
    searchListings: searchListingsHandler,
    fetchSellerListings: fetchSellerListingsHandler,
    refetch: fetchData,
  };
};

export default useListings;