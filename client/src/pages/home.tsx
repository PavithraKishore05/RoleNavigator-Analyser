import { useState } from "react";
import { UploadSection } from "@/components/upload-section";
import { ResultsDashboard } from "@/components/results-dashboard";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import type { ResumeAnalysis } from "@/lib/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);

  const handleAnalysisComplete = (newAnalysis: ResumeAnalysis) => {
    setAnalysis(newAnalysis);
    // Scroll to top to show results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewAnalysis = () => {
    setAnalysis(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">RoleNavigator</h1>
                <p className="text-sm text-gray-600">AI-Powered Resume Analysis</p>
              </div>
            </div>
            <Button 
              onClick={handleNewAnalysis}
              className="bg-primary hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {analysis ? (
          <ResultsDashboard 
            analysis={analysis} 
            onNewAnalysis={handleNewAnalysis}
          />
        ) : (
          <UploadSection onAnalysisComplete={handleAnalysisComplete} />
        )}
      </main>


    </div>
  );
}
