# Realistly MVP

A full-stack Next.js 14 application that processes WhatsApp chat exports to extract real estate listings using Gemini AI and stores them in Supabase for searchable access.

## Features

- **Admin Panel**: Upload WhatsApp chat exports (.txt files) to extract and process real estate listings
- **Search Interface**: Search for properties using natural language queries
- **AI Processing**: Uses Google's Gemini AI to extract structured data from unstructured text
- **Database Storage**: Stores raw and processed data in Supabase

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase
- **AI**: Google Gemini AI
- **File Processing**: Formidable

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account with a project set up
- Google Gemini API key

## Setup

1. Clone the repository

```bash
git clone <repository-url>
cd realistly-mvp
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables

Create a `.env.local` file with these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

4. Set up Supabase tables

Use the provided SQL script in `supabase-schema.sql` to create the required tables in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL statements

This will create the following tables:

- `raw_data` table: Stores raw WhatsApp messages
- `processed_listings` table: Stores AI-processed property listings
- `user_queries` table: Tracks user search queries
  - `timestamp` (timestamp with time zone)
  - `author` (text)
  - `content` (text)
  - `source` (text)
  - `created_at` (timestamp with time zone)

- `processed_listings` table:
  - `id` (uuid, primary key)
  - `message_id` (text)
  - `author` (text)
  - `original_message` (text)
  - `propertyType` (text)
  - `location` (text)
  - `price` (text)
  - `area` (text)
  - `bhk` (text)
  - `description` (text)
  - `contactInfo` (text)
  - `amenities` (json)
  - `missingFields` (json)
  - `processed_at` (timestamp with time zone)
  - `created_at` (timestamp with time zone)

- `user_queries` table:
  - `id` (uuid, primary key)
  - `query_text` (text)
  - `timestamp` (timestamp with time zone)
  - `user_ip` (text)
  - `user_agent` (text)
  - `created_at` (timestamp with time zone)

5. Run the development server

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Usage

### Admin Panel

1. Navigate to `/admin`
2. Upload a WhatsApp chat export file (.txt)
3. The system will process the messages and extract property details
4. View the processed listings on the same page

### Search Properties

1. Navigate to `/search`
2. Enter your search query in natural language (e.g., "2 BHK apartment in Bandra under 2 crores")
3. The system will process your query and return matching properties

## License

[MIT License](LICENSE)
