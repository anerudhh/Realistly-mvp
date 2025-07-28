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
  const [listingTypeFilter, setListingTypeFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [bhkFilter, setBhkFilter] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search-fixed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery,
          listingType: listingTypeFilter,
          propertyType: propertyTypeFilter,
          bhk: bhkFilter
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Search API response:', data); // Debug log
      console.log('Number of results received:', data.results?.length || 0); // Debug log
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
    <div className="min-h-screen bg-white">
      <Head>
        <title>Search Properties - Realistly</title>
        <meta name="description" content="Search real estate properties with AI-powered natural language search" />
      </Head>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-coral-50 to-teal-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Find Your Perfect <span className="text-coral-500">Property</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Use natural language to search through our AI-processed property database
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Search Form */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSearch}>
              <div className="mb-6">
                <label htmlFor="search" className="block text-lg font-semibold text-gray-900 mb-3">
                  What are you looking for? 🔍
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    className="input-field text-lg py-4 pl-12 pr-4"
                    placeholder="e.g., 2 BHK apartment in Bandra under 2 crores with parking"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
                
                {/* Filters */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Looking to:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                      value={listingTypeFilter}
                      onChange={(e) => setListingTypeFilter(e.target.value)}
                    >
                      <option value="">Both Rent & Sale</option>
                      <option value="rent">Rent</option>
                      <option value="sale">Buy</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Type:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                      value={propertyTypeFilter}
                      onChange={(e) => setPropertyTypeFilter(e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="villa">Villa</option>
                      <option value="plot">Plot</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">BHK:</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-coral-500"
                      value={bhkFilter}
                      onChange={(e) => setBhkFilter(e.target.value)}
                    >
                      <option value="">Any BHK</option>
                      <option value="1">1 BHK</option>
                      <option value="2">2 BHK</option>
                      <option value="3">3 BHK</option>
                      <option value="4">4+ BHK</option>
                    </select>
                  </div>
                </div>
                
                <p className="mt-3 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  💡 <strong>Tip:</strong> Use natural language like "3 bedroom house in Whitefield with gym and pool under 1.5 crores"
                </p>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="btn w-full md:w-auto px-8 py-4 text-lg flex items-center justify-center"
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Searching properties...</span>
                  </>
                ) : (
                  <>
                    <span>🔍 Search Properties</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Results Section */}
        {results.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Search Results
              </h2>
              <div className="bg-coral-100 text-coral-700 px-4 py-2 rounded-full font-semibold">
                {results.length} properties found
              </div>
            </div>
            
            {/* Debug info - remove this later */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <strong>Debug:</strong> Displaying {results.length} results from {results.length} total received
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.map((property, index) => (
                <PropertyCard key={property.id || index} property={property} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && results.length === 0 && !error && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="text-6xl mb-6">🏠</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to find your dream property?</h3>
            <p className="text-gray-600 mb-8">
              Enter your search criteria above and let our AI help you discover the perfect match from our property database.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🏢</div>
                <h4 className="font-semibold mb-2">Example searches:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "2 BHK in Koramangala"</li>
                  <li>• "Villa with swimming pool"</li>
                  <li>• "Budget under 50 lakhs"</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <h4 className="font-semibold mb-2">AI-Powered Search:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Natural language understanding</li>
                  <li>• Smart property matching</li>
                  <li>• Real WhatsApp data</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
