export const SOUTH_AFRICAN_UNIVERSITIES = [
  // Public Universities
  "University of Cape Town",
  "Stellenbosch University",
  "University of the Witwatersrand",
  "University of Johannesburg",
  "University of Pretoria",
  "University of KwaZulu-Natal",
  "University of the Free State",
  "North-West University",
  "University of Limpopo",
  "Tshwane University of Technology",
  "Vaal University of Technology",
  "Durban University of Technology",
  "Cape Peninsula University of Technology",
  "Central University of Technology",
  "Mangosuthu University of Technology",
  "Nelson Mandela University",
  "Sefako Makgatho Health Sciences University",
  "Walter Sisulu University",
  "Rhodes University",
  "University of Zululand",

  // The IIE's Varsity College
  "The IIE's Varsity College Sandton (Johannesburg, Gauteng)",
  "The IIE's Varsity College Waterfall Midrand (Midrand, Gauteng)",
  "The IIE's Varsity College Pretoria (Pretoria, Gauteng)",
  "The IIE's Varsity College Cape Town (Cape Town, Western Cape)",
  "The IIE's Varsity College Durban North (Durban, KwaZulu-Natal)",
  "The IIE's Varsity College Durban Westville (Durban, KwaZulu-Natal)",
  "The IIE's Varsity College Pietermaritzburg (KwaZulu-Natal)",
  "The IIE's Varsity College Nelson Mandela Bay (Gqeberha, Eastern Cape)",

  // The IIE's Rosebank College
  "The IIE's Rosebank College Braamfontein (Johannesburg, Gauteng)",
  "The IIE's Rosebank College Pretoria CBD (Pretoria, Gauteng)",
  "The IIE's Rosebank College Sunnyside (Pretoria, Gauteng)",
  "The IIE's Rosebank College Polokwane (Limpopo)",
  "The IIE's Rosebank College Mbombela (Nelspruit, Mpumalanga)",
  "The IIE's Rosebank College Durban (KwaZulu-Natal)",
  "The IIE's Rosebank College Gqeberha (Eastern Cape)",
  "The IIE's Rosebank College Cape Town (Western Cape)",

  // Eduvos
  "Eduvos Bedfordview (Gauteng)",
  "Eduvos Bloemfontein (Free State)",
  "Eduvos Durban Umhlanga (KwaZulu-Natal)",
  "Eduvos East London (Eastern Cape)",
  "Eduvos Midrand (Gauteng)",
  "Eduvos Mbombela / Nelspruit (Mpumalanga)",
  "Eduvos Nelson Mandela Bay (Gqeberha, Eastern Cape)",
  "Eduvos Potchefstroom (North West)",
  "Eduvos Pretoria (Gauteng)",
  "Eduvos Mowbray (Cape Town, Western Cape)",
  "Eduvos Tygervalley (Bellville, Western Cape)",
  "Eduvos Vaal (Vanderbijlpark, Gauteng)",

  // MANCOSA
  "MANCOSA Durban (KwaZulu-Natal)",
  "MANCOSA Johannesburg (Gauteng)",
  "MANCOSA Pretoria (Gauteng)",
  "MANCOSA Cape Town (Western Cape)",
  "MANCOSA Polokwane (Limpopo)",
  "MANCOSA Mbombela (Nelspruit, Mpumalanga)",

  // Boston City Campus & Business College
  "Boston Johannesburg (Gauteng)",
  "Boston Pretoria (Gauteng)",
  "Boston Midrand (Gauteng)",
  "Boston Durban (KwaZulu-Natal)",
  "Boston Pietermaritzburg (KwaZulu-Natal)",
  "Boston Cape Town (Western Cape)",
  "Boston Bellville (Western Cape)",
  "Boston Gqeberha (Eastern Cape)",
  "Boston East London (Eastern Cape)",
  "Boston Bloemfontein (Free State)",
  "Boston Polokwane (Limpopo)",
  "Boston Mbombela (Mpumalanga)",
  "Boston Rustenburg (North West)",
  "Boston Potchefstroom (North West)",
  "Boston Vanderbijlpark (Gauteng)",

  // STADIO Higher Education
  "STADIO Hatfield (Pretoria, Gauteng)",
  "STADIO Centurion (Gauteng)",
  "STADIO Randburg (Gauteng)",
  "STADIO Waterfall (Midrand, Gauteng)",
  "STADIO Bellville (Cape Town, Western Cape)",
  "STADIO Musgrave (Durban, KwaZulu-Natal)",
  "STADIO Krugersdorp (Gauteng)",
  "STADIO Gqeberha (Eastern Cape)",

  // Milpark Education
  "Milpark Johannesburg (Gauteng)",
  "Milpark Cape Town (Western Cape)",
  "Milpark Durban (KwaZulu-Natal)",

  // Regent Business School
  "Regent Durban (KwaZulu-Natal)",
  "Regent Johannesburg (Gauteng)",
  "Regent Pretoria (Gauteng)",
  "Regent Cape Town (Western Cape)",
  "Regent Polokwane (Limpopo)",
  "Regent Mbombela (Mpumalanga)",

  // Vega School
  "Vega Johannesburg (Bordeaux, Gauteng)",
  "Vega Pretoria (Gauteng)",
  "Vega Durban (KwaZulu-Natal)",
  "Vega Cape Town (Western Cape)",

  // Cornerstone Institute
  "Cornerstone Institute Salt River (Cape Town, Western Cape)",

  // AFDA
  "AFDA Johannesburg (Gauteng)",
  "AFDA Cape Town (Western Cape)",
  "AFDA Durban (KwaZulu-Natal)",
  "AFDA Gqeberha (Eastern Cape)",

  // Open Window
  "Open Window Centurion (Pretoria, Gauteng)",
  "Open Window Johannesburg (Gauteng)",
];

export function getAllUniversities(): string[] {
  return SOUTH_AFRICAN_UNIVERSITIES.sort();
}

// Helper function to search campuses
export function searchUniversities(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return SOUTH_AFRICAN_UNIVERSITIES.filter((uni) =>
    uni.toLowerCase().includes(lowerQuery)
  ).sort();
}