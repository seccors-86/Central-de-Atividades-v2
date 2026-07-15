export const getDynamicStyle = (color?: string) => {
  if (!color) return {};

  // Legacy Tailwind class support (e.g. "bg-blue-100 text-blue-700")
  if (color.startsWith('bg-')) {
    return { className: color };
  }

  // Hex code support (e.g. "#374A67")
  if (color.startsWith('#')) {
    return {
      style: {
        backgroundColor: `${color}15`,
        color: color,
        borderColor: `${color}30`,
        borderWidth: '1px'
      }
    };
  }

  // Fallback
  return { className: color };
};
