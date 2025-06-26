import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Realistly - Real Estate WhatsApp Data Processing</title>
        <meta name="description" content="Process and search real estate WhatsApp data" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-blue-600 mb-4">Realistly</h1>
          <p className="text-xl text-gray-600 mb-8">
            Extract, process and search real estate listings from WhatsApp chats
          </p>
          
          <div className="flex flex-col md:flex-row justify-center gap-6 mt-12">
            <Link 
              href="/admin" 
              className="btn bg-blue-600 px-8 py-3 text-lg"
            >
              Admin Panel
            </Link>
            <Link 
              href="/search" 
              className="btn bg-green-600 px-8 py-3 text-lg"
            >
              Search Properties
            </Link>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">For Admins</h2>
            <p className="text-gray-600 mb-4">
              Upload WhatsApp chat exports (.txt files) to extract property listings
              automatically using AI. Process message data and store structured
              real estate information.
            </p>
            <Link href="/admin" className="text-blue-600 font-medium hover:underline">
              Go to Admin Panel →
            </Link>
          </div>
          
          <div className="card">
            <h2 className="text-2xl font-semibold mb-4">For Customers</h2>
            <p className="text-gray-600 mb-4">
              Search for properties using natural language. Our AI will understand
              your requirements and find matching properties from our database.
            </p>
            <Link href="/search" className="text-green-600 font-medium hover:underline">
              Search Properties →
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>© {new Date().getFullYear()} Realistly MVP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
