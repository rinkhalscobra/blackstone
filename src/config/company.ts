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

// Shared contact details for public pages and contact links.
export const COMPANY_CONTACT = {
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@crestrecovery.io',
  phone: '+1 647 495 9650',
  phoneHref: '+16474959650',
} as const;
