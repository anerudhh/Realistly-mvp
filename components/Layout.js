import React from 'react';

/**
 * Layout component that wraps all pages
 */
export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      {children}
    </div>
  );
}
