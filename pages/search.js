import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
      
      if (data.results && data.results.length === 0) {
        setError('No properties found matching your search criteria');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Search Properties - Realistly</title>
        <meta name="description" content="Search real estate properties" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-8">Search Properties</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSearch}>
            <div className="mb-4">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                What are you looking for?
              </label>
              <input
                id="search"
                type="text"
                className="input-field"
                placeholder="e.g., 2 BHK apartment in Bandra under 2 crores"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <p className="mt-2 text-sm text-gray-500">
                Use natural language to describe the property you're looking for
              </p>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
              <button 
              type="submit" 
              className="btn bg-green-600 px-6 py-2 flex items-center justify-center"
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Searching...</span>
                </>
              ) : 'Search Properties'}
            </button>
          </form>
        </div>
        
        {results.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Search Results ({results.length})
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {results.map((property, index) => (
                <PropertyCard key={index} property={property} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
