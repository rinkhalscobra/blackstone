import { useState, useEffect } from 'react';
import { validateTranslations, getTranslationCoverage, ValidationResult } from '@/utils/validateTranslations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Language } from '@/i18n/translations';

const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
};

interface LanguageSectionProps {
  result: ValidationResult;
}

const LanguageSection = ({ result }: LanguageSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const hasIssues = result.missingKeys.length > 0 || result.extraKeys.length > 0;

  const copyMissingKeys = () => {
    const text = result.missingKeys.join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${result.missingKeys.length} missing keys copied to clipboard`,
    });
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {hasIssues ? (
            <AlertTriangle className="h-5 w-5 text-warning" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          <span className="font-medium">{languageNames[result.language]}</span>
          <Badge variant="outline" className="text-xs">
            {result.language.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {result.missingKeys.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {result.missingKeys.length} missing
            </Badge>
          )}
          {result.extraKeys.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {result.extraKeys.length} extra
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && hasIssues && (
        <div className="mt-4 space-y-4">
          {result.missingKeys.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-destructive">
                  Missing Keys ({result.missingKeys.length})
                </span>
                <Button variant="ghost" size="sm" onClick={copyMissingKeys}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <ScrollArea className="h-40 rounded border border-border bg-muted/30 p-2">
                <div className="space-y-1">
                  {result.missingKeys.map((key) => (
                    <code key={key} className="block text-xs text-destructive font-mono">
                      {key}
                    </code>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {result.extraKeys.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">
                Extra Keys ({result.extraKeys.length})
              </span>
              <ScrollArea className="h-40 rounded border border-border bg-muted/30 p-2">
                <div className="space-y-1">
                  {result.extraKeys.map((key) => (
                    <code key={key} className="block text-xs text-muted-foreground font-mono">
                      {key}
                    </code>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {expanded && !hasIssues && (
        <p className="mt-4 text-sm text-success">All translation keys are present!</p>
      )}
    </div>
  );
};

export const TranslationValidator = () => {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [coverage, setCoverage] = useState<Record<Language, { total: number; coverage: number }> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const validationResults = validateTranslations();
    const coverageData = getTranslationCoverage();
    setResults(validationResults);
    setCoverage(coverageData);
  }, [refreshKey]);

  const totalIssues = results.reduce(
    (acc, r) => acc + r.missingKeys.length + r.extraKeys.length,
    0
  );

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Translation Validator
              {totalIssues === 0 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </CardTitle>
            <CardDescription>
              Validates translation keys across all languages
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coverage Overview */}
        {coverage && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Translation Coverage</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(coverage).map(([lang, data]) => (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{languageNames[lang as Language]}</span>
                    <span className="text-muted-foreground">{data.coverage}%</span>
                  </div>
                  <Progress value={data.coverage} className="h-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Validation Results</h3>
          <div className="space-y-2">
            {results.map((result) => (
              <LanguageSection key={result.language} result={result} />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground text-center pt-2 border-t border-border">
          {totalIssues === 0 ? (
            <span className="text-success">✓ All translations are complete</span>
          ) : (
            <span className="text-warning">
              ⚠ Found {totalIssues} translation issues
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TranslationValidator;
