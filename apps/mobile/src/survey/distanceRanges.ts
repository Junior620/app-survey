/**
 * Distance answered as a range rather than an exact number of km:
 * field respondents rarely know the exact distance, and ranges compare across surveys.
 * Codes follow the paper questionnaire style; 9888 is the shared "Ne sais pas" code.
 */
export const DISTANCE_RANGE_PAIRS: Array<[string, string]> = [
  ['0001', '0 à 1 km'],
  ['0002', '1 à 2 km'],
  ['0003', '2 à 5 km'],
  ['0004', '5 à 10 km'],
  ['0005', 'Plus de 10 km'],
  ['9888', 'Ne sais pas'],
];

export const DISTANCE_RANGE_CODES = DISTANCE_RANGE_PAIRS.map(([code]) => code);
