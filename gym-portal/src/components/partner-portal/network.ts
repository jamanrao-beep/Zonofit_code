export type PartnerGym = {
  name: string;
  area: string;
  facilities: string[];
  equipment: string[];
  real: boolean;
};

export type PartnerCity = {
  id: string;
  name: string;
  nameHi: string;
  lat: number;
  lon: number;
  live: boolean;
};

// Add a city or a gym here. real: false keeps the "Sample" tag on the card.
export const PARTNER_GYMS: PartnerGym[] = [
  {
    name: "DOLPHINE HEALTH CLUB",
    area: "Laxmi Plaza, Thoker Chouraha",
    facilities: ["Shower", "Changing", "Parking"],
    equipment: ["Strength", "Cardio"],
    real: true,
  },
  {
    name: "Sample Gym One",
    area: "Hiran Magri",
    facilities: ["Parking", "Locker"],
    equipment: ["Strength", "Functional"],
    real: false,
  },
  {
    name: "Sample Gym Two",
    area: "Sector 11",
    facilities: ["Shower", "AC"],
    equipment: ["Cardio", "Crossfit"],
    real: false,
  },
  {
    name: "Sample Gym Three",
    area: "Fatehpura",
    facilities: ["Changing", "Parking"],
    equipment: ["Strength", "Free weights"],
    real: false,
  },
  {
    name: "Sample Gym Four",
    area: "Bhupalpura",
    facilities: ["Shower", "Locker"],
    equipment: ["Cardio", "Yoga"],
    real: false,
  },
];

export const PARTNER_CITIES: PartnerCity[] = [
  { id: "udr", name: "Udaipur", nameHi: "उदयपुर", lat: 24.58, lon: 73.68, live: true },
  { id: "jpr", name: "Jaipur", nameHi: "जयपुर", lat: 26.91, lon: 75.79, live: false },
  { id: "amd", name: "Ahmedabad", nameHi: "अहमदाबाद", lat: 23.02, lon: 72.57, live: false },
  { id: "kota", name: "Kota", nameHi: "कोटा", lat: 25.21, lon: 75.86, live: false },
  { id: "bhl", name: "Bhilwara", nameHi: "भीलवाड़ा", lat: 25.35, lon: 74.64, live: false },
  { id: "skr", name: "Sikar", nameHi: "सीकर", lat: 27.61, lon: 75.14, live: false },
  { id: "jdh", name: "Jodhpur", nameHi: "जोधपुर", lat: 26.24, lon: 73.02, live: false },
  { id: "ajm", name: "Ajmer", nameHi: "अजमेर", lat: 26.45, lon: 74.64, live: false },
  { id: "bkn", name: "Bikaner", nameHi: "बीकानेर", lat: 28.02, lon: 73.31, live: false },
  { id: "alw", name: "Alwar", nameHi: "अलवर", lat: 27.55, lon: 76.6, live: false },
  { id: "chi", name: "Chittorgarh", nameHi: "चित्तौड़गढ़", lat: 24.88, lon: 74.63, live: false },
];

export const SHOW_SAMPLE_GYMS = true;
