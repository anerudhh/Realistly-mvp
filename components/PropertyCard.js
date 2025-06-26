import React from 'react';

/**
 * PropertyCard component for displaying property listings
 * @param {Object} property - The property data object
 */
export default function PropertyCard({ property }) {  // Handle properties with old schema and new schema
  const propertyType = property.property_type || property.propertyType || 'Property';
  const location = typeof property.location === 'object' 
    ? (property.location.area ? `${property.location.area}, ${property.location.city || ''}` : property.location.city) 
    : property.location;
  const price = typeof property.price === 'object' ? property.price.formatted : property.price;
  const area = typeof property.area === 'object' ? property.area.formatted : property.area;
  const contactInfo = property.contact_phone || property.contactInfo;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between mb-2">
        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
          {propertyType}
        </span>
        <span className="text-gray-500 text-sm">
          ID: {property.id && property.id.substring(0, 8)}
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {property.bhk ? `${property.bhk} BHK` : ''} {propertyType} {location && `in ${location}`}
      </h3>
        <div className="flex flex-wrap gap-4 mb-3">
        {price && (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{price}</span>
          </div>
        )}        {area && (
          <div className="flex items-center">
            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{area}</span>
          </div>
        )}
      </div>
        {property.description && (
        <p className="text-gray-700 mb-4">
          {property.description.length > 150 
            ? property.description.substring(0, 150) + '...' 
            : property.description}
        </p>
      )}
        {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Amenities:</p>
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((amenity, i) => (
              <span 
                key={i}
                className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
        {contactInfo && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="flex items-center text-sm text-gray-700">
            <svg className="w-4 h-4 text-gray-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Contact: {contactInfo}
          </p>
        </div>
      )}
    </div>
  );
}
