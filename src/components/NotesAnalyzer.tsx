import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyzedNote {
  level: number;
  content: string;
  connections: string[];
  category: string;
}

interface AnalysisResult {
  structuredNotes: AnalyzedNote[];
  notionFormat: string;
  categories: string[];
}

export const NotesAnalyzer = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const analyzeNotes = async () => {
    if (!input.trim()) {
      toast.error('Wklej swoje notatki aby rozpocząć analizę');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Analiza struktury wcięć i hierarchii
      const lines = input.split('\n').filter(line => line.trim());
      const structuredNotes: AnalyzedNote[] = [];
      const categories = new Set<string>();
      
      lines.forEach((line, index) => {
        // Zlicz tabulatory/spacje na początku linii
        const leadingWhitespace = line.match(/^[\t\s]*/)?.[0] || '';
        const level = leadingWhitespace.length;
        const cleanContent = line.trim();
        
        if (!cleanContent) return;
        
        // Określ kategorię na podstawie słów kluczowych
        let category = 'Ogólne';
        if (cleanContent.toLowerCase().includes('polka') || cleanContent.toLowerCase().includes('deska')) {
          category = 'Projekty DIY';
        } else if (cleanContent.toLowerCase().includes('ksiązki') || cleanContent.toLowerCase().includes('szafka')) {
          category = 'Meble';
        } else if (cleanContent.toLowerCase().includes('laptop') || cleanContent.toLowerCase().includes('komputer')) {
          category = 'Tech';
        } else if (cleanContent.toLowerCase().includes('kupić') || cleanContent.toLowerCase().includes('sprawdz')) {
          category = 'Zadania';
        } else if (cleanContent.toLowerCase().includes('naprawić') || cleanContent.toLowerCase().includes('dokończyć')) {
          category = 'Naprawy';
        }
        
        categories.add(category);
        
        // Znajdź powiązania z poprzednimi liniami
        const connections: string[] = [];
        for (let i = Math.max(0, index - 3); i < index; i++) {
          const prevLine = lines[i]?.trim();
          if (prevLine && shareKeywords(cleanContent, prevLine)) {
            connections.push(prevLine.substring(0, 50) + '...');
          }
        }
        
        structuredNotes.push({
          level,
          content: cleanContent,
          connections,
          category
        });
      });
      
      // Generuj format dla Notion
      const notionFormat = generateNotionFormat(structuredNotes);
      
      setResult({
        structuredNotes,
        notionFormat,
        categories: Array.from(categories)
      });
      
      toast.success('Analiza zakończona! 🧠');
      
    } catch (error) {
      console.error('Błąd podczas analizy:', error);
      toast.error('Wystąpił błąd podczas analizy notatek');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareKeywords = (text1: string, text2: string): boolean => {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return words1.some(word => words2.includes(word));
  };

  const generateNotionFormat = (notes: AnalyzedNote[]): string => {
    let result = '';
    const groupedByCategory = notes.reduce((acc, note) => {
      if (!acc[note.category]) acc[note.category] = [];
      acc[note.category].push(note);
      return acc;
    }, {} as Record<string, AnalyzedNote[]>);

    Object.entries(groupedByCategory).forEach(([category, categoryNotes]) => {
      result += `# ${category}\n\n`;
      
      categoryNotes.forEach(note => {
        const indent = '  '.repeat(Math.min(note.level, 3));
        const headerLevel = Math.min(note.level + 2, 6);
        const header = '#'.repeat(headerLevel);
        
        if (note.level === 0) {
          result += `${header} ${note.content}\n\n`;
        } else {
          result += `${indent}- ${note.content}\n`;
        }
        
        if (note.connections.length > 0) {
          result += `${indent}  *Powiązane z: ${note.connections.join(', ')}*\n`;
        }
        result += '\n';
      });
      
      result += '---\n\n';
    });

    return result;
  };

  const copyToClipboard = async () => {
    if (!result?.notionFormat) return;
    
    try {
      await navigator.clipboard.writeText(result.notionFormat);
      setCopied(true);
      toast.success('Skopiowano do schowka!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Nie udało się skopiować');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-brain text-white border-0 shadow-neural">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Brain className="h-8 w-8" />
            <CardTitle className="text-3xl font-bold">ADHD Notes Organizer</CardTitle>
          </div>
          <CardDescription className="text-white/80 text-lg">
            Przekształć chaotyczne myśli w uporządkowaną strukturę dla Notion
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Twoje chaotyczne notatki
              <Badge variant="secondary">Wklej tutaj</Badge>
            </CardTitle>
            <CardDescription>
              Wklej swoje szybkie notatki z zachowaniem wcięć (tabulatorów)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What u want to do?

You see deski z altanki smietnikowej, masz kilka pomyslow:

- zrobic z tego kilka rzeczy
    - pierwszy pomysl to jedna deske poswieciic na naprawienie..."
              className="min-h-[400px] font-mono text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button 
              onClick={analyzeNotes}
              disabled={isAnalyzing || !input.trim()}
              className="w-full bg-gradient-primary hover:opacity-90 transition-smooth"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizuję strukturę myśli...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Przeanalizuj notatki
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Format dla Notion
                  <Badge variant="outline">{result.categories.length} kategorii</Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Skopiowano!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Kopiuj
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Gotowy format do wklejenia w Notion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {result.notionFormat}
                </pre>
              </div>
              
              <div className="mt-4 space-y-2">
                <h4 className="font-semibold">Wykryte kategorie:</h4>
                <div className="flex flex-wrap gap-2">
                  {result.categories.map(category => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Analiza struktury</CardTitle>
            <CardDescription>
              Jak algorytm zinterpretował twoje myśli
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.structuredNotes.map((note, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-3 bg-gradient-subtle"
                  style={{ marginLeft: `${note.level * 20}px` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Poziom {note.level}</Badge>
                    <Badge>{note.category}</Badge>
                  </div>
                  <p className="text-sm">{note.content}</p>
                  {note.connections.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>Powiązania:</strong> {note.connections.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};