import { supabaseAdmin } from '../../utils/supabase';
import { getAllListings } from '../../utils/file-storage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 20 } = req.query;

    // Check if Supabase is properly configured
    const hasValidSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                             process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
                             process.env.SUPABASE_SERVICE_KEY &&
                             process.env.SUPABASE_SERVICE_KEY !== 'placeholder_service_key';

    let results = [];

    if (hasValidSupabase) {
      try {
        const { data, error } = await supabaseAdmin
          .from('processed_listings')
          .select('*')
          .eq('status', 'verified')
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        if (error) {
          throw error;
        }
        
        results = data || [];
      } catch (error) {
        console.error("Error getting listings from Supabase:", error);
        results = getAllListings().slice(0, parseInt(limit));
      }
    } else {
      results = getAllListings().slice(0, parseInt(limit));
    }

    // Format results for consistent response
    const formattedResults = results.map(listing => ({
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
      total: formattedResults.length
    });

  } catch (error) {
    console.error("Listings API error:", error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}
