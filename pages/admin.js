import Head from 'next/head';
import Link from 'next/link';
import { useState, useRef } from 'react';
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Admin() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedListings, setProcessedListings] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setError('No file selected');
      return;
    }
    
    // Check file extension
    if (!selectedFile.name.endsWith('.txt')) {
      setFile(null);
      setError('Please select a WhatsApp chat export file with .txt extension');
      return;
    }
    
    // Check file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('File size exceeds 10MB limit');
      return;
    }
    
    // Clear any existing errors and set the file
    setError(null);
    setFile(selectedFile);
    
    console.log('File selected:', selectedFile.name, selectedFile.type, selectedFile.size);
  };  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a WhatsApp chat file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('chatFile', file);
    
    console.log('Submitting file:', file.name, file.type, file.size);

    try {
      // Make the API request with debugging
      console.log('Sending request to /api/process-whatsapp-fixed');
      const response = await fetch('/api/process-whatsapp-fixed', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response received:', response.status, response.statusText);
      console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));

      // Handle non-JSON responses (like HTML error pages)
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      let responseText = '';
      try {
        responseText = await response.text();
        console.log('Response text:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      } catch (textError) {
        console.error('Error reading response text:', textError);
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', responseText);
        throw new Error('Server returned an invalid response format. Please try again or contact support.');
      }

      // Parse the JSON response
      let data;
      try {
        // We already consumed the body with .text(), so we need to parse it
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError, 'Response text:', responseText);
        throw new Error('Failed to parse server response. The file might be invalid or too large.');
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.details || response.statusText;
        throw new Error(`Server error: ${errorMessage}`);
      }

      // Process the successful response
      setProcessedListings(data.processedListings || []);
      
      if (data.processedListings && data.processedListings.length === 0) {
        setError('No property listings were found in the chat file. Try a different file.');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error('Full error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Admin Panel - Realistly</title>
        <meta name="description" content="Admin panel for processing WhatsApp real estate data with AI" />
      </Head>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-coral-50 to-teal-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Admin <span className="text-coral-500">Panel</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload WhatsApp chat exports to automatically extract property listings using AI
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12">
        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload WhatsApp Chat</h2>
              <p className="text-gray-600">
                Select a WhatsApp chat export file (.txt) containing real estate discussions
              </p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  WhatsApp Chat Export File
                </label>
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-coral-300 border-dashed rounded-xl cursor-pointer bg-coral-50 hover:bg-coral-100 transition-all duration-300">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="text-4xl mb-4 text-coral-500">📁</div>
                      <p className="mb-2 text-lg text-gray-700">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">WhatsApp chat export (.txt files only)</p>
                      <p className="text-xs text-gray-400 mt-2">Maximum file size: 10MB</p>
                    </div>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".txt" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </label>
                </div>
                
                {file && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                    <span className="text-green-500 mr-2">✅</span>
                    <div>
                      <p className="text-green-700 font-medium">File selected:</p>
                      <p className="text-green-600 text-sm">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 How to export WhatsApp chat:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open WhatsApp and go to the group/chat with property discussions</li>
                    <li>Tap the group/contact name at the top</li>
                    <li>Scroll down and tap "Export Chat"</li>
                    <li>Choose "Without Media" to get a .txt file</li>
                    <li>Upload the exported .txt file here</li>
                  </ol>
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  <div>
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn w-full md:w-auto px-8 py-4 text-lg flex items-center justify-center"
                disabled={isProcessing || !file}
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Processing WhatsApp chat...</span>
                  </>
                ) : (
                  <>
                    <span>🤖 Process WhatsApp Chat</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Section */}
        {processedListings.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-coral-500 to-teal-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Processing Complete! 🎉</h2>
                    <p className="text-coral-100">Found {processedListings.length} property listings</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">Property Type</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">Location</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">Price</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">Area</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">BHK</th>
                        <th className="py-3 px-4 text-left font-semibold text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {processedListings.map((listing, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">🏠</span>
                              <span className="font-medium">{listing.propertyType || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">📍</span>
                              <span>{listing.location || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">💰</span>
                              <span className="font-medium text-green-600">{listing.price || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">📐</span>
                              <span>{listing.area || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">🛏️</span>
                              <span>{listing.bhk || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {listing.missingFields && listing.missingFields.length > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Needs Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Complete
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-teal-500 mr-2">💡</span>
                    <div>
                      <p className="font-medium text-teal-900">Next Steps:</p>
                      <p className="text-teal-800 text-sm">
                        All listings have been saved to the database and are now searchable via the Properties page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isProcessing && processedListings.length === 0 && !error && (
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="text-6xl mb-6">🤖</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to process WhatsApp chats?</h3>
            <p className="text-gray-600 mb-8">
              Upload a WhatsApp chat export and let our AI extract property listings automatically.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="font-semibold text-gray-900 mb-2">What gets extracted:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Property type & location</li>
                  <li>• Price & area details</li>
                  <li>• BHK configuration</li>
                  <li>• Contact information</li>
                  <li>• Amenities & features</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Processing Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Natural language understanding</li>
                  <li>• Smart data extraction</li>
                  <li>• Duplicate detection</li>
                  <li>• Quality scoring</li>
                  <li>• Auto-categorization</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
