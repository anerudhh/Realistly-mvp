import React from 'react';

/**
 * Footer component for consistent footer across pages
 */
export default function Footer() {
  return (
    <footer className="bg-white border-t mt-auto py-8">
      <div className="container mx-auto px-4 text-center text-gray-500">
        <p>© {new Date().getFullYear()} Realistly MVP. All rights reserved.</p>
      </div>
    </footer>
  );
}
