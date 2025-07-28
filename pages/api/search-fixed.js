import { supabaseAdmin } from '../../utils/supabase';
import { processSearchQuery } from '../../utils/ai-processor';
import { searchListings, getAllListings } from '../../utils/file-storage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, listingType, propertyType, bhk } = req.body;

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
    
    // Debug environment variables
    console.log("Environment check:");
    console.log("- GOOGLE_GENERATIVE_AI_API_KEY exists:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("- GOOGLE_GENERATIVE_AI_API_KEY length:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.length || 0);
    console.log("- GOOGLE_GENERATIVE_AI_API_KEY preview:", process.env.GOOGLE_GENERATIVE_AI_API_KEY?.substring(0, 20) + "...");

    let results = [];

    if (hasValidSupabase) {
      try {
        // Process the search query using AI
        const searchParams = await processSearchQuery(query);
        
        console.log("Search params extracted:", JSON.stringify(searchParams, null, 2));
        
        // Check if we have any meaningful location or filters
        const hasLocation = searchParams.location && 
                           (searchParams.location.area || 
                            searchParams.location.city || 
                            (searchParams.location.areas && searchParams.location.areas.length > 0));
        
        const hasOtherFilters = searchParams.propertyType || 
                               searchParams.bhk || 
                               (searchParams.priceRange && (searchParams.priceRange.min || searchParams.priceRange.max));
        
        // If no location found and no other meaningful filters, return empty results
        // This prevents returning all properties for nonsensical queries like "property in mars"
        if (!hasLocation && !hasOtherFilters) {
          console.log("No meaningful location or filters found for query:", query);
          return res.status(200).json({
            results: [],
            total: 0,
            query: query,
            message: `No properties found matching your search criteria: "${query}"`
          });
        }
        
        // Build Supabase query based on extracted parameters
        let supabaseQuery = supabaseAdmin
          .from('processed_listings')
          .select('*')
          .eq('status', 'verified')
          .order('created_at', { ascending: false })
          .limit(20);

        // Apply filters based on search parameters
        if (searchParams.propertyType && searchParams.propertyType !== 'any') {
          supabaseQuery = supabaseQuery.eq('property_type', searchParams.propertyType);
        }

        if (searchParams.bhk && searchParams.bhk > 0) {
          supabaseQuery = supabaseQuery.eq('bhk', searchParams.bhk);
        }

        if (searchParams.priceRange && (searchParams.priceRange.min || searchParams.priceRange.max)) {
          if (searchParams.priceRange.min) {
            supabaseQuery = supabaseQuery.gte('price->value', searchParams.priceRange.min);
          }
          if (searchParams.priceRange.max) {
            supabaseQuery = supabaseQuery.lte('price->value', searchParams.priceRange.max);
          }
        }

        if (searchParams.location) {
          if (searchParams.location.area) {
            supabaseQuery = supabaseQuery.ilike('location->area', `%${searchParams.location.area}%`);
          }
          if (searchParams.location.city) {
            supabaseQuery = supabaseQuery.ilike('location->city', `%${searchParams.location.city}%`);
          }
          // Also check for areas array from fallback logic
          if (searchParams.location.areas && searchParams.location.areas.length > 0) {
            const areaFilters = searchParams.location.areas.map(area => 
              `location->area.ilike.%${area}%`
            );
            // Use OR condition for multiple areas
            if (areaFilters.length === 1) {
              supabaseQuery = supabaseQuery.ilike('location->area', `%${searchParams.location.areas[0]}%`);
            } else {
              // For multiple areas, we'll need to use a different approach
              // For now, just use the first area
              supabaseQuery = supabaseQuery.ilike('location->area', `%${searchParams.location.areas[0]}%`);
            }
          }
        }

        // Execute the query
        const { data, error } = await supabaseQuery;

        if (error) {
          console.error("Supabase query error:", {
            message: error.message,
            details: error.toString(),
            hint: error.hint || '',
            code: error.code || ''
          });
          throw error;
        }

        results = data || [];
        console.log(`Found ${results.length} results in Supabase`);

      } catch (supabaseError) {
        console.error("Error querying Supabase, falling back to file storage:", supabaseError);
        // Fall back to file storage
        results = await searchListings({ query, listingType, propertyType, bhk });
      }
    } else {
      // Use file storage directly
      console.log("Using file storage for search");
      results = await searchListings({ query, listingType, propertyType, bhk });
      console.log(`File storage search returned ${results.length} results for query: "${query}"`);
    }

    // If no results from search, return empty results (don't fall back to all listings)
    if (results.length === 0) {
      console.log("No search results found for query:", query);
      return res.status(200).json({
        results: [],
        total: 0,
        query: query,
        message: `No properties found matching your search criteria: "${query}"`
      });
    }

    // Deduplicate results based on key properties to avoid showing the same listing multiple times
    const uniqueResults = [];
    const seenFingerprints = new Set();
    
    for (const listing of results) {
      // Create a fingerprint for deduplication
      const fingerprint = [
        listing.description?.trim()?.toLowerCase() || '',
        listing.property_type?.toLowerCase() || '',
        JSON.stringify(listing.location || '').toLowerCase(),
        JSON.stringify(listing.price || '').toLowerCase(),
        listing.bhk?.toString() || '',
        JSON.stringify(listing.area || '').toLowerCase(),
        (listing.contact_phone || '').replace(/\D/g, '') // Remove non-digits from phone
      ].join('|');
      
      if (!seenFingerprints.has(fingerprint)) {
        uniqueResults.push(listing);
        seenFingerprints.add(fingerprint);
      } else {
        console.log(`Removing duplicate result: ${listing.description?.substring(0, 50)}...`);
      }
    }
    
    console.log(`Deduplicated ${results.length} results to ${uniqueResults.length} unique results`);

    // Format results for consistent response
    const formattedResults = uniqueResults.map(listing => ({
      id: listing.id,
      property_type: listing.property_type || listing.propertyType,
      location: listing.location,
      price: listing.price,
      area: listing.area,
      bhk: listing.bhk,
      description: listing.description,
      contact_phone: listing.contact_phone || listing.contactInfo,
      amenities: listing.amenities || [],
      confidence_score: listing.confidence_score || 0,
      status: listing.status || 'pending',
      created_at: listing.created_at || listing.processed_at
    }));

    return res.status(200).json({
      results: formattedResults,
      total: formattedResults.length,
      query: query,
      searchTime: new Date().toISOString()
    });

  } catch (error) {
    console.error("Search API error:", error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
