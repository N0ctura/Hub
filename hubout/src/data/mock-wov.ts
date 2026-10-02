
export interface WovItem {
  id: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  category: string;
  image?: string;
  name?: string;
}

export const MOCK_CATEGORIES = [
  { id: 'HAIR', label: 'Capelli', icon: 'Scissors' },
  { id: 'HAT', label: 'Cappelli', icon: 'HardHat' },
  { id: 'EYES', label: 'Occhi', icon: 'Eye' },
  { id: 'MOUTH', label: 'Bocca', icon: 'Smile' },
  { id: 'CLOTHES', label: 'Vestiti', icon: 'Shirt' },
  { id: 'BACK', label: 'Schiena', icon: 'Backpack' },
  { id: 'HAND', label: 'Mano', icon: 'Hand' },
  { id: 'MASK', label: 'Maschera', icon: 'Mask' },
  { id: 'NECK', label: 'Collo', icon: 'Gem' },
  { id: 'GLASSES', label: 'Occhiali', icon: 'Glasses' },
];

export const MOCK_WOV_ITEMS: WovItem[] = [
  // HAIR
  { id: 'hair_001', rarity: 'COMMON', category: 'HAIR', name: 'Short Cut' },
  { id: 'hair_002', rarity: 'RARE', category: 'HAIR', name: 'Long Wavy' },
  { id: 'hair_003', rarity: 'EPIC', category: 'HAIR', name: 'Punk Spike' },
  { id: 'hair_004', rarity: 'LEGENDARY', category: 'HAIR', name: 'Rainbow Flow' },
  
  // HAT
  { id: 'hat_001', rarity: 'COMMON', category: 'HAT', name: 'Beanie' },
  { id: 'hat_002', rarity: 'RARE', category: 'HAT', name: 'Top Hat' },
  { id: 'hat_003', rarity: 'EPIC', category: 'HAT', name: 'Crown' },
  
  // EYES
  { id: 'eyes_001', rarity: 'COMMON', category: 'EYES', name: 'Blue Eyes' },
  { id: 'eyes_002', rarity: 'RARE', category: 'EYES', name: 'Red Eyes' },
  
  // CLOTHES
  { id: 'clothes_001', rarity: 'COMMON', category: 'CLOTHES', name: 'T-Shirt' },
  { id: 'clothes_002', rarity: 'RARE', category: 'CLOTHES', name: 'Suit' },
  { id: 'clothes_003', rarity: 'EPIC', category: 'CLOTHES', name: 'Armor' },
  
  // HAND
  { id: 'hand_001', rarity: 'COMMON', category: 'HAND', name: 'Sword' },
  { id: 'hand_002', rarity: 'RARE', category: 'HAND', name: 'Shield' },
];
