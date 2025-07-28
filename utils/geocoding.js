/**
 * Geocoding utility functions using Google Maps API
 */

// Get coordinates from address
export async function getCoordinatesFromAddress(address) {
  if (!address || !process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('Geocoding skipped: Missing address or API key');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
        bounds: result.geometry.bounds,
        viewport: result.geometry.viewport
      };
    }

    console.warn('Geocoding failed:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Get address from coordinates (reverse geocoding)
export async function getAddressFromCoordinates(latitude, longitude) {
  if (!latitude || !longitude || !process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      return {
        formatted_address: data.results[0].formatted_address,
        address_components: data.results[0].address_components,
        place_id: data.results[0].place_id
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Standardize Indian addresses for better consistency
export function standardizeIndianAddress(location) {
  if (!location) return location;

  const locationStr = typeof location === 'object' 
    ? (location.area || location.city || JSON.stringify(location))
    : String(location);

  // Add "Bengaluru" or "Karnataka" if missing for better geocoding
  if (locationStr.toLowerCase().includes('koramangala') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('indiranagar') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('whitefield') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('electronic city') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('hsr layout') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('btm layout') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }
  if (locationStr.toLowerCase().includes('marathahalli') && !locationStr.toLowerCase().includes('bengaluru')) {
    return `${locationStr}, Bengaluru, Karnataka, India`;
  }

  // Add "India" if not present
  if (!locationStr.toLowerCase().includes('india')) {
    return `${locationStr}, India`;
  }

  return locationStr;
}

// Calculate distance between two coordinates (in km)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Batch geocode multiple addresses
export async function batchGeocode(addresses, delayMs = 200) {
  const results = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];
    console.log(`Geocoding ${i + 1}/${addresses.length}: ${address}`);
    
    const result = await getCoordinatesFromAddress(address);
    results.push({
      address,
      geocoded: result
    });

    // Add delay to respect API rate limits
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// Get location string from location object for geocoding
export function getLocationStringForGeocoding(locationData) {
  if (!locationData) return null;
  
  if (typeof locationData === 'string') {
    return locationData;
  }
  
  if (typeof locationData === 'object') {
    // Try different combinations
    if (locationData.area && locationData.city) {
      return `${locationData.area}, ${locationData.city}`;
    }
    if (locationData.area) {
      return locationData.area;
    }
    if (locationData.city) {
      return locationData.city;
    }
    if (locationData.address) {
      return locationData.address;
    }
    if (locationData.formatted_address) {
      return locationData.formatted_address;
    }
    
    // Last resort: stringify the object
    return JSON.stringify(locationData);
  }
  
  return String(locationData);
}
