
// This file defines the colors for tags using inline styles (HEX codes).
// This guarantees colors will show up even if Tailwind CSS generation fails.


export const TAG_STYLES: Record<string, { backgroundColor: string, color: string, borderColor: string }> = {
  'Reunião': { backgroundColor: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe' },      // Indigo-100/800
  'Treinamento': { backgroundColor: '#ffe4e6', color: '#9f1239', borderColor: '#fecdd3' },  // Rose-100/800
  'Deslocamento': { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }, // Amber-100/800
  'Operacional': { backgroundColor: '#dbeafe', color: '#1e40af', borderColor: '#bfdbfe' },  // Blue-100/800 (Changed from Slate)
  'Orientação': { backgroundColor: '#fae8ff', color: '#86198f', borderColor: '#f0abfc' },   // Fuchsia-100/800 (New)
  'Estratégico': { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' },  // Emerald-100/800
  'Projeto': { backgroundColor: '#cffafe', color: '#155e75', borderColor: '#a5f3fc' },      // Cyan-100/800
};

// Default fallback (Warm Gray)
export const DEFAULT_TAG_STYLE = { backgroundColor: '#f5f5f4', color: '#1c1917', borderColor: '#e7e5e4' };

export const getTagStyle = (tagName: string, tagColor?: string) => {
  if (tagColor && tagColor.startsWith('#')) {
    return {
      backgroundColor: tagColor + '33', // 20% opacity
      color: tagColor,
      borderColor: tagColor + '80' // 50% opacity
    };
  }

  if (!tagName) return DEFAULT_TAG_STYLE;
  
  // Normalize and trim for robust matching
  const normalizedInput = tagName.trim().toLowerCase().normalize("NFC");
  
  const key = Object.keys(TAG_STYLES).find(k => 
    k.toLowerCase().normalize("NFC") === normalizedInput
  );
  return key ? TAG_STYLES[key] : DEFAULT_TAG_STYLE;
};

// Helper for chart colors (stronger shade)
export const getTagChartColorHex = (tagName: string): string => {
    // Map to specific 500 hex codes
    const CHART_COLORS: Record<string, string> = {
        'Reunião': '#6366f1',      // Indigo-500
        'Treinamento': '#f43f5e',  // Rose-500
        'Deslocamento': '#f59e0b', // Amber-500
        'Operacional': '#3b82f6',  // Blue-500 (Changed from Slate)
        'Orientação': '#d946ef',   // Fuchsia-500 (New)
        'Estratégico': '#10b981',  // Emerald-500
        'Projeto': '#06b6d4',      // Cyan-500
    };
    

    const normalizedInput = tagName.trim().toLowerCase().normalize("NFC");
    const key = Object.keys(CHART_COLORS).find(k => k.toLowerCase().normalize("NFC") === normalizedInput);
    
    // Debug info
    if (!key) {
        console.warn(`Tag '${tagName}' (normalized: '${normalizedInput}') not found in CHART_COLORS`, Object.keys(CHART_COLORS));
    }

    return key ? CHART_COLORS[key] : '#6b7280'; // Gray-500
};
