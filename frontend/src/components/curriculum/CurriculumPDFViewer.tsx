import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';
import { api } from '@/server/api';

interface CurriculumPDFViewerProps {
  lessonId: string;
  title: string;
}

export default function CurriculumPDFViewer({ lessonId, title }: CurriculumPDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonInfo, setLessonInfo] = useState<{
    id: string;
    title: string;
    fileType: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    const fetchLessonContent = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const content = await api.getLessonContent(lessonId);
        setLessonInfo(content);
      } catch (err: any) {
        console.error('Error fetching lesson content:', err);
        setError(err.message || 'Failed to load lesson content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLessonContent();
  }, [lessonId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading lesson content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-4">
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p className="mb-2">Error loading content:</p>
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pdfUrl = api.downloadLessonFile(lessonId);

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4 border-0 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            {title || lessonInfo?.title || 'Lesson Content'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* PDF Viewer Container with fallback */}
      <div className="flex-1 bg-white rounded-lg overflow-hidden border mb-4">
        <object
          data={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          type="application/pdf"
          className="w-full h-full"
        >
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full"
            style={{ border: 'none' }}
          >
            <p>
              Your browser doesn't support embedded PDFs.
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                Click here to view the PDF
              </a>
            </p>
          </iframe>
        </object>
      </div>
      
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => window.open(pdfUrl, '_blank')}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
} 