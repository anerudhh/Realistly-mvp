// Disable body parsing, we'll handle the form data manually
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Set JSON response headers
  res.setHeader('Content-Type', 'application/json');
  
  console.log("API HIT! Method:", req.method);
  
  if (req.method !== 'POST') {
    console.log("Method not allowed, returning 405");
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("=== WhatsApp Processing Started ===");

  // For now, just return a simple test response to verify API is working
  try {
    console.log("Returning test response");
    return res.status(200).json({
      success: true,
      totalMessages: 5,
      processedListings: [
        {
          id: 1,
          propertyType: "Test Apartment",
          location: "Test Location",
          price: "Test Price",
          area: "Test Area",
          bhk: 2,
          description: "This is a test listing to verify the API is working",
          contactPhone: "+1234567890",
          amenities: ["Parking", "Gym"],
          missingFields: []
        }
      ],
      message: "API is working! File processing temporarily disabled for testing."
    });
  } catch (error) {
    console.error("Even simple response failed:", error);
    return res.status(500).json({ error: "Simple test failed" });
  }
}
