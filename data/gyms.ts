/**
 * Mock Gym Data
 * Used by Explore (carousels + search) and Gym Detail page.
 */

export interface GymAmenity {
  icon: string; // Ionicons name
  label: string;
}

export interface Gym {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  distance: number; // in km
  cost: number; // credits per visit
  slots: number;
  address: string;
  tags: string[];
  description: string;
  amenities: GymAmenity[];
  hours: string;
  isVerified: boolean;
  isPremium?: boolean;
  isBeginnerFriendly?: boolean;
  isBestValue?: boolean;
  isNearPrimary?: boolean;
}

export const mockGyms: Gym[] = [
  {
    id: "1",
    name: "PowerHouse Fitness",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviewCount: 312,
    distance: 0.8,
    cost: 8,
    slots: 12,
    address: "2nd Block, Koramangala, Bengaluru",
    tags: ["Strength", "Cardio", "Steam"],
    description:
      "PowerHouse Fitness is a modern, fully-equipped gym designed for serious training. With state-of-the-art equipment, expert trainers, and a high-energy atmosphere, it's the go-to spot for Koramangala's fitness community.",
    amenities: [
      { icon: "barbell-outline", label: "Free Weights" },
      { icon: "bicycle-outline", label: "Cardio Zone" },
      { icon: "water-outline", label: "Steam Room" },
      { icon: "fitness-outline", label: "Personal Training" },
      { icon: "wifi-outline", label: "Free Wi-Fi" },
      { icon: "car-outline", label: "Parking" },
    ],
    hours: "Mon–Sat: 5:30 AM – 11:00 PM · Sun: 7:00 AM – 8:00 PM",
    isVerified: true,
    isBestValue: true,
  },
  {
    id: "2",
    name: "Iron Paradise Gym",
    image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviewCount: 487,
    distance: 1.2,
    cost: 10,
    slots: 5,
    address: "100 Feet Road, Indiranagar, Bengaluru",
    tags: ["Strength", "CrossFit", "Personal Training"],
    description:
      "Iron Paradise is Indiranagar's premier strength and performance gym. Featuring competition-grade barbells, power racks, and certified CrossFit coaches — built for those who take training seriously.",
    amenities: [
      { icon: "barbell-outline", label: "Competition Barbells" },
      { icon: "body-outline", label: "CrossFit Rig" },
      { icon: "people-outline", label: "Group Classes" },
      { icon: "fitness-outline", label: "Expert Coaching" },
      { icon: "nutrition-outline", label: "Protein Bar" },
      { icon: "car-outline", label: "Valet Parking" },
    ],
    hours: "Mon–Fri: 5:00 AM – 11:00 PM · Sat–Sun: 6:00 AM – 9:00 PM",
    isVerified: true,
    isPremium: true,
  },
  {
    id: "3",
    name: "Fit & Flow Studio",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    reviewCount: 218,
    distance: 2.1,
    cost: 6,
    slots: 15,
    address: "5th Phase, JP Nagar, Bengaluru",
    tags: ["Yoga", "Cardio", "Zumba"],
    description:
      "Fit & Flow Studio is the perfect starting point for anyone beginning their fitness journey. Friendly instructors, beginner programs, and a welcoming atmosphere make it one of Bengaluru's top-rated beginner gyms.",
    amenities: [
      { icon: "leaf-outline", label: "Yoga Studio" },
      { icon: "musical-notes-outline", label: "Zumba Classes" },
      { icon: "bicycle-outline", label: "Cardio Zone" },
      { icon: "people-outline", label: "Beginner Programs" },
      { icon: "body-outline", label: "Pilates" },
      { icon: "cafe-outline", label: "Juice Bar" },
    ],
    hours: "Mon–Sat: 6:00 AM – 9:00 PM · Sun: 8:00 AM – 6:00 PM",
    isVerified: true,
    isBeginnerFriendly: true,
    isBestValue: true,
  },
  {
    id: "4",
    name: "CrossFit HSR",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    reviewCount: 143,
    distance: 3.5,
    cost: 12,
    slots: 8,
    address: "19th Main Road, HSR Layout, Bengaluru",
    tags: ["CrossFit", "Strength", "Olympic Lifting"],
    description:
      "CrossFit HSR is a high-performance functional fitness box catering to athletes who want to push their limits. Olympic lifting platforms, rope climbs, and daily WODs make every session a challenge worth showing up for.",
    amenities: [
      { icon: "barbell-outline", label: "Olympic Platforms" },
      { icon: "body-outline", label: "CrossFit WODs" },
      { icon: "stopwatch-outline", label: "Timed Workouts" },
      { icon: "people-outline", label: "Group Classes" },
      { icon: "fitness-outline", label: "Certified CF Coaches" },
      { icon: "car-outline", label: "Parking" },
    ],
    hours: "Mon–Fri: 5:30 AM – 9:00 PM · Sat: 7:00 AM – 7:00 PM · Sun: Closed",
    isVerified: true,
  },
  {
    id: "5",
    name: "PowerHouse Elite",
    image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviewCount: 561,
    distance: 2.5,
    cost: 15,
    slots: 3,
    address: "Indiranagar Metro Station Area, Bengaluru",
    tags: ["Luxury", "Recovery Zone", "Strength"],
    description:
      "PowerHouse Elite is Bengaluru's most premium fitness experience. Private training suites, a full recovery zone with ice baths and infrared saunas, and world-class equipment set it apart from every other gym in the city.",
    amenities: [
      { icon: "barbell-outline", label: "Premium Equipment" },
      { icon: "snow-outline", label: "Ice Bath / Cryo" },
      { icon: "flame-outline", label: "Infrared Sauna" },
      { icon: "fitness-outline", label: "Private Training" },
      { icon: "restaurant-outline", label: "Nutrition Lounge" },
      { icon: "car-outline", label: "Valet Parking" },
    ],
    hours: "Mon–Fri: 5:00 AM – 11:00 PM · Sat–Sun: 6:00 AM – 10:00 PM",
    isVerified: true,
    isPremium: true,
    isNearPrimary: true,
  },
  {
    id: "6",
    name: "Gold Standard Gym",
    image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=600",
    rating: 4.5,
    reviewCount: 97,
    distance: 4.1,
    cost: 8,
    slots: 20,
    address: "Outer Ring Road, Marathahalli, Bengaluru",
    tags: ["Strength", "Cardio", "Sauna"],
    description:
      "Gold Standard Gym is a classic, no-frills fitness centre that delivers everything you need for a solid workout. Open early, closes late, with plenty of equipment and a friendly team — value that's hard to beat.",
    amenities: [
      { icon: "barbell-outline", label: "Free Weights" },
      { icon: "bicycle-outline", label: "Cardio Machines" },
      { icon: "water-outline", label: "Sauna" },
      { icon: "people-outline", label: "Group Classes" },
      { icon: "wifi-outline", label: "Free Wi-Fi" },
      { icon: "car-outline", label: "Parking" },
    ],
    hours: "Mon–Sun: 5:00 AM – 11:00 PM",
    isVerified: true,
    isBeginnerFriendly: true,
  },
];
