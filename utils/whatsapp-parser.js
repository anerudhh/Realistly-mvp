/**
 * Parse WhatsApp chat export files into structured message objects
 * @param {string} chatContent - Content of the WhatsApp .txt export file
 * @param {string} sourceGroup - Optional group name for the WhatsApp chat
 * @returns {Array} - Array of message objects
 */
export function parseWhatsAppChat(chatContent, sourceGroup = 'Unknown Group') {
  // Validate input
  if (!chatContent || typeof chatContent !== 'string') {
    console.error("Invalid chat content provided to parser");
    return [];
  }

  try {
    // Regular expression to match WhatsApp message format
    // Format: [DD/MM/YY, HH:MM:SS] Author: Message content
    const messageRegex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}(?::\d{2})?)(?: [AP]M)?\] ([^:]+): ([\s\S]*?)(?=\[\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?: [AP]M)?\]|$)/g;
    
    // Regular expression to extract media URLs or attachments
    const mediaRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|mp4|pdf|doc|docx))/gi;
    
    // Regular expression to possibly extract phone numbers
    const phoneRegex = /(\+?\d{10,15}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g;
    
    const messages = [];
    let match;
    
    while ((match = messageRegex.exec(chatContent)) !== null) {
      try {
        const [_, datePart, timePart, author, content] = match;
        
        // Skip system messages, empty messages, or very short messages (less than 20 chars)
        if (
          !author ||
          !content ||
          author.includes("System") || 
          content.trim().length === 0 || 
          content.trim().length < 20
        ) {
          continue;
        }
        
        // Parse the date into ISO format
        const dateParts = datePart.split('/');
        if (dateParts.length !== 3) {
          console.warn("Invalid date format:", datePart);
          continue;
        }
        
        const [day, month, yearShort] = dateParts;
        // Assume 20xx for two-digit years
        const year = yearShort.length === 2 ? `20${yearShort}` : yearShort;
        
        // Create ISO date string (YYYY-MM-DD)
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Format time (assuming 24-hour format in the export)
        const isoTime = timePart;
        
        // Extract media URLs if any
        const mediaUrls = content.match(mediaRegex) || [];
        
        // Try to extract phone number from the author or content
        let senderPhone = null;
        const phoneMatches = content.match(phoneRegex) || [];
        if (phoneMatches.length > 0) {
          senderPhone = phoneMatches[0].replace(/[-.\s]/g, '');
        }
        
        // Extract sender name (remove any phone number from the author if present)
        const senderName = author.trim().replace(phoneRegex, '').trim();
        
        let timestamp;
        try {
          timestamp = new Date(`${isoDate}T${isoTime}`).toISOString();
        } catch (dateError) {
          console.warn("Invalid date/time format:", isoDate, isoTime);
          timestamp = new Date().toISOString(); // Fallback to current time
        }
        
        messages.push({
          date: isoDate,
          time: isoTime,
          timestamp: timestamp,
          sender_name: senderName,
          sender_phone: senderPhone,
          content: content.trim(),
          source: 'whatsapp',
          source_group: sourceGroup,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null
        });
      } catch (messageError) {
        console.error("Error processing message:", messageError);
        // Continue to next message
      }
    }
    
    return messages;
  } catch (error) {
    console.error("Error parsing WhatsApp chat:", error);
    return [];
  }
}
