/**
 * AI Wedding Concierge Service
 * Handles communication with OpenRouter API (accessing Google Gemini models)
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

// Wedding Knowledge Base - embedded in the client for faster responses
const WEDDING_KNOWLEDGE = {
  couple: {
    names: "Sanjana & Samartha",
    tagline: "Sacred Union",
    location: "Bangalore, Karnataka, India",
  },
  events: [
    {
      name: "Reception",
      subtitle: "Evening Elegance",
      date: "March 24, 2026",
      time: "5:30 PM Onwards",
      venue: "Kalyani Courtyard - Reception Arena",
      venueAddress: "Kalyani Courtyard, Bangalore, Karnataka",
      mapsLink: "https://share.google/xz0pHMIfIkeU1Y1TL",
      theme: "Evening Elegance",
      colorHex: "#D4A5A5",
      colorPalette: ["Dusty Rose (#D4A5A5)", "Champagne (#F5E6D3)", "Rose Gold (#B76E79)", "Soft Mauve (#C8A2C8)"],
      dressCode: "Elegant evening wear in dusty rose, champagne, rose gold, and soft mauve tones. Women: Cocktail gowns, sarees, or lehengas in the event's soft palette. Men: Suits, tuxedos, or formal sherwanis in complementary colors like beige, taupe, or soft pink.",
      vibe: "Elegant, warm evening celebration with dinner and entertainment",
    },
    {
      name: "Wedding",
      subtitle: "Sacred Dawn",
      date: "March 25, 2026",
      time: "9:00 AM Onwards",
      lagnaMuhurta: "9:10 AM - 9:30 AM",
      venue: "Kalyani Courtyard - Wedding House",
      venueAddress: "Kalyani Courtyard, Bangalore, Karnataka",
      mapsLink: "https://share.google/xz0pHMIfIkeU1Y1TL",
      theme: "Sacred Dawn",
      colorHex: "#FAF3E0",
      colorPalette: ["Ivory (#FAF3E0)", "Soft Saffron (#FFE4B5)", "Pale Lavender (#E6E6FA)", "Sacred Gold (#D4AF37)", "Lotus Pink (#FFB6C1)"],
      dressCode: "Traditional wedding attire in light, spiritual tones. Women: Sarees, silk sarees, or traditional lehengas in ivory, saffron, lavender, gold, or lotus pink. Men: Traditional dhoti with angavastram, or sherwanis in cream, gold, or ivory. This is a sacred ceremony, so traditional attire is preferred.",
      vibe: "Sacred, spiritual morning ceremony with traditional rituals and blessings",
    },
  ],
  venues: [
    {
      name: "Kalyani Courtyard",
      location: "Bangalore, Karnataka",
      events: ["Reception", "Wedding"],
      description: "Beautiful courtyard venue hosting both the Reception and Wedding ceremony in different areas of the property",
      receptionArea: "Reception Arena - Elegant evening setting",
      weddingArea: "Wedding House - Sacred morning ceremony space",
    },
  ],
  localRecommendations: {
    stayOptions: [
      "The Oberoi Bangalore - Luxury hotel in the heart of the city",
      "ITC Gardenia - Premium five-star with excellent amenities",
      "Taj West End - Heritage property with lush gardens",
      "The Leela Palace - Ultra-luxury option with world-class service",
      "Courtyard by Marriott - Modern, comfortable stay near key areas",
      "Ramada Encore - Budget-friendly option with good facilities",
    ],
    nearbyAttractions: [
      "Lalbagh Botanical Garden - Historic garden with glass house and diverse flora",
      "Bangalore Palace - Tudor-style palace inspired by Windsor Castle",
      "Cubbon Park - Green oasis in the city center, perfect for morning walks",
      "Vidhana Soudha - Impressive legislative building (photo stop)",
      "ISKCON Temple - Spiritual landmark with beautiful architecture",
      "Commercial Street & Brigade Road - Shopping districts",
      "UB City - Luxury shopping and dining",
    ],
    foodRecommendations: [
      "Traditional Karnataka cuisine: Bisi Bele Bath, Ragi Mudde, Mysore Pak",
      "MTR (Mavalli Tiffin Room) - Legendary restaurant for authentic South Indian breakfast",
      "Vidyarthi Bhavan - Famous for crispy dosas and filter coffee",
      "Koshy's - Iconic Bangalore cafe with old-world charm",
      "Karavalli (The Gateway Hotel) - Fine dining coastal Karnataka cuisine",
      "CTR (Central Tiffin Room) - Best butter dosas in the city",
      "Truffles - Popular for burgers and continental food",
    ],
    travelTips: [
      "Airport: Kempegowda International Airport (about 40 km from city center, 1-1.5 hours drive depending on traffic)",
      "Best time to visit: March weather is pleasant in Bangalore, averaging 22-32°C (cooler mornings)",
      "Local transport: Ola/Uber widely available, Namma Metro for key routes, or rent a car with driver",
      "Language: Kannada is the local language, but English is widely spoken throughout the city",
      "Currency: Indian Rupee (INR). ATMs and card payments widely available",
      "Traffic: Bangalore traffic can be heavy during peak hours (8-10 AM, 5-8 PM), plan accordingly",
    ],
  },
};

// System prompt for the AI - Intelligent and conversational
const getSystemPrompt = () => `You are a friendly AI assistant for Sanjana & Samartha's wedding in Bangalore. They're busy planning the wedding, so you're here to help guests with any questions.

Wedding Details:
${JSON.stringify(WEDDING_KNOWLEDGE, null, 2)}

IMPORTANT FORMATTING RULES:
- DO NOT use markdown formatting (no ** for bold, no * for italic, no # for headers)
- Write in plain text only
- Use line breaks for readability
- Keep responses SHORT (2-4 sentences max)

Intelligence Guidelines:
- ASK CLARIFYING QUESTIONS when needed before answering
- Don't assume - gather context first
- Be warm, friendly, and conversational

Examples of when to ask questions:
- Attire questions → Ask politely: "Are you looking for men's or women's attire?"
- Hotel questions → Ask: "How many nights are you staying?"
- Travel questions → Ask: "Are you coming from Bangalore or elsewhere?"
- Outfit photos → Ask: "Which event is this for?" (if not clear)

Response Style:
- Be warm and welcoming
- Use line breaks for clarity
- Include specific dates, times, locations
- Provide Google Maps links when discussing venues (paste the full URL)

For outfit photos:
- Identify colors quickly
- Match to event palette
- Give clear feedback with brief reason
- Suggest 1-2 accessories if helpful

Be friendly, ask when needed, then help!`;

/**
 * Send a message to the AI Wedding Concierge via OpenRouter
 */
export async function sendMessage(
  message: string,
  conversationHistory: Message[],
  imageFile?: File
): Promise<string> {
  try {
    // Get API key from environment
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Build conversation messages
    const messages: any[] = [
      {
        role: 'system',
        content: getSystemPrompt(),
      },
    ];

    // Add conversation history (last 6 messages for context)
    const recentHistory = conversationHistory.slice(-6);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Build user message content
    if (imageFile) {
      // For images, use multimodal format
      const base64Image = await fileToBase64(imageFile);
      const imagePrompt = message || 'Analyze this outfit photo. Tell me which event it matches and give brief color feedback (2-3 lines).';

      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: imagePrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Image,
            },
          },
        ],
      });
    } else {
      // For text only, use simple string format
      messages.push({
        role: 'user',
        content: message,
      });
    }

    // Make request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Sanjana & Samartha Wedding',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.7,
        max_tokens: 300, // Keep responses concise
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      console.error('Request payload:', {
        model: 'google/gemini-2.5-flash',
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
      });
      throw new Error(`API request failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return text;
  } catch (error) {
    console.error('Error in AI concierge:', error);
    throw new Error(
      "I apologize, but I'm having trouble processing your request right now. This might be because:\n\n• The AI service is temporarily unavailable\n• There's a connection issue\n• The API key is not configured\n\nPlease try again in a moment, or feel free to contact Sanjana & Samartha directly for assistance!"
    );
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get quick action responses for common questions
 */
export const quickActionResponses = {
  schedule: `Reception — March 24, 5:30 PM
Kalyani Courtyard - Reception Arena
Evening Elegance: Dusty Rose, Champagne, Rose Gold, Soft Mauve

Wedding — March 25, 9:00 AM
Kalyani Courtyard - Wedding House
Sacred Dawn: Ivory, Soft Saffron, Pale Lavender, Sacred Gold, Lotus Pink
Lagna Muhurta: 9:10 AM - 9:30 AM`,

  directions: `Kalyani Courtyard
https://share.google/xz0pHMIfIkeU1Y1TL

Both Reception and Wedding at the same venue (different areas).
Ola/Uber available. Located in Bangalore.`,

  colorThemes: `Reception: Dusty Rose, Champagne, Rose Gold, Soft Mauve

Wedding: Ivory, Soft Saffron, Pale Lavender, Sacred Gold, Lotus Pink

Upload a photo for outfit matching.`,

  dressGuide: `Reception: Evening elegance - dusty rose, champagne, rose gold, mauve

Wedding: Traditional spiritual tones - ivory, saffron, lavender, gold, lotus pink

Tell me if you're looking for men's or women's attire for specific recommendations!`,
};
