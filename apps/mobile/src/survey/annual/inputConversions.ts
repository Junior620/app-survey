export type InputUnitConversion = {
  unitCode: string;
  kgPerUnit?: number;
  sourceStatus: 'confirmed' | 'user_entered' | 'missing_source';
};

/** Input unit codes. Conversion factors are not in the source extract. */
const UNIT_CODES = [
  '001', '002', '003', '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '999',
];

const TABLE: Record<string, InputUnitConversion> = Object.fromEntries(
  UNIT_CODES.map((unitCode) => [unitCode, { unitCode, sourceStatus: 'missing_source' as const }])
);

export const InputUnitConversionRegistry = TABLE;

export function getInputUnitConversion(unitCode: string): InputUnitConversion | null {
  return TABLE[unitCode] ?? null;
}

/** Known kg-per-unit factor. Undefined when the source did not provide one. */
export function getInputUnitFactor(unitCode: string): number | undefined {
  return getInputUnitConversion(unitCode)?.kgPerUnit;
}
