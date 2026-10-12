// magvar 2.2.0 ships no types: the one function we use (declination in degrees, east positive, WMM2025).
declare module 'magvar' {
  export function magvar(latitude: number, longitude: number, altitude?: number, when?: number | Date): number
}
