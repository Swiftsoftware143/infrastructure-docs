'use client';

import { useState } from 'react';
import { useBusinesses } from '@/hooks/useBusinesses';
import { SearchResult } from '@/lib/api/client';
import SearchBox from '@/components/SearchBox';
import BusinessCard from '@/components/BusinessCard';

export default function BusinessesPage() {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const { 
    businesses, 
    loading, 
    error, 
    total, 
    page, 
    totalPages,
    setPage,
    refetch 
  } = useBusinesses({ 
    page: 1, 
    per_page: 20,
    sort: 'rating',
  });

  const displayBusinesses = searchResults?.businesses || businesses;
  const displayTotal = searchResults?.total || total;
  const displayLoading = isSearching || loading;
  const displayError = error;

  const handleSearchResults = (results: SearchResult) => {
    setSearchResults(results);
  };

  const handlePageChange = (newPage: number) => {
    if (searchResults) {
      // For search results, re-fetch with new page
      setPage(newPage);
    } else {
      setPage(newPage);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Business Directory</h1>
      
      <div className="mb-8">
        <SearchBox 
          onResults={handleSearchResults}
          onLoading={setIsSearching}
        />
      </div>

      {searchResults && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            Found {searchResults.total} results for &quot;{searchResults.businesses[0]?.name || 'search'}&quot;
          </p>
          <button
            onClick={() => {
              setSearchResults(null);
              refetch();
            }}
            className="text-blue-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {displayLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {displayError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {displayError}
        </div>
      )}

      {!displayLoading && !displayError && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayBusinesses.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>

          {displayBusinesses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No businesses found.
            </div>
          )}

          {totalPages > 1 && !searchResults && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
