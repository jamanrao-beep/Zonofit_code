import { create } from "zustand";

export interface DeliveryInstructions {
  type?: "door" | "security" | "call_first" | "custom";
  instructionsText?: string;
  avoidCalling?: boolean;
  weekendDelivery?: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phoneNumber: string;
  flatHouse: string;
  areaStreet: string;
  landmark: string;
  pincode: string;
  city: string;
  state: string;
  isDefault: boolean;
  deliveryInstructions?: DeliveryInstructions;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface AddressState {
  addresses: Address[];
  selectedAddressId: string | null;
  
  // Actions
  addAddress: (address: Omit<Address, "id">) => Address;
  updateAddress: (id: string, updated: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setSelectedAddressId: (id: string | null) => void;
  setDefaultAddress: (id: string) => void;
  getSelectedAddress: () => Address | null;
  getDefaultAddress: () => Address | null;
}

const INITIAL_ADDRESSES: Address[] = [
  {
    id: "addr_default",
    fullName: "Saransh Sharma",
    phoneNumber: "9672856856",
    flatHouse: "Flat 402, Sunshine Heights",
    areaStreet: "27th Main, Sector 2, HSR Layout",
    landmark: "Near Apollo Hospital",
    pincode: "560102",
    city: "Bangalore",
    state: "Karnataka",
    isDefault: true,
    deliveryInstructions: {
      type: "door",
      instructionsText: "Please leave package at the doorstep if not answering.",
      avoidCalling: false,
      weekendDelivery: true,
    },
  },
];

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: INITIAL_ADDRESSES,
  selectedAddressId: "addr_default",

  addAddress: (newAddrData) => {
    const newId = "addr_" + Date.now();
    const newAddress: Address = {
      ...newAddrData,
      id: newId,
    };

    set((state) => {
      let updatedList = [...state.addresses];
      if (newAddress.isDefault) {
        updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
      }
      return {
        addresses: [newAddress, ...updatedList],
        selectedAddressId: newId,
      };
    });

    return newAddress;
  },

  updateAddress: (id, updated) => {
    set((state) => {
      let updatedList = state.addresses.map((a) =>
        a.id === id ? { ...a, ...updated } : a
      );
      if (updated.isDefault) {
        updatedList = updatedList.map((a) =>
          a.id === id ? { ...a, isDefault: true } : { ...a, isDefault: false }
        );
      }
      return { addresses: updatedList };
    });
  },

  deleteAddress: (id) => {
    set((state) => {
      const filtered = state.addresses.filter((a) => a.id !== id);
      const nextSelected =
        state.selectedAddressId === id
          ? (filtered[0]?.id ?? null)
          : state.selectedAddressId;
      return {
        addresses: filtered,
        selectedAddressId: nextSelected,
      };
    });
  },

  setSelectedAddressId: (id) => {
    set({ selectedAddressId: id });
  },

  setDefaultAddress: (id) => {
    set((state) => ({
      addresses: state.addresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
      selectedAddressId: id,
    }));
  },

  getSelectedAddress: () => {
    const state = get();
    if (state.selectedAddressId) {
      const found = state.addresses.find((a) => a.id === state.selectedAddressId);
      if (found) return found;
    }
    return state.addresses.find((a) => a.isDefault) || state.addresses[0] || null;
  },

  getDefaultAddress: () => {
    const state = get();
    return state.addresses.find((a) => a.isDefault) || state.addresses[0] || null;
  },
}));
