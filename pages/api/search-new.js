import { supabaseAdmin } from '../../utils/supabase';
import { processSearchQuery } from '../../utils/ai-processor';
import { searchListings, getAllListings } from '../../utils/file-storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid search query' });
    }

    // Check if Supabase is properly configured
    const hasValidSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                             process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
                             process.env.SUPABASE_SERVICE_KEY &&
                             process.env.SUPABASE_SERVICE_KEY !== 'placeholder_service_key';

    console.log("Search query:", query);
    console.log("Using database:", hasValidSupabase ? "Supabase" : "File storage");

    let results = [];

    if (hasValidSupabase) {
      // Use Supabase database
      // Log the search query to user_queries table
      const { data: logData, error: logError } = await supabaseAdmin
        .from('user_queries')
        .insert({
          query_text: query,
          timestamp: new Date().toISOString(),
          user_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          user_agent: req.headers['user-agent'] || 'Unknown',
        })
        .select();

      if (logError) {
        console.error("Error logging search query:", logError);
      }

      // Process the search query using AI
      const searchParams = await processSearchQuery(query);
      
      // Build Supabase query based on extracted parameters
      let supabaseQuery = supabaseAdmin
        .from('processed_listings')
        .select('*');

      // Add filters for property type
      if (searchParams.propertyType) {
        supabaseQuery = supabaseQuery.ilike('property_type', `%${searchParams.propertyType}%`);
      }

      // Add filters for location
      if (searchParams.location) {
        if (searchParams.location.areas && searchParams.location.areas.length > 0) {
          const locationFilters = [];
          searchParams.location.areas.forEach(area => {
            locationFilters.push(`location->>'area'.ilike.%${area}%`);
          });
          supabaseQuery = supabaseQuery.or(locationFilters.join(','));
        } else if (searchParams.location.city) {
          supabaseQuery = supabaseQuery.ilike('location->>city', `%${searchParams.location.city}%`);
        }
      }

      // Execute the query
      const { data, error } = await supabaseQuery.limit(50);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      results = data || [];
    } else {
      // Use file storage
      console.log("Using file storage for search");
      
      // Process the search query using AI
      const searchParams = await processSearchQuery(query);
      console.log("Search parameters:", searchParams);
      
      // Search in file storage
      results = searchListings(searchParams);
      console.log(`Found ${results.length} results in file storage`);
    }

    // Format results for frontend
    const formattedResults = results.map(listing => {
      try {
        // Helper functions to format complex objects
        const formatLocation = (location) => {
          if (typeof location === 'object' && location !== null) {
            if (location.area && location.city) {
              return `${location.area}, ${location.city}`;
            } else if (location.area) {
              return location.area;
            } else if (location.city) {
              return location.city;
            }
          }
          return String(location || 'Not specified');
        };

        const formatPrice = (price) => {
          if (typeof price === 'object' && price !== null) {
            if (price.formatted) {
              return price.formatted;
            } else if (price.value && price.currency) {
              return `${price.currency} ${price.value}`;
            } else if (price.value) {
              return String(price.value);
            }
          }
          return String(price || 'Price not mentioned');
        };

        const formatArea = (area) => {
          if (typeof area === 'object' && area !== null) {
            if (area.formatted) {
              return area.formatted;
            } else if (area.value && area.unit) {
              return `${area.value} ${area.unit}`;
            } else if (area.value) {
              return String(area.value);
            }
          }
          return String(area || 'Area not specified');
        };

        return {
          id: listing.id,
          propertyType: listing.property_type || 'Unknown',
          location: formatLocation(listing.location),
          price: formatPrice(listing.price),
          area: formatArea(listing.area),
          bhk: listing.bhk || null,
          description: listing.description || 'No description available',
          contactInfo: listing.contact_phone || listing.contact_person || null,
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
          status: listing.status || 'available'
        };
      } catch (formatError) {
        console.error("Error formatting result:", formatError);
        return {
          id: listing.id || null,
          propertyType: 'Error',
          location: 'N/A',
          price: 'N/A',
          area: 'N/A',
          bhk: null,
          description: 'Error formatting property data',
          contactInfo: null,
          amenities: [],
          status: 'error'
        };
      }
    });

    console.log(`Returning ${formattedResults.length} formatted results`);

    return res.status(200).json({
      success: true,
      results: formattedResults,
      count: formattedResults.length,
      message: formattedResults.length > 0 
        ? `Found ${formattedResults.length} properties matching your search`
        : 'No properties found matching your search criteria'
    });

  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
}
