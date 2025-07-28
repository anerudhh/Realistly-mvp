import React from 'react';
import Link from 'next/link';

/**
 * Header component for consistent navigation across pages
 */
export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-2xl font-bold text-coral-500">realistly</span>
        </Link>
        
        <nav>
          <ul className="flex space-x-8">
            <li>
              <Link href="/" className="text-gray-700 hover:text-coral-500 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/search" className="text-gray-700 hover:text-coral-500 transition-colors">
                Properties
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-gray-700 hover:text-coral-500 transition-colors">
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
