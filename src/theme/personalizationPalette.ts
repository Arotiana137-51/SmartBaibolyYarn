export interface PrimaryColorOption {
  id: string;
  name: string;
  hex: string;
}

export const DEFAULT_PRIMARY_COLOR_ID = 'defaultTeal';

export const PRIMARY_COLOR_OPTIONS: PrimaryColorOption[] = [
  {id: DEFAULT_PRIMARY_COLOR_ID, name: 'Default', hex: '#007991'},

  // Reds
  {id: 'liturgicalRed', name: 'Liturgical Red', hex: '#C8102E'},
  {id: 'brightRed', name: 'Bright Red', hex: '#BB0A21'},
  {id: 'darkRed', name: 'Dark Red', hex: '#8B0000'},
  {id: 'blood', name: 'Blood', hex: '#6F1D1B'},
  {id: 'wine', name: 'Wine', hex: '#542344'},
  {id: 'deepWine', name: 'Deep Wine', hex: '#461220'},

  // Pinks / magentas
  {id: 'magenta', name: 'Magenta', hex: '#D90368'},
  {id: 'darkPink', name: 'Dark Pink', hex: '#C71585'},
  {id: 'rose', name: 'Rose', hex: '#B6244F'},
  {id: 'liturgicalRose', name: 'Liturgical Rose', hex: '#B76D7C'},

  // Plums / violets
  {id: 'plum', name: 'Plum', hex: '#3A015C'},
  {id: 'liturgicalViolet', name: 'Liturgical Violet', hex: '#4B0082'},
  {id: 'darkPlum', name: 'Dark Plum', hex: '#331832'},

  // Oranges / browns
  {id: 'terracotta', name: 'Terracotta', hex: '#BE5A38'},
  {id: 'brown', name: 'Brown', hex: '#5B3000'},
  {id: 'espresso', name: 'Espresso', hex: '#33261D'},

  // Gold / yellow
  {id: 'liturgicalGold', name: 'Liturgical Gold', hex: '#D4AF37'},
  {id: 'mustard', name: 'Mustard', hex: '#D5A021'},

  // Greens
  {id: 'olive', name: 'Olive', hex: '#3E442B'},
  {id: 'liturgicalGreen', name: 'Liturgical Green', hex: '#006747'},
  {id: 'emerald', name: 'Emerald', hex: '#1E352F'},
  {id: 'pine', name: 'Pine', hex: '#04471C'},
  {id: 'forest', name: 'Forest', hex: '#0D2818'},

  // Blues / indigos
  {id: 'deepNavy', name: 'Deep Navy', hex: '#04395E'},
  {id: 'deepIndigo', name: 'Deep Indigo', hex: '#052F5F'},
  {id: 'midnight', name: 'Midnight', hex: '#1A1B41'},

  // Neutrals
  {id: 'ebony', name: 'Ebony', hex: '#545E56'},
  {id: 'liturgicalBlack', name: 'Liturgical Black', hex: '#000000'},
];

export const findPrimaryColorOption = (hex: string | null | undefined): PrimaryColorOption | undefined => {
  if (!hex) return undefined;
  const normalized = hex.toLowerCase();
  return PRIMARY_COLOR_OPTIONS.find(o => o.hex.toLowerCase() === normalized);
};
