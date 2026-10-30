export type PartnerGym = {
  name: string;
  area: string;
  facilities: string[];
  equipment: string[];
  real: boolean;
};

// real: false keeps the "Sample" tag on the card.
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

export const SHOW_SAMPLE_GYMS = true;
