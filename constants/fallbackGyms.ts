export interface NetworkGym {
  id: string;
  name: string;
  address: string;
  rating: number;
  distance: number;
  cost: number;
  slots: number;
  image: string;
  tags: string[];
  type: string;
  isPremium?: boolean;
  isBeginnerFriendly?: boolean;
  isBestValue?: boolean;
  isNearPrimary?: boolean;
}

export const FALLBACK_NETWORK_GYMS: NetworkGym[] = [
  {
    id: "gym-fitzone-pro",
    name: "FitZone Pro",
    address: "Koramangala 4th Block, Bengaluru",
    rating: 4.8,
    distance: 0.8,
    cost: 8,
    slots: 18,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600",
    tags: ["Strength", "Cardio", "CrossFit", "AC"],
    type: "gym",
    isBeginnerFriendly: true,
    isBestValue: false,
    isNearPrimary: false,
  },
  {
    id: "gym-flex-studio",
    name: "Flex Studio & Wellness",
    address: "Bandra West, Mumbai",
    rating: 4.8,
    distance: 1.2,
    cost: 6,
    slots: 22,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600",
    tags: ["Yoga", "Pilates", "Trainer Available", "Cardio"],
    type: "gym",
    isBeginnerFriendly: true,
    isBestValue: true,
    isNearPrimary: false,
  },
  {
    id: "gym-iron-paradise",
    name: "Iron Paradise Elite",
    address: "Bandra Kurla Complex (BKC), Mumbai",
    rating: 4.9,
    distance: 2.5,
    cost: 12,
    slots: 14,
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=600",
    tags: ["Olympic Lifting", "Recovery Zone", "Steam Room", "Sauna"],
    type: "gym",
    isPremium: true,
    isBeginnerFriendly: false,
    isBestValue: false,
    isNearPrimary: false,
  },
  {
    id: "gym-pulse-fitness",
    name: "Pulse Fitness Club",
    address: "Indiranagar 100ft Road, Bengaluru",
    rating: 4.7,
    distance: 1.5,
    cost: 6,
    slots: 25,
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=600",
    tags: ["Strength", "Cardio", "Lockers", "Shower"],
    type: "gym",
    isBeginnerFriendly: true,
    isBestValue: true,
    isNearPrimary: false,
  },
  {
    id: "gym-crossfit-versova",
    name: "CrossFit Arena",
    address: "Juhu Tara Road, Mumbai",
    rating: 4.6,
    distance: 3.1,
    cost: 10,
    slots: 12,
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600",
    tags: ["CrossFit", "HIIT", "Strength", "Outdoor Turf"],
    type: "turf",
    isBeginnerFriendly: false,
    isBestValue: false,
    isNearPrimary: false,
  },
  {
    id: "gym-powerhouse-elite",
    name: "PowerHouse Elite",
    address: "Near Primary Venue, 1.2 KM Away",
    rating: 4.9,
    distance: 2.1,
    cost: 10,
    slots: 16,
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80&w=600",
    tags: ["Performance Training", "Free Weights", "Cardio"],
    type: "gym",
    isPremium: true,
    isNearPrimary: true,
  },
  {
    id: "gym-zenith-turf",
    name: "Zenith Sports & Box Cricket",
    address: "HSR Layout Sector 2, Bengaluru",
    rating: 4.9,
    distance: 4.2,
    cost: 14,
    slots: 8,
    image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=600",
    tags: ["Turf", "Box Cricket", "Football", "Floodlights"],
    type: "turf",
    isPremium: true,
    isNearPrimary: false,
  }
];
