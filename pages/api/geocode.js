import { getCoordinatesFromAddress, getAddressFromCoordinates, standardizeIndianAddress } from '../../utils/geocoding';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, latitude, longitude, type = 'forward' } = req.body;

    console.log('Geocoding API request:', { type, address, latitude, longitude });

    if (type === 'forward' && address) {
      // Forward geocoding: address → coordinates
      const standardizedAddress = standardizeIndianAddress(address);
      console.log('Standardized address:', standardizedAddress);
      
      const result = await getCoordinatesFromAddress(standardizedAddress);
      
      if (result) {
        return res.status(200).json({
          success: true,
          type: 'forward',
          input: address,
          standardized_input: standardizedAddress,
          result
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Address not found'
        });
      }
    } else if (type === 'reverse' && latitude && longitude) {
      // Reverse geocoding: coordinates → address
      const result = await getAddressFromCoordinates(latitude, longitude);
      
      if (result) {
        return res.status(200).json({
          success: true,
          type: 'reverse',
          input: { latitude, longitude },
          result
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Coordinates not found'
        });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid request. Provide either address for forward geocoding or latitude/longitude for reverse geocoding'
      });
    }
  } catch (error) {
    console.error('Geocoding API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
