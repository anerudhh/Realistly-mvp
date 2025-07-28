import { supabaseAdmin } from './utils/supabase.js';

async function debugSupabase() {
  console.log('🔍 Debugging Supabase search issues...\n');

  try {
    // Test 1: Check total count without filters
    console.log('=== Test 1: Total count in processed_listings ===');
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('processed_listings')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count error:', countError);
    } else {
      console.log(`Total records: ${totalCount}`);
    }

    // Test 2: Check status distribution
    console.log('\n=== Test 2: Status distribution ===');
    const { data: statusData, error: statusError } = await supabaseAdmin
      .from('processed_listings')
      .select('status')
      .limit(1000);
    
    if (statusError) {
      console.error('Status error:', statusError);
    } else {
      const statusCount = {};
      statusData.forEach(row => {
        const status = row.status || 'null';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      console.log('Status distribution:', statusCount);
    }

    // Test 3: Sample records
    console.log('\n=== Test 3: Sample records ===');
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('processed_listings')
      .select('id, property_type, status, location, price')
      .limit(5);
    
    if (sampleError) {
      console.error('Sample error:', sampleError);
    } else {
      console.log('Sample records:');
      sampleData.forEach((record, index) => {
        console.log(`${index + 1}. ID: ${record.id}`);
        console.log(`   Type: ${record.property_type}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Location: ${JSON.stringify(record.location)}`);
        console.log(`   Price: ${JSON.stringify(record.price)}`);
        console.log('');
      });
    }

    // Test 4: Simple search without AI processing
    console.log('=== Test 4: Simple search without filters ===');
    const { data: simpleData, error: simpleError } = await supabaseAdmin
      .from('processed_listings')
      .select('*')
      .limit(10);
    
    if (simpleError) {
      console.error('Simple search error:', simpleError);
    } else {
      console.log(`Simple search returned ${simpleData.length} results`);
    }

    // Test 5: Search without status filter
    console.log('\n=== Test 5: Search without status filter ===');
    const { data: noStatusData, error: noStatusError } = await supabaseAdmin
      .from('processed_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (noStatusError) {
      console.error('No status filter error:', noStatusError);
    } else {
      console.log(`No status filter returned ${noStatusData.length} results`);
    }

    // Test 6: Search with verified status only
    console.log('\n=== Test 6: Search with verified status only ===');
    const { data: verifiedData, error: verifiedError } = await supabaseAdmin
      .from('processed_listings')
      .select('*')
      .eq('status', 'verified')
      .limit(10);
    
    if (verifiedError) {
      console.error('Verified status error:', verifiedError);
    } else {
      console.log(`Verified status filter returned ${verifiedData.length} results`);
    }

  } catch (error) {
    console.error('Overall error:', error);
  }
}

debugSupabase();
