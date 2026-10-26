// Resource envelope for the sample village (illustrative amounts).
// subjects = Eleventh Schedule entry numbers each scheme may fund.
export interface Scheme {
  id: string;
  en: string;
  hi: string;
  short: string;
  total: number;
  subjects: number[];
  eligible: string[]; // activity types
}

export const SCHEMES: Scheme[] = [
  { id: 'fc15', en: '15th Finance Commission grant', hi: '15वाँ वित्त आयोग', short: '15th FC', total: 1_200_000, subjects: [11, 13, 14, 23], eligible: ['road', 'drain', 'water', 'light', 'toilet'] },
  { id: 'mgnrega', en: 'MGNREGA', hi: 'मनरेगा', short: 'MGNREGA', total: 800_000, subjects: [13, 12], eligible: ['road', 'drain'] },
  { id: 'sbmg', en: 'SBM-G (Swachh Bharat)', hi: 'स्वच्छ भारत (ग्रामीण)', short: 'SBM-G', total: 300_000, subjects: [23], eligible: ['toilet', 'drain'] },
  { id: 'jjm', en: 'Jal Jeevan Mission', hi: 'जल जीवन मिशन', short: 'JJM', total: 600_000, subjects: [11], eligible: ['water'] },
];

export const SCHEDULE11: Record<number, { en: string; hi: string }> = {
  11: { en: 'Drinking water', hi: 'पेयजल' },
  12: { en: 'Fuel and fodder', hi: 'ईंधन और चारा' },
  13: { en: 'Roads, culverts, bridges', hi: 'सड़कें, पुलिया, पुल' },
  14: { en: 'Rural electrification', hi: 'ग्रामीण विद्युतीकरण' },
  23: { en: 'Health and sanitation', hi: 'स्वास्थ्य और स्वच्छता' },
};
