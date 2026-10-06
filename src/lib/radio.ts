// Dati di riferimento della pagina Radio.

/** Alfabeto fonetico NATO (ICAO): lettera, parola, pronuncia all'italiana con l'accento in maiuscolo. */
export const ALFABETO: [lettera: string, parola: string, pronuncia: string][] = [
  ['A', 'Alfa', 'AL-fa'],
  ['B', 'Bravo', 'BRA-vo'],
  ['C', 'Charlie', 'CIAR-li'],
  ['D', 'Delta', 'DEL-ta'],
  ['E', 'Echo', 'E-co'],
  ['F', 'Foxtrot', 'FOX-trot'],
  ['G', 'Golf', 'golf'],
  ['H', 'Hotel', 'o-TEL'],
  ['I', 'India', 'IN-dia'],
  ['J', 'Juliett', 'GIU-liet'],
  ['K', 'Kilo', 'KI-lo'],
  ['L', 'Lima', 'LI-ma'],
  ['M', 'Mike', 'maik'],
  ['N', 'November', 'no-VEM-ber'],
  ['O', 'Oscar', 'OS-car'],
  ['P', 'Papa', 'pa-PA'],
  ['Q', 'Quebec', 'che-BEK'],
  ['R', 'Romeo', 'RO-meo'],
  ['S', 'Sierra', 'si-ER-ra'],
  ['T', 'Tango', 'TAN-go'],
  ['U', 'Uniform', 'IU-ni-form'],
  ['V', 'Victor', 'VIC-tor'],
  ['W', 'Whiskey', 'UIS-chi'],
  ['X', 'X-ray', 'EX-rei'],
  ['Y', 'Yankee', 'IEN-chi'],
  ['Z', 'Zulu', 'ZU-lu'],
];

export const CIFRE = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];

/** Canali PMR446 analogici: 16 canali a passi di 12,5 kHz a partire da 446,00625 MHz. */
export const CANALI_PMR446 = Array.from({ length: 16 }, (_, i) => ({
  canale: i + 1,
  mhz: (446.00625 + i * 0.0125).toFixed(5).replace('.', ','),
}));
