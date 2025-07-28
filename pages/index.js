import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Realistly - Real Estate Made Simple</title>
        <meta name="description" content="Buy, Sell & Rent properties with AI-powered search and WhatsApp chat processing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-coral-50 to-teal-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Buy, Sell 
            <br />
            <span className="text-coral-500">Starts here.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Discover your perfect property with AI-powered search and automated WhatsApp chat processing
          </p>
        </div>
      </section>

      {/* What Are You Looking For Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              WHAT ARE YOU LOOKING FOR?
            </h2>
            <div className="w-24 h-1 bg-teal-500 mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Search Properties Card */}
            <Link href="/search" className="group">
              <div className="relative overflow-hidden rounded-xl h-80 bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-4xl font-bold text-white mb-4">Search</h3>
                  <p className="text-white text-lg opacity-90">
                    Find your perfect property using AI-powered natural language search
                  </p>
                </div>
              </div>
            </Link>

            {/* Admin Panel Card */}
            <Link href="/admin" className="group">
              <div className="relative overflow-hidden rounded-xl h-80 bg-gradient-to-br from-coral-500 to-coral-700 shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-4xl font-bold text-white mb-4">Process</h3>
                  <p className="text-white text-lg opacity-90">
                    Upload WhatsApp chats to extract property listings automatically
                  </p>
                </div>
              </div>
            </Link>

            {/* Coming Soon - Loans */}
            <div className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-xl h-80 bg-gradient-to-br from-teal-500 to-teal-700 shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-8">
                  <div className="text-6xl mb-4">🏦</div>
                  <h3 className="text-4xl font-bold text-white mb-4">Loan</h3>
                  <p className="text-white text-lg opacity-90">
                    Get financing solutions for your property purchase
                  </p>
                  <span className="mt-2 px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-coral-500 text-4xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Processing</h3>
              <p className="text-gray-600 mb-6">
                Our advanced AI automatically extracts property details from WhatsApp chats, 
                saving hours of manual data entry and ensuring accurate listing information.
              </p>
              <Link href="/admin" className="inline-flex items-center text-coral-500 font-semibold hover:text-coral-600">
                Try Admin Panel
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-teal-500 text-4xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Property Search</h3>
              <p className="text-gray-600 mb-6">
                Search properties using natural language. Just describe what you're looking for, 
                and our AI will find matching properties from our comprehensive database.
              </p>
              <Link href="/search" className="inline-flex items-center text-teal-500 font-semibold hover:text-teal-600">
                Start Searching
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">YOUR NEXT STEP IS ONE CLICK AWAY!</h2>
            <p className="text-xl text-gray-300">Get in touch with us today</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-3xl mb-4">📞</div>
              <h3 className="text-xl font-semibold mb-2">Call Us</h3>
              <p className="text-gray-300 mb-2">Free Calls</p>
              <p className="text-lg font-semibold">+91-1234567890</p>
            </div>
            
            <div>
              <div className="text-3xl mb-4">📍</div>
              <h3 className="text-xl font-semibold mb-2">Find Us</h3>
              <p className="text-gray-300">
                Bengaluru
              </p>
            </div>
            
            <div>
              <div className="text-3xl mb-4">✉️</div>
              <h3 className="text-xl font-semibold mb-2">Email Us</h3>
              <p className="text-gray-300 mb-2">Direct Email</p>
              <a href="mailto:contact@realistly.com" className="text-coral-400 hover:text-coral-300">
                contact@realistly.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-coral-500 mb-4">realistly</div>
              <p className="text-gray-400">
                We create financial wellness on buying, selling and rentals of properties
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white">Home</Link></li>
                <li><Link href="/search" className="hover:text-white">Properties</Link></li>
                <li><Link href="/admin" className="hover:text-white">Admin</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Property Search</li>
                <li>WhatsApp Processing</li>
                <li>AI Analytics</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-700 rounded"></div>
                <div className="w-8 h-8 bg-gray-700 rounded"></div>
                <div className="w-8 h-8 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Realistly MVP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
