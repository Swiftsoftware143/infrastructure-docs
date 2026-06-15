'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchAPI, BusinessAPI, SearchResult } from '@/lib/api/client';

interface SearchBoxProps {
  onResults: (results: SearchResult) => void;
  onLoading?: (loading: boolean) => void;
}

export default function SearchBox({ onResults, onLoading }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounced autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        try {
          const sugg = await SearchAPI.suggestions(query);
          setSuggestions(sugg);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Suggestions error:', err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    onLoading?.(true);
    setShowSuggestions(false);
    
    try {
      const result = await BusinessAPI.search({ 
        q: query,
        page: 1,
        per_page: 20,
      });
      onResults(result);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }, [query, onResults, onLoading]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Auto-search on suggestion click
    setTimeout(handleSearch, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length > 2 && setShowSuggestions(true)}
            placeholder="Search businesses..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
