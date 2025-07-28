import React, { useState } from 'react';

export default function WhatsAppImageUploader() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);
    setResults(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`file-${index}`, file);
      });

      console.log('📤 Uploading WhatsApp chat with images...');
      
      const response = await fetch('/api/process-whatsapp-with-images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log('✅ Upload successful:', data);
      setResults(data);
      
    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          📱 WhatsApp Chat with Images Processor
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>Export your WhatsApp chat (including media)</li>
            <li>Select the chat .txt file and all image files</li>
            <li>Click upload to process text and extract property data from images</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select WhatsApp Chat Files (Text + Images)
            </label>
            <input
              type="file"
              multiple
              accept=".txt,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-sm text-gray-500">
              Select the WhatsApp chat .txt file and any image files. Max 50MB total.
            </p>
          </div>

          {files.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Selected Files ({files.length}):</h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{file.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {file.type || 'Unknown type'} • {formatFileSize(file.size)}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                      {file.name.endsWith('.txt') ? '📄 Chat' : '🖼️ Image'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || files.length === 0}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              '📤 Process WhatsApp Chat'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-4">✅ Processing Complete!</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.summary.totalFiles}</div>
                  <div className="text-sm text-green-700">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.summary.totalMessages}</div>
                  <div className="text-sm text-blue-700">Total Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{results.summary.imageMessages}</div>
                  <div className="text-sm text-purple-700">Images Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{results.summary.processedMessages}</div>
                  <div className="text-sm text-orange-700">Properties Found</div>
                </div>
              </div>

              {results.summary.savedToDatabase > 0 && (
                <div className="mt-4 p-3 bg-green-100 rounded">
                  <p className="text-green-800">
                    💾 {results.summary.savedToDatabase} properties saved to database
                  </p>
                </div>
              )}
            </div>

            {results.messages && results.messages.length > 0 && (
              <div className="bg-white border rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800 p-4 border-b">
                  🏠 Extracted Properties ({results.messages.length})
                </h4>
                <div className="divide-y">
                  {results.messages.slice(0, 10).map((message, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">
                            {message.type === 'image' ? '🖼️ From Image' : '💬 From Text'}
                          </span>
                          {message.type === 'image' && (
                            <span className="ml-2 text-xs text-gray-500">({message.filename})</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {message.propertyData && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Type:</span>
                            <p className="text-gray-800">{message.propertyData.propertyType || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Location:</span>
                            <p className="text-gray-800">
                              {message.propertyData.location?.area || message.propertyData.location?.city || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Price:</span>
                            <p className="text-gray-800">{message.propertyData.price?.formatted || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Size:</span>
                            <p className="text-gray-800">
                              {message.propertyData.bhk ? `${message.propertyData.bhk} BHK` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {results.messages.length > 10 && (
                    <div className="p-4 text-center text-gray-500">
                      ... and {results.messages.length - 10} more properties
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
