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
      console.log('Sending request to /api/process-whatsapp');
      const response = await fetch('/api/process-whatsapp', {
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
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin - Realistly</title>
        <meta name="description" content="Admin panel for processing WhatsApp real estate data" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-8">Admin Panel</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload WhatsApp Chat</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Chat Export (.txt)
              </label>
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">WhatsApp chat export (.txt)</p>
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
                <p className="mt-2 text-sm text-gray-600">
                  Selected file: {file.name}
                </p>
              )}
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded">
                {error}
              </div>
            )}
              <button 
              type="submit" 
              className="btn bg-blue-600 px-6 py-2 flex items-center justify-center"
              disabled={isProcessing || !file}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Processing...</span>
                </>
              ) : 'Process WhatsApp Chat'}
            </button>
          </form>
        </div>

        {processedListings.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Processed Listings ({processedListings.length})
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left">Property Type</th>
                    <th className="py-2 px-3 text-left">Location</th>
                    <th className="py-2 px-3 text-left">Price</th>
                    <th className="py-2 px-3 text-left">Area</th>
                    <th className="py-2 px-3 text-left">BHK</th>
                    <th className="py-2 px-3 text-left">Missing Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedListings.map((listing, index) => (
                    <tr key={index}>
                      <td className="py-2 px-3">{listing.propertyType || 'N/A'}</td>
                      <td className="py-2 px-3">{listing.location || 'N/A'}</td>
                      <td className="py-2 px-3">{listing.price || 'N/A'}</td>
                      <td className="py-2 px-3">{listing.area || 'N/A'}</td>
                      <td className="py-2 px-3">{listing.bhk || 'N/A'}</td>
                      <td className="py-2 px-3">
                        {listing.missingFields && listing.missingFields.length > 0 
                          ? listing.missingFields.join(', ') 
                          : 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
