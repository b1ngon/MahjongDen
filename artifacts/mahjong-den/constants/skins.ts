export interface SkinDef {
  id: string;
  name: string;
  nameJp: string;
  description: string;
  price: number;
  emoji: string;
  tileBackground: string;
  tileBorder: string;
  tileBackFace: string;
  manColor: string;
  pinColor: string;
  souColor: string;
  honorColor: string;
  borderGlow: string;
}

export const SKINS: SkinDef[] = [
  {
    id: 'classic',
    name: 'Classic Den',
    nameJp: '古典',
    description: 'Timeless ivory with crimson and green',
    price: 0,
    emoji: '🀄',
    tileBackground: '#F5EDD8',
    tileBorder: '#C8A878',
    tileBackFace: '#143020',
    manColor: '#C53030',
    pinColor: '#2B6CB0',
    souColor: '#276749',
    honorColor: '#8B6E10',
    borderGlow: '#D4A830',
  },
  {
    id: 'jade',
    name: 'Jade Palace',
    nameJp: '翡翠',
    description: 'Cool jade-green elegance',
    price: 800,
    emoji: '🟢',
    tileBackground: '#D4EDD8',
    tileBorder: '#6BAB78',
    tileBackFace: '#0A2A10',
    manColor: '#8B0000',
    pinColor: '#1A5276',
    souColor: '#145A32',
    honorColor: '#1A5C28',
    borderGlow: '#38A169',
  },
  {
    id: 'dragon',
    name: "Dragon's Wrath",
    nameJp: '龍怒',
    description: 'Fierce dark mahogany, gilded accents',
    price: 1200,
    emoji: '🐉',
    tileBackground: '#3D1A0A',
    tileBorder: '#8B3020',
    tileBackFace: '#1A0808',
    manColor: '#FFD700',
    pinColor: '#FFA500',
    souColor: '#FF6347',
    honorColor: '#FFD700',
    borderGlow: '#FF4500',
  },
  {
    id: 'golden',
    name: 'Golden Temple',
    nameJp: '黄金',
    description: 'Luxurious gold-tinted opulence',
    price: 1500,
    emoji: '✨',
    tileBackground: '#FFF4C2',
    tileBorder: '#D4A830',
    tileBackFace: '#2D1A00',
    manColor: '#8B0000',
    pinColor: '#00008B',
    souColor: '#006400',
    honorColor: '#8B6E10',
    borderGlow: '#FFD700',
  },
];
