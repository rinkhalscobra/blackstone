/** Public corporate identity, checked against Corporations Canada on 2026-09-07. */
export const COMPANY = {
  brand: 'Crest Financial',
  legalName: 'Maple Crest Financial Inc.',
  corporationNumber: '1812368-3',
  businessNumber: '797436847',
  incorporatedOn: '2026-07-28',
  registryName: 'Corporations Canada',
  registryUrl: 'https://ised-isde.canada.ca/cc/lgcy/fdrlCrpDtls.html?corpId=18123683',
  address: '10446 10A Avenue NW, Edmonton, AB T6J 6G4, Canada',
  streetAddress: '10446 10A Avenue NW',
  city: 'Edmonton',
  region: 'AB',
  postalCode: 'T6J 6G4',
  countryCode: 'CA',
} as const;

// Keep the existing contact destinations until replacement details are confirmed.
export const COMPANY_CONTACT = {
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@brightfund.com',
  phone: '+44 7441 429776',
  phoneHref: '+447441429776',
} as const;
