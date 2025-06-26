import { supabaseAdmin } from '../../utils/supabase';
import { processSearchQuery } from '../../utils/ai-processor';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid search query' });
    }

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
    }    // Add filters for location
    if (searchParams.location) {
      if (searchParams.location.areas && searchParams.location.areas.length > 0) {
        const locationFilters = [];
        searchParams.location.areas.forEach(area => {
          locationFilters.push(`location->>'area'.ilike.%${area}%`);
        });
        supabaseQuery = supabaseQuery.or(locationFilters.join(','));
      } else if (searchParams.location.city) {
        supabaseQuery = supabaseQuery.ilike('location->city', `%${searchParams.location.city}%`);
      }
    }

    // Add filter for BHK
    if (searchParams.bhk) {
      supabaseQuery = supabaseQuery.eq('bhk', searchParams.bhk.toString());
    }    // Add price range filters
    if (searchParams.budget) {
      if (searchParams.budget.min) {
        supabaseQuery = supabaseQuery.gte('price->>value', searchParams.budget.min);
      }
      if (searchParams.budget.max) {
        supabaseQuery = supabaseQuery.lte('price->>value', searchParams.budget.max);
      }
    }

    // Add area range filters
    if (searchParams.area) {
      if (searchParams.area.min) {
        supabaseQuery = supabaseQuery.gte('area->>value', searchParams.area.min);
      }
      if (searchParams.area.max) {
        supabaseQuery = supabaseQuery.lte('area->>value', searchParams.area.max);
      }
    }    // Add amenities filter
    if (searchParams.amenities && Array.isArray(searchParams.amenities) && searchParams.amenities.length > 0) {
      // For each amenity, check if it's contained in the amenities array
      searchParams.amenities.forEach(amenity => {
        // Using contains with JSON arrays
        supabaseQuery = supabaseQuery.filter('amenities', 'cs', `{"${amenity}"}`);
      });
    }    // Add sorting
    if (searchParams.sortBy) {
      switch (searchParams.sortBy) {
        case 'price_asc':
          supabaseQuery = supabaseQuery.order('price->>value', { ascending: true });
          break;
        case 'price_desc':
          supabaseQuery = supabaseQuery.order('price->>value', { ascending: false });
          break;
        case 'recent':
          supabaseQuery = supabaseQuery.order('processed_at', { ascending: false });
          break;
        default:
          // Default sort by confidence score (relevance)
          supabaseQuery = supabaseQuery.order('confidence_score', { ascending: false });
      }
    } else {
      // Default sorting by confidence score
      supabaseQuery = supabaseQuery.order('confidence_score', { ascending: false });
    }

    // Limit results to 20 for performance
    supabaseQuery = supabaseQuery.limit(20);    // Execute the query with error handling
    let results = [];
    let queryError;
    
    try {
      const response = await supabaseQuery;
      results = response.data || [];
      queryError = response.error;
      
      if (queryError) {
        console.error('Supabase query error:', queryError);
        // Don't throw error, just log it and continue with empty results
      }
    } catch (err) {
      console.error('Unexpected error during Supabase query:', err);
      // Don't throw error, just log it and continue with empty results
    }

    // Update the query log with results count
    if (logData && logData[0]) {
      await supabaseAdmin
        .from('user_queries')
        .update({ results_shown: results ? results.length : 0 })
        .eq('id', logData[0].id);
    }

    return res.status(200).json({
      success: true,
      query,
      extractedParams: searchParams,
      results: results || [],
    });
  } catch (error) {
    console.error("Search API error:", error);
    return res.status(500).json({ 
      error: 'Search processing error', 
      details: error.message
    });
  }
}
