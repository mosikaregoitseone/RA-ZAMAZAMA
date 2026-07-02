// src/services/listingService.ts

import { supabase } from '../lib/supabase';
import type { Listing, ListingFilters } from '../types';

/**
 * Fetch all listings with optional filters
 */
export async function fetchListings(
  filters?: ListingFilters,
  limit: number = 50
): Promise<Listing[]> {
  try {
    let query = supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters?.sortBy === 'price_low') {
      query = query.order('price', { ascending: true });
    } else if (filters?.sortBy === 'price_high') {
      query = query.order('price', { ascending: false });
    } else if (filters?.sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching listings:', error);
    throw error;
  }
}

/**
 * Fetch single listing
 */
export async function fetchListing(
  listingId: string
): Promise<Listing | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (error) throw error;
    return (data as Listing) || null;
  } catch (error) {
    console.error('Error fetching listing:', error);
    throw error;
  }
}

/**
 * Fetch listings by seller
 */
export async function fetchListingsBySeller(
  sellerId: string
): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching seller listings:', error);
    throw error;
  }
}

/**
 * Fetch listings by category
 */
export async function fetchListingsByCategory(
  category: string
): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching listings by category:', error);
    throw error;
  }
}

/**
 * Create listing
 */
export async function createListing(
  sellerId: string,
  listing: Partial<Listing>
): Promise<Listing> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .insert({
        seller_id: sellerId,
        ...listing,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Listing;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}

/**
 * Update listing
 */
export async function updateListing(
  listingId: string,
  updates: Partial<Listing>
): Promise<Listing> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;
    return data as Listing;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
}

/**
 * Delete listing
 */
export async function deleteListing(listingId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}

/**
 * Get listings count
 */
export async function getListingsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting listings count:', error);
    return 0;
  }
}

/**
 * Get listings by price range
 */
export async function getListingsByPriceRange(
  minPrice: number,
  maxPrice: number
): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .gte('price', minPrice)
      .lte('price', maxPrice)
      .order('price', { ascending: true });

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching listings by price range:', error);
    throw error;
  }
}

/**
 * Search listings
 */
export async function searchListings(query: string): Promise<Listing[]> {
  if (!query || query.length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .or(
        `title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error searching listings:', error);
    throw error;
  }
}

/**
 * Get Vader listings (secret/hidden mode)
 */
export async function getVaderListings(): Promise<Listing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_vader', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching vader listings:', error);
    throw error;
  }
}

/**
 * Check if listing exists
 */
export async function listingExists(listingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listingId)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking listing existence:', error);
    return false;
  }
}

/**
 * Get listings with seller details
 */
export async function getListingsWithSellers(
  limit: number = 50
): Promise<
  Array<
    Listing & {
      seller_name?: string;
      seller_rating?: number;
    }
  >
> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select(
        '*, seller:seller_id(full_name, rating_average)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as any[];
  } catch (error) {
    console.error('Error fetching listings with sellers:', error);
    throw error;
  }
}

/**
 * Get recent listings
 */
export async function getRecentListings(days: number = 7): Promise<Listing[]> {
  try {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as Listing[]) || [];
  } catch (error) {
    console.error('Error fetching recent listings:', error);
    throw error;
  }
}

/**
 * Get seller's listing count
 */
export async function getSellerListingCount(sellerId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting seller listing count:', error);
    return 0;
  }
}