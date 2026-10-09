export type CropConversion = {
  unitCode: string;
  kgPerUnit?: number;
  maxKg?: number;
  sourceStatus: 'confirmed' | 'user_entered' | 'missing_source';
};

/** Unit codes from the annual survey. Max weights are not in the source extract. */
const UNITS = ['001', '002', '003', '004', '005', '006', '007', '008', '999'];

const TABLE: Record<string, CropConversion> = Object.fromEntries(
  UNITS.map((unitCode) => [
    unitCode,
    { unitCode, sourceStatus: 'missing_source' as const },
  ])
);

export function getUnitConversion(unitCode: string): CropConversion | null {
  return TABLE[unitCode] ?? null;
}

export function getUnitMaxWeight(unitCode: string): number | undefined {
  return getUnitConversion(unitCode)?.maxKg;
}
