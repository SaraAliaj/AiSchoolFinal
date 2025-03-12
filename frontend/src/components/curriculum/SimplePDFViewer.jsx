import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { api } from '@/server/api';

const SimplePDFViewer = ({ lessonId, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get the lesson info to ensure it exists
        await api.getLessonContent(lessonId);
        
        // Set the PDF URL
        setPdfUrl(api.downloadLessonFile(lessonId));
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF. Please try again later.');
        setIsLoading(false);
      }
    };

    if (lessonId) {
      loadPDF();
    }
  }, [lessonId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            {title || 'Lesson PDF'}
          </CardTitle>
        </CardHeader>
      </Card>

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
};

export default SimplePDFViewer; 