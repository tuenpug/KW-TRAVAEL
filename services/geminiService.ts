import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TripData, Activity, Itinerary } from "../types";
import { v4 as uuidv4 } from 'uuid';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// --- ONLINE IMAGE SEARCH (Wikipedia API) ---
// We use Wikipedia's API to find real images for the activities.
// This satisfies the "search online" requirement without needing a private API key.

const searchWikimediaImage = async (query: string): Promise<string | null> => {
    try {
        // Search for the page first
        const searchUrl = `https://zh.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=0&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=800&origin=*&gsrsearch=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        
        if (data.query?.pages) {
            const pages = Object.values(data.query.pages) as any[];
            if (pages.length > 0 && pages[0].thumbnail?.source) {
                return pages[0].thumbnail.source;
            }
        }
        return null;
    } catch (e) {
        console.warn(`Wikipedia search failed for ${query}`, e);
        return null;
    }
};

// Fallback images if Wikipedia search fails (Generic high-quality travel/texture images)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80', // Map/Travel
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // Beach/Scenic
  'https://images.unsplash.com/photo-1504674900247-08775daca0d2?auto=format&fit=crop&w=800&q=80', // Food
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80', // City
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80', // Walking
];

const getBestImageForActivity = async (title: string, destination: string, type: string): Promise<string> => {
    // 1. Try "Destination + Title" (e.g., "Tokyo Meiji Shrine")
    let imageUrl = await searchWikimediaImage(`${destination} ${title}`);
    
    // 2. If fail, try just "Title" (e.g., "Meiji Shrine")
    if (!imageUrl) {
        imageUrl = await searchWikimediaImage(title);
    }
    
    // 3. If still fail, use a deterministic fallback
    if (!imageUrl) {
        const index = Math.abs(hashCode(title)) % FALLBACK_IMAGES.length;
        imageUrl = FALLBACK_IMAGES[index];
    }

    return imageUrl;
};


// --- GEMINI IMAGE GENERATION (On Demand) ---

export const generateCustomImage = async (activityTitle: string, destination: string): Promise<string | null> => {
    const ai = getAiClient();
    const prompt = `A high quality, photorealistic travel photography of ${activityTitle} in ${destination}. Cinematic lighting, detailed, beautiful scenery, 4k resolution.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Gemini Image Gen Failed:", e);
        return null; 
    }
}

// Simple hash function for deterministic fallback
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

// --- Schemas ---

const activitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    startTime: { type: Type.STRING, description: "Start time in HH:MM format (24h)" },
    durationMinutes: { type: Type.INTEGER, description: "Duration in minutes" },
    title: { type: Type.STRING },
    description: { type: Type.STRING, description: "Short description of the activity" },
    location: { type: Type.STRING, description: "Address or Place Name" },
    type: { type: Type.STRING, enum: ["food", "sight", "shopping", "transport", "other"] },
    tips: { type: Type.STRING, description: "Important tips or warnings" },
    transportInfo: { type: Type.STRING, description: "How to get there from previous location or accommodation" },
    reason: { type: Type.STRING, description: "Why this was recommended based on user preferences" },
  },
  required: ["startTime", "durationMinutes", "title", "description", "location", "type", "transportInfo"],
};

const daySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    dayIndex: { type: Type.INTEGER },
    activities: {
      type: Type.ARRAY,
      items: activitySchema,
    },
  },
  required: ["dayIndex", "activities"],
};

const itinerarySchema: Schema = {
  type: Type.ARRAY,
  items: daySchema,
};


export const generateInitialItinerary = async (tripData: TripData): Promise<Itinerary> => {
  const ai = getAiClient();
  
  const daysCount = calculateDays(tripData.arrivalDate, tripData.departureDate);
  
  const prompt = `
    為前往 ${tripData.destination} 的旅行創建一個詳細的行程表。
    請全部使用繁體中文 (Traditional Chinese) 回覆。
    
    背景資料:
    - 到埗: ${tripData.arrivalDate} ${tripData.arrivalTime}
    - 回程: ${tripData.departureDate} ${tripData.departureTime}
    - 人數: ${tripData.adults} 大人, ${tripData.children} 小童
    - 主要住宿: ${tripData.accommodation}
    - 早餐時間: ${tripData.breakfastTime}
    - 自駕遊: ${tripData.selfDrive ? "是" : "否"}
    - 旅遊風格: ${tripData.styles.join(", ")}
    - 必去景點: ${tripData.mustSees}

    要求:
    - 計劃 ${daysCount} 天的行程。
    - 第一天在到埗時間後開始，最後一天在回程時間前結束。
    - 每天包括早餐、午餐和晚餐建議（除非在飛機上）。
    - 每天行程在早餐時間後 30 分鐘開始。
    - 考慮住宿地點的交通邏輯，盡量減少路程時間。
    - 每個活動必須有中文名稱及簡介。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: itinerarySchema,
        systemInstruction: "你是一位專業的繁體中文旅遊策劃師。請只返回 JSON 格式。",
      },
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Parse first to get structure
    const itinerary = parseGeminiResponseToStructure(rawData);
    
    // Then fetch images in parallel
    const itineraryWithImages = await Promise.all(itinerary.map(async (activity) => {
        const imageUrl = await getBestImageForActivity(activity.title, tripData.destination, activity.type);
        return { ...activity, imageUrl };
    }));

    return itineraryWithImages;

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const regenerateActivity = async (
  tripData: TripData, 
  currentActivity: Activity, 
  dayActivities: Activity[],
  promptOverride?: string
): Promise<Activity> => {
  const ai = getAiClient();

  const prompt = `
    為前往 ${tripData.destination} 的行程重新生成一個活動。
    請使用繁體中文。
    要替換的現有活動: ${currentActivity.title} (${currentActivity.startTime})。
    
    當天其他活動: ${dayActivities.map(a => `${a.startTime}: ${a.title}`).join(", ")}。
    當天住宿: ${tripData.dailyAccommodations[currentActivity.dayIndex] || tripData.accommodation}。
    
    ${promptOverride ? `用戶特別要求: ${promptOverride}` : "建議: 提供一個符合時間段和地點流向的替代方案。不要重複現有的活動。"}
    
    只返回一個活動物件 (JSON)。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: activitySchema,
    },
  });

  const rawActivity = JSON.parse(response.text || "{}");
  const imageUrl = await getBestImageForActivity(rawActivity.title || currentActivity.title, tripData.destination, rawActivity.type || 'other');

  return {
    ...currentActivity,
    ...rawActivity,
    id: uuidv4(),
    rating: 0,
    imageUrl: imageUrl,
  };
};

export const regenerateDay = async (
  tripData: TripData,
  dayIndex: number,
  currentActivities: Activity[]
): Promise<Activity[]> => {
  const ai = getAiClient();

  const lockedActivities = currentActivities.filter(a => a.rating === 5);
  
  const prompt = `
    重新生成 ${tripData.destination} 第 ${dayIndex + 1} 天的行程。
    請使用繁體中文。
    住宿: ${tripData.dailyAccommodations[dayIndex] || tripData.accommodation}。
    早餐: ${tripData.breakfastTime}。
    
    限制:
    - 必須保留這些已鎖定(5星)的活動於指定時間: ${JSON.stringify(lockedActivities.map(a => ({ time: a.startTime, title: a.title })))}。
    - 圍繞這些活動填補當天的其餘時間。
    - 確保流程順暢。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: daySchema,
    },
  });

  const rawData = JSON.parse(response.text || "{}");
  
  const newActivitiesStructure = (rawData.activities || []).map((raw: any) => ({
    id: uuidv4(),
    dayIndex: dayIndex,
    startTime: raw.startTime,
    durationMinutes: raw.durationMinutes,
    title: raw.title,
    description: raw.description,
    location: raw.location,
    type: raw.type,
    rating: 0,
    tips: raw.tips,
    transportInfo: raw.transportInfo,
    reason: raw.reason,
    // Placeholder, will fetch below
    imageUrl: '', 
  }));

  // Fetch images in parallel
  const newActivities = await Promise.all(newActivitiesStructure.map(async (act: any) => {
      const imageUrl = await getBestImageForActivity(act.title, tripData.destination, act.type);
      return { ...act, imageUrl };
  }));

  let merged = [...newActivities];
  lockedActivities.forEach(locked => {
    merged = merged.filter(a => a.startTime !== locked.startTime);
    merged.push(locked);
  });
  
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const suggestGapActivity = async (
  tripData: TripData,
  dayIndex: number,
  startTime: string,
  availableMinutes: number
): Promise<Activity> => {
    const ai = getAiClient();
    const prompt = `
        建議一個行程空檔的短暫活動。
        地點: ${tripData.destination}。
        第 ${dayIndex + 1} 天。
        開始時間: ${startTime}。
        可用時間: ${availableMinutes} 分鐘。
        住宿: ${tripData.dailyAccommodations[dayIndex] || tripData.accommodation}。
        風格: ${tripData.styles.join(', ')}。
        限制: 必須在時間/地點上可行。例如 "Coffee break", "短暫散步", "便利店", "逛小店"。
        請使用繁體中文。
    `;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: activitySchema,
        }
    });

    const raw = JSON.parse(response.text || "{}");
    const imageUrl = await getBestImageForActivity(raw.title, tripData.destination, raw.type);

    return {
        id: uuidv4(),
        dayIndex,
        startTime: raw.startTime || startTime, 
        durationMinutes: Math.min(raw.durationMinutes, availableMinutes),
        title: raw.title,
        description: raw.description,
        location: raw.location,
        type: raw.type,
        rating: 0,
        tips: raw.tips,
        transportInfo: raw.transportInfo,
        reason: raw.reason,
        imageUrl: imageUrl,
    };
}


// Utilities

function calculateDays(start: string, end: string) {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
}

function parseGeminiResponseToStructure(data: any[]): Itinerary {
  const itinerary: Itinerary = [];
  
  data.forEach((day: any) => {
    if (day.activities && Array.isArray(day.activities)) {
      day.activities.forEach((act: any) => {
        itinerary.push({
          id: uuidv4(),
          dayIndex: day.dayIndex !== undefined ? day.dayIndex - 1 : 0, 
          startTime: act.startTime,
          durationMinutes: act.durationMinutes,
          title: act.title,
          description: act.description,
          location: act.location,
          type: act.type,
          rating: 0,
          tips: act.tips,
          transportInfo: act.transportInfo,
          reason: act.reason,
          imageUrl: '', // Initial empty
        });
      });
    }
  });

  return itinerary;
}