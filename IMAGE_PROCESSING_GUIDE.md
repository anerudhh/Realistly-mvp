# Image Processing Integration Guide

## 🖼️ WhatsApp Image Processing

Your Realistly MVP now supports extracting property information from images in WhatsApp chats! Here's how to use and configure the image processing system.

## 🚀 Quick Start

### 1. Set Up API Keys

Add these to your `.env.local` file:

```bash
# Google Cloud Vision API (Recommended for best accuracy)
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id_here
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key_here
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account_email_here
GOOGLE_CLOUD_CLIENT_ID=your_client_id_here

# Google Maps API (for geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. How to Get Google Cloud Vision API Credentials

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable the Vision API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"
4. **Create Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description
   - Grant "Cloud Vision API User" role
5. **Generate Key**:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose JSON format
   - Download the key file
6. **Extract values for .env.local**:
   - Open the downloaded JSON file
   - Copy the values to your `.env.local` file

## 📁 Processing WhatsApp Chats with Images

### Method 1: Upload via Web Interface

1. **Export WhatsApp chat** with media included
2. **Navigate to** `/components/WhatsAppImageUploader`
3. **Select files**: Choose the chat .txt file and all image files
4. **Click upload** to process

### Method 2: API Endpoint

```javascript
const formData = new FormData();
formData.append('file-0', chatTextFile);
formData.append('file-1', image1);
formData.append('file-2', image2);
// ... add more files

const response = await fetch('/api/process-whatsapp-with-images', {
  method: 'POST',
  body: formData
});
```

### Method 3: Programmatic Processing

```javascript
import { parseWhatsAppChatWithImages } from './utils/whatsapp-parser';

const result = await parseWhatsAppChatWithImages('/path/to/chat/folder');
console.log(`Found ${result.processedMessages} properties`);
```

## 🔧 Configuration Options

### OCR Methods

The system uses a fallback strategy:

1. **Google Cloud Vision** (Primary) - Best accuracy, requires API key
2. **Tesseract.js** (Fallback) - Free, works offline, lower accuracy

### Supported Image Formats

- **JPEG/JPG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)
- **TIFF** (.tiff, .tif)
- **BMP** (.bmp)

### Image Requirements

- **Minimum size**: 100x100 pixels
- **Maximum size**: 5000x5000 pixels
- **File size limit**: 10MB per image
- **Text quality**: Clear, readable text works best

## 🧪 Testing Image Processing

Run the test script to validate your setup:

```bash
node test-image-processing.js
```

This will:
1. Look for images in `test-images/` folder
2. Extract text using OCR
3. Process text for property data
4. Show detailed results

## 📊 API Responses

### Upload Response Format

```json
{
  "success": true,
  "summary": {
    "totalFiles": 5,
    "chatFiles": 1,
    "imageFiles": 4,
    "totalMessages": 25,
    "textMessages": 20,
    "imageMessages": 5,
    "processedMessages": 8,
    "savedToDatabase": 8
  },
  "messages": [
    {
      "type": "image",
      "filename": "IMG-20240101-WA001.jpg",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "extractedText": "3 BHK Apartment for Sale...",
      "propertyData": {
        "propertyType": "apartment",
        "location": {
          "area": "Koramangala",
          "city": "Bengaluru",
          "coordinates": {
            "latitude": 12.9279,
            "longitude": 77.6271
          }
        },
        "price": {
          "value": 25000000,
          "currency": "INR",
          "formatted": "₹2.5 crores"
        }
      }
    }
  ]
}
```

## 💰 Cost Considerations

### Google Cloud Vision API Pricing

- **Free tier**: 1,000 requests/month
- **Paid**: $1.50 per 1,000 requests
- **Recommended**: Set up billing alerts

### Optimization Tips

1. **Preprocess images** to improve OCR accuracy
2. **Batch process** multiple images together
3. **Cache results** to avoid re-processing
4. **Use high-quality images** for better text extraction

## 🔍 How It Works

### Text Extraction Process

1. **Image Upload** → Validate format and size
2. **Preprocessing** → Resize, convert to grayscale, sharpen
3. **OCR Processing** → Extract text using Google Vision or Tesseract
4. **AI Analysis** → Process extracted text with OpenAI
5. **Geocoding** → Add coordinates to locations
6. **Database Storage** → Save structured property data

### Supported Property Information

From images, the system can extract:

- **Property Type** (apartment, villa, plot, etc.)
- **Location** (area, city, landmarks)
- **Price** (sale price, rent amount)
- **Area** (square feet, square meters)
- **BHK Configuration**
- **Contact Information**
- **Amenities** (parking, gym, pool, etc.)
- **Features** (furnished, ready to move, etc.)

## 🛠️ Troubleshooting

### Common Issues

1. **No text extracted**
   - Check image quality and resolution
   - Ensure text is not too small or blurry
   - Try with property advertisement images

2. **API key errors**
   - Verify Google Cloud Vision API is enabled
   - Check service account permissions
   - Ensure JSON key format is correct

3. **Large file uploads**
   - Images are limited to 10MB each
   - Total upload limited to 50MB
   - Consider compressing images

### Debug Mode

Set `NODE_ENV=development` to see detailed logs:

```bash
NODE_ENV=development npm run dev
```

## 📈 Performance Optimization

### For Large WhatsApp Exports

1. **Process in batches** of 10-20 images
2. **Add delays** between API calls
3. **Monitor API quotas** and usage
4. **Use caching** for repeated processing

### Memory Management

- Images are processed one at a time
- Temporary files are cleaned up automatically
- Large images are resized before processing

## 🎯 Best Practices

### Image Quality Tips

1. **Use screenshots** of property listings
2. **Ensure good lighting** and contrast
3. **Avoid blurry or tilted images**
4. **Include property advertisements** with clear text

### WhatsApp Export Tips

1. **Export with media** included
2. **Choose appropriate date range** for property discussions
3. **Include group chats** where properties are shared
4. **Organize files** in a single folder for processing

## 🔗 Integration Examples

### Frontend Integration

```jsx
import WhatsAppImageUploader from '../components/WhatsAppImageUploader';

function PropertyManagement() {
  return (
    <div>
      <h1>Property Management</h1>
      <WhatsAppImageUploader />
    </div>
  );
}
```

### Backend Integration

```javascript
import { processImageFile } from './utils/whatsapp-parser';

// Process a single image
const result = await processImageFile('./property-image.jpg');
console.log(result.propertyData);
```

## 📚 Additional Resources

- [Google Cloud Vision API Docs](https://cloud.google.com/vision/docs)
- [Tesseract.js Documentation](https://github.com/naptha/tesseract.js)
- [WhatsApp Export Guide](https://faq.whatsapp.com/196737011380816)

## 🆘 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all API keys are correctly configured
3. Test with high-quality property images
4. Ensure sufficient API quotas are available

Happy property processing! 🏠✨
