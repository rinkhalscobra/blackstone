import { translations, Language } from '@/i18n/translations';

export interface ValidationResult {
  language: Language;
  missingKeys: string[];
  extraKeys: string[];
}

/**
 * Recursively extracts all keys from a nested object
 */
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Validates translation keys across all languages
 * Uses English as the reference language
 */
export function validateTranslations(): ValidationResult[] {
  const languages = Object.keys(translations) as Language[];
  const referenceLanguage: Language = 'en';
  const referenceKeys = new Set(extractKeys(translations[referenceLanguage] as Record<string, unknown>));
  
  const results: ValidationResult[] = [];
  
  for (const lang of languages) {
    if (lang === referenceLanguage) continue;
    
    const langKeys = new Set(extractKeys(translations[lang] as Record<string, unknown>));
    
    // Find missing keys (in reference but not in this language)
    const missingKeys: string[] = [];
    for (const key of referenceKeys) {
      if (!langKeys.has(key)) {
        missingKeys.push(key);
      }
    }
    
    // Find extra keys (in this language but not in reference)
    const extraKeys: string[] = [];
    for (const key of langKeys) {
      if (!referenceKeys.has(key)) {
        extraKeys.push(key);
      }
    }
    
    results.push({
      language: lang,
      missingKeys: missingKeys.sort(),
      extraKeys: extraKeys.sort(),
    });
  }
  
  return results;
}

/**
 * Prints validation results to console in a readable format
 */
export function printValidationResults(results: ValidationResult[]): void {
  console.log('\n🔍 Translation Validation Results\n');
  console.log('='.repeat(50));
  
  let hasIssues = false;
  
  for (const result of results) {
    const langName = {
      fr: 'French',
      de: 'German', 
      it: 'Italian',
    }[result.language] || result.language;
    
    if (result.missingKeys.length === 0 && result.extraKeys.length === 0) {
      console.log(`\n✅ ${langName} (${result.language}): All keys present!`);
    } else {
      hasIssues = true;
      console.log(`\n⚠️  ${langName} (${result.language}):`);
      
      if (result.missingKeys.length > 0) {
        console.log(`   Missing ${result.missingKeys.length} keys:`);
        result.missingKeys.forEach(key => console.log(`     - ${key}`));
      }
      
      if (result.extraKeys.length > 0) {
        console.log(`   Extra ${result.extraKeys.length} keys (not in English):`);
        result.extraKeys.forEach(key => console.log(`     + ${key}`));
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (hasIssues) {
    console.log('❌ Validation found issues. Please fix missing translations.\n');
  } else {
    console.log('✅ All translations are complete!\n');
  }
}

/**
 * Returns a summary of translation coverage
 */
export function getTranslationCoverage(): Record<Language, { total: number; coverage: number }> {
  const languages = Object.keys(translations) as Language[];
  const referenceLanguage: Language = 'en';
  const referenceKeys = extractKeys(translations[referenceLanguage] as Record<string, unknown>);
  const totalKeys = referenceKeys.length;
  
  const coverage: Record<Language, { total: number; coverage: number }> = {} as Record<Language, { total: number; coverage: number }>;
  
  for (const lang of languages) {
    const langKeys = new Set(extractKeys(translations[lang] as Record<string, unknown>));
    let matchingKeys = 0;
    
    for (const key of referenceKeys) {
      if (langKeys.has(key)) {
        matchingKeys++;
      }
    }
    
    coverage[lang] = {
      total: totalKeys,
      coverage: Math.round((matchingKeys / totalKeys) * 100),
    };
  }
  
  return coverage;
}

// Run validation when this file is imported in development
if (import.meta.env.DEV) {
  const results = validateTranslations();
  const hasIssues = results.some(r => r.missingKeys.length > 0 || r.extraKeys.length > 0);
  
  if (hasIssues) {
    printValidationResults(results);
  }
}
