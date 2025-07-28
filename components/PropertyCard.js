import React from 'react';

/**
 * PropertyCard component for displaying property listings
 * @param {Object} property - The property data object
 */
export default function PropertyCard({ property }) {
  // Handle properties with old schema and new schema
  const propertyType = property.property_type || property.propertyType || 'Property';
  const listingType = property.listingType || property.listing_type || 'unknown';
  const location = typeof property.location === 'object' 
    ? (property.location.area ? `${property.location.area}, ${property.location.city || ''}` : property.location.city) 
    : property.location;
  const price = typeof property.price === 'object' ? property.price.formatted : property.price;
  const area = typeof property.area === 'object' ? property.area.formatted : property.area;
  const contactInfo = property.contact_phone || property.contactInfo;
  
  // Determine badge colors based on listing type
  const getBadgeColors = (type) => {
    switch(type) {
      case 'rent': return 'bg-blue-500 text-white';
      case 'sale': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      {/* Property Type Badge */}
      <div className="bg-gradient-to-r from-coral-500 to-coral-600 p-4 text-white">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <span className="bg-white bg-opacity-20 text-white text-sm font-semibold px-3 py-1 rounded-full">
              {propertyType}
            </span>
            {listingType !== 'unknown' && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getBadgeColors(listingType)}`}>
                For {listingType.charAt(0).toUpperCase() + listingType.slice(1)}
              </span>
            )}
          </div>
          {property.bhk && (
            <span className="text-coral-100 font-medium">
              {property.bhk} BHK
            </span>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {property.bhk ? `${property.bhk} BHK ` : ''}{propertyType}
          {location && (
            <div className="text-lg text-gray-600 font-normal flex items-center mt-1">
              <span className="mr-2">📍</span>
              {location}
            </div>
          )}
        </h3>
        
        {/* Price and Area */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {price && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="text-green-500 mr-2">💰</span>
                <span className="text-xs font-medium text-green-700 uppercase tracking-wide">Price</span>
              </div>
              <span className="text-lg font-bold text-green-800">{price}</span>
            </div>
          )}
          
          {area && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="text-blue-500 mr-2">📐</span>
                <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Area</span>
              </div>
              <span className="text-lg font-bold text-blue-800">{area}</span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {property.description && (
          <div className="mb-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              {property.description.length > 120 
                ? property.description.substring(0, 120) + '...' 
                : property.description}
            </p>
          </div>
        )}
        
        {/* Amenities */}
        {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="text-teal-500 mr-2">✨</span>
              <span className="text-sm font-semibold text-gray-700">Amenities</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {property.amenities.slice(0, 4).map((amenity, i) => (
                <span 
                  key={i}
                  className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 4 && (
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                  +{property.amenities.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Contact Information */}
        {contactInfo && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">📞</span>
                <span className="font-medium">{contactInfo}</span>
              </div>
              <button className="bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors duration-200">
                Contact
              </button>
            </div>
          </div>
        )}
        
        {/* Property ID */}
        {property.id && (
          <div className="mt-3 text-xs text-gray-400">
            ID: {String(property.id).substring(0, 8)}...
          </div>
        )}
      </div>
    </div>
  );
}
