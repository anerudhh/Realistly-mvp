# Getting Started with Realistly MVP

To make your Realistly MVP project fully functional, follow these steps:

## 1. Set Up Supabase

1. Create a Supabase account at [https://supabase.com](https://supabase.com) if you haven't already
2. Create a new project
3. Go to the SQL Editor in your Supabase project
4. Copy and paste the contents of `supabase-schema.sql` and run it to create the necessary tables
5. In the Supabase project settings, get your:
   - Project URL
   - Anon public key
   - Service role key (keep this secure!)

## 2. Set Up Google Gemini AI

1. Go to [https://ai.google.dev/](https://ai.google.dev/) to create an account
2. Generate an API key for the Gemini API
3. Copy your API key

## 3. Configure Environment Variables

Create or edit the `.env.local` file with these values:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

## 4. Install Dependencies

Run this command in your terminal:
```
npm install
```

## 5. Run the Development Server

Start the development server:
```
npm run dev
```

Now you can access the application at: [http://localhost:3000](http://localhost:3000)

## 6. Test with Sample WhatsApp Data

1. Export a WhatsApp chat as a `.txt` file:
   - Open a WhatsApp chat
   - Click ⋮ (three dots) > More > Export chat
   - Choose "Without media"
   - Save the `.txt` file
   
2. Go to the Admin panel at [http://localhost:3000/admin](http://localhost:3000/admin)
3. Upload the WhatsApp chat export file
4. Wait for processing to complete
5. Go to the Search page at [http://localhost:3000/search](http://localhost:3000/search) to search for properties

## 7. For Production Deployment

When you're ready to deploy:

1. Build the application:
```
npm run build
```

2. Deploy to Vercel or your preferred hosting platform
3. Set up the environment variables in your hosting platform

## Troubleshooting

1. If you see "Failed to parse JSON from AI response" errors:
   - Check your Gemini API key
   - Make sure your API key has enough quota/credits

2. If database operations fail:
   - Check your Supabase credentials
   - Ensure the tables were created correctly
   - Check if you have the right permissions

3. For file upload issues:
   - Make sure you're using a valid WhatsApp chat export (`.txt` file)
   - Check that formidable is correctly handling file uploads

Happy property listing!
