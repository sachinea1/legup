// Theme configuration for lead management
export const leadTheme = {
  // Lead statuses with colors
  statuses: {
    new: {
      label: "New",
      color: "bg-amber-100 text-amber-800 border-amber-200",
      darkColor: "bg-amber-900 text-amber-100 border-amber-700",
      accent: "border-amber-500",
    },
    contacted: {
      label: "Contacted", 
      color: "bg-blue-100 text-blue-800 border-blue-200",
      darkColor: "bg-blue-900 text-blue-100 border-blue-700",
      accent: "border-blue-500",
    },
    qualified: {
      label: "Qualified",
      color: "bg-purple-100 text-purple-800 border-purple-200", 
      darkColor: "bg-purple-900 text-purple-100 border-purple-700",
      accent: "border-purple-500",
    },
    appointment_set: {
      label: "Appointment Set",
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      darkColor: "bg-indigo-900 text-indigo-100 border-indigo-700", 
      accent: "border-indigo-500",
    },
    closed_won: {
      label: "Closed Won",
      color: "bg-green-100 text-green-800 border-green-200",
      darkColor: "bg-green-900 text-green-100 border-green-700",
      accent: "border-green-500",
    },
    closed_lost: {
      label: "Closed Lost",
      color: "bg-red-100 text-red-800 border-red-200",
      darkColor: "bg-red-900 text-red-100 border-red-700",
      accent: "border-red-500",
    },
  },

  // Lead priorities with colors
  priorities: {
    low: {
      label: "Low",
      color: "bg-gray-100 text-gray-700 border-gray-300",
      cardAccent: "border-l-gray-400",
      icon: "🟢",
    },
    normal: {
      label: "Normal", 
      color: "bg-blue-100 text-blue-700 border-blue-300",
      cardAccent: "border-l-blue-400",
      icon: "🔵",
    },
    high: {
      label: "High",
      color: "bg-orange-100 text-orange-700 border-orange-300", 
      cardAccent: "border-l-orange-400",
      icon: "🟠",
    },
    urgent: {
      label: "Urgent",
      color: "bg-red-100 text-red-700 border-red-300",
      cardAccent: "border-l-red-500",
      icon: "🔴",
    },
  },

  // Service types with colors
  serviceTypes: {
    regular: {
      label: "Regular Cleaning",
      color: "bg-teal-100 text-teal-800 border-teal-200",
    },
    deep: {
      label: "Deep Cleaning", 
      color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    },
    moveout: {
      label: "Move-out Cleaning",
      color: "bg-violet-100 text-violet-800 border-violet-200", 
    },
    commercial: {
      label: "Commercial Cleaning",
      color: "bg-slate-100 text-slate-800 border-slate-200",
    },
  },

  // Kanban column limits
  wipLimits: {
    new: 15,
    contacted: 10, 
    qualified: 8,
    appointment_set: 12,
    closed_won: null, // No limit
    closed_lost: null, // No limit
  },
} as const;

// Helper functions for theme usage
export const getStatusTheme = (status: string) => {
  return leadTheme.statuses[status as keyof typeof leadTheme.statuses] || leadTheme.statuses.new;
};

export const getPriorityTheme = (priority: string) => {
  return leadTheme.priorities[priority as keyof typeof leadTheme.priorities] || leadTheme.priorities.normal;
};

export const getServiceTypeTheme = (serviceType: string) => {
  return leadTheme.serviceTypes[serviceType as keyof typeof leadTheme.serviceTypes] || {
    label: serviceType,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  };
};

export const getWipLimit = (status: string) => {
  return leadTheme.wipLimits[status as keyof typeof leadTheme.wipLimits];
};

// Status order for Kanban columns
export const statusOrder = ["new", "contacted", "qualified", "appointment_set", "closed_won", "closed_lost"];

// High priority colors for the toggle button
export const getHighPriorityTheme = (isActive: boolean) => ({
  button: isActive 
    ? "bg-red-600 hover:bg-red-700 text-white border-red-600" 
    : "text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400",
  text: isActive ? "text-red-600" : "text-gray-600"
});

// Service type color themes for cards
export const serviceTypeColors = {
  regular: "border-blue-300 bg-blue-50 text-blue-700",
  deep: "border-purple-300 bg-purple-50 text-purple-700", 
  moveout: "border-orange-300 bg-orange-50 text-orange-700",
  commercial: "border-green-300 bg-green-50 text-green-700"
} as const;