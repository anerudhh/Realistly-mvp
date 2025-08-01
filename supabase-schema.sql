-- This file contains SQL statements to set up the Supabase database tables
-- Run these in the Supabase SQL editor to create the tables for the application

-- Table for storing raw WhatsApp message data
CREATE TABLE IF NOT EXISTS raw_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  raw_content TEXT NOT NULL,
  source TEXT NOT NULL,
  source_group TEXT,
  media_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add an index on timestamp for faster querying
CREATE INDEX IF NOT EXISTS idx_raw_data_timestamp ON raw_data (timestamp);

-- Table for storing processed property listings
CREATE TABLE IF NOT EXISTS processed_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_data_id UUID REFERENCES raw_data(id),
  property_type TEXT,
  location JSONB,  -- Structured as {area, city, landmarks[]}
  price JSONB,     -- Structured as {value, currency, formatted, negotiable}
  area JSONB,      -- Structured as {value, unit, formatted}
  bhk TEXT,
  description TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  amenities JSONB, -- Array of amenities
  features JSONB,  -- Array of additional features
  availability TEXT,
  property_condition TEXT,
  furnishing TEXT,
  legal_clear BOOLEAN,
  missing_fields JSONB, -- Array of missing important fields
  needs_followup BOOLEAN DEFAULT false,
  confidence_score NUMERIC,
  status TEXT DEFAULT 'needs_review',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- New fields for image processing
  extracted_from_image BOOLEAN DEFAULT false,
  image_filename TEXT,
  extracted_text TEXT,
  ocr_method TEXT, -- 'google-vision', 'tesseract', or 'combined'
  
  -- Geocoding fields
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  standardized_address TEXT,
  place_id TEXT,
  geocoded_at TIMESTAMPTZ,
  
  -- Additional metadata
  content TEXT, -- Original message content
  sender_name TEXT,
  sender_phone TEXT,
  timestamp TIMESTAMPTZ,
  source TEXT,
  source_group TEXT,
  contact_info TEXT
);

-- Add indexes for common query fields
CREATE INDEX IF NOT EXISTS idx_processed_listings_property_type ON processed_listings (property_type);
CREATE INDEX IF NOT EXISTS idx_processed_listings_status ON processed_listings (status);
CREATE INDEX IF NOT EXISTS idx_processed_listings_confidence ON processed_listings (confidence_score);
CREATE INDEX IF NOT EXISTS idx_processed_listings_image ON processed_listings (extracted_from_image);
CREATE INDEX IF NOT EXISTS idx_processed_listings_location ON processed_listings USING GIN (location);
CREATE INDEX IF NOT EXISTS idx_processed_listings_timestamp ON processed_listings (timestamp);

-- Create spatial index for location-based queries (if PostGIS is enabled)
-- CREATE INDEX IF NOT EXISTS idx_processed_listings_location_point 
-- ON processed_listings USING GIST (ST_Point(longitude, latitude)) 
-- WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for geocoding fields
CREATE INDEX IF NOT EXISTS idx_processed_listings_coordinates 
ON processed_listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_listings_place_id 
ON processed_listings (place_id) 
WHERE place_id IS NOT NULL;

-- Table for tracking user search queries
CREATE TABLE IF NOT EXISTS user_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_text TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  user_ip TEXT,
  user_agent TEXT,
  results_shown INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on timestamp for search query analytics
CREATE INDEX IF NOT EXISTS idx_user_queries_timestamp ON user_queries (timestamp);

-- Storage policy to allow uploading WhatsApp chat files securely
-- Note: Run this in a separate statement if you have set up storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp_uploads', 'WhatsApp Upload Files', false)
ON CONFLICT DO NOTHING;


CREATE POLICY "Only authenticated users can upload WhatsApp .txt files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp_uploads'
    AND right(name, 4) = '.txt'
  );

