/**
 * Script to geocode existing properties in the database
 * Run this script to add coordinates to properties that don't have them yet
 */

import { enhanceLocationWithGeocoding } from './utils/ai-processor.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (you may need to adjust this based on your setup)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function geocodeExistingProperties() {
  console.log('🌍 Starting to geocode existing properties...');
  
  try {
    // Fetch properties that don't have coordinates
    const { data: properties, error } = await supabase
      .from('processed_listings')
      .select('*')
      .is('latitude', null);

    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('✅ No properties need geocoding - all properties already have coordinates!');
      return;
    }

    console.log(`Found ${properties.length} properties to geocode`);
    
    let geocodedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\nProcessing ${i + 1}/${properties.length}: ${property.id}`);
      
      try {
        // Parse the location data if it's stored as JSON string
        let locationData = property.location;
        if (typeof locationData === 'string') {
          locationData = JSON.parse(locationData);
        }

        if (!locationData) {
          console.log(`  ⚠️ No location data found for property ${property.id}`);
          failedCount++;
          continue;
        }

        // Enhance location with geocoding
        const enhancedLocation = await enhanceLocationWithGeocoding(locationData);
        
        if (enhancedLocation.coordinates) {
          // Update the property in the database
          const { error: updateError } = await supabase
            .from('processed_listings')
            .update({
              location: enhancedLocation,
              latitude: enhancedLocation.coordinates.latitude,
              longitude: enhancedLocation.coordinates.longitude,
              standardized_address: enhancedLocation.standardized_address,
              place_id: enhancedLocation.place_id,
              geocoded_at: enhancedLocation.geocoded_at
            })
            .eq('id', property.id);

          if (updateError) {
            console.error(`  ❌ Error updating property ${property.id}:`, updateError);
            failedCount++;
          } else {
            console.log(`  ✅ Geocoded: ${enhancedLocation.standardized_address}`);
            geocodedCount++;
          }
        } else {
          console.log(`  ⚠️ Could not geocode: ${JSON.stringify(locationData)}`);
          failedCount++;
        }

        // Add delay to respect API rate limits (200ms between requests)
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ❌ Error processing property ${property.id}:`, error.message);
        failedCount++;
      }
    }

    console.log(`\n🎉 Geocoding complete!`);
    console.log(`📊 Results:`);
    console.log(`   ✅ Successfully geocoded: ${geocodedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📍 Total processed: ${properties.length}`);
    
  } catch (error) {
    console.error('❌ Error during geocoding process:', error);
  }
}

// Run the geocoding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  geocodeExistingProperties();
}

export { geocodeExistingProperties };
