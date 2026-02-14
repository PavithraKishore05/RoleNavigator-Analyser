import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Download, 
  Share, 
  RotateCcw, 
  FileText, 
  Check, 
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  ArrowUp,
  Sparkles
} from "lucide-react";
import type { ResumeAnalysis } from "@/lib/types";

interface ResultsDashboardProps {
  analysis: ResumeAnalysis;
  onNewAnalysis: () => void;
}

export function ResultsDashboard({ analysis, onNewAnalysis }: ResultsDashboardProps) {
  const { toast } = useToast();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreGradient = (score: number) => {
    const percentage = (score / 100) * 360;
    return {
      background: `conic-gradient(from 0deg, #10B981 0deg ${percentage}deg, #E5E7EB ${percentage}deg 360deg)`
    };
  };

  const generatePDFReport = () => {
    const reportContent = `
RESUME ANALYSIS REPORT
======================

File: ${analysis.fileName}
Overall Score: ${analysis.overallScore}/100
Analysis Date: ${new Date(analysis.createdAt).toLocaleDateString()}

DETAILED SCORES
===============
Formatting: ${analysis.scores.formatting}%
Content: ${analysis.scores.content}%
Keywords: ${analysis.scores.keywords}%
Experience: ${analysis.scores.experience}%

STRENGTHS
=========
${analysis.strengths.map(s => `• ${s.title}: ${s.description}`).join('\n')}

RECOMMENDATIONS
===============
${analysis.recommendations.map(r => `• ${r.title}: ${r.description}\n  Example: ${r.example}`).join('\n\n')}

SECTION ANALYSIS
================
Contact Info: ${analysis.sectionAnalysis.contactInfo}%
Summary: ${analysis.sectionAnalysis.summary}%
Experience: ${analysis.sectionAnalysis.experience}%
Education: ${analysis.sectionAnalysis.education}%
Skills: ${analysis.sectionAnalysis.skills}%

ATS COMPATIBILITY
=================
${analysis.atsCompatibility.map(a => `${a.status === 'success' ? '✓' : '⚠'} ${a.title}: ${a.description}`).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-analysis-${analysis.fileName.replace('.pdf', '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "Your resume analysis report has been downloaded as a text file.",
    });
  };

  const downloadReport = () => {
    generatePDFReport();
  };

  const shareResults = async () => {
    const shareText = `I analyzed my resume and scored ${analysis.overallScore}/100! Key strengths: ${analysis.strengths.map(s => s.title).join(', ')}.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resume Analysis Results',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Resume analysis summary copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share Failed",
        description: "Unable to copy to clipboard. Try manually copying the results.",
        variant: "destructive"
      });
    });
  };

  const optimizeResumeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/generate-optimized-resume/${analysis.id}`);
      return response.json();
    },
    onSuccess: (data) => {
      const optimizedResume = data.optimizedResume;
      const blob = new Blob([optimizedResume], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-resume-${analysis.fileName.replace('.pdf', '')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Optimized Resume Generated",
        description: "Your 100/100 score resume has been downloaded!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const generateOptimizedResume = () => {
    optimizeResumeMutation.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Score Overview */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Score Circle */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32">
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={getScoreGradient(analysis.overallScore)}
                >
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                        {analysis.overallScore}
                      </div>
                      <div className="text-sm text-gray-600">out of 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Details */}
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {analysis.overallScore >= 80 ? "Excellent Resume!" : 
                 analysis.overallScore >= 60 ? "Good Resume Score!" : 
                 "Room for Improvement"}
              </h2>
              <p className="text-gray-600 mb-4">
                {analysis.overallScore >= 80 
                  ? "Your resume shows excellent structure and content with strong potential to impress employers."
                  : analysis.overallScore >= 60
                  ? "Your resume shows strong potential with some areas for improvement. Follow our recommendations below to boost your score."
                  : "Your resume needs significant improvements. Follow our detailed recommendations to enhance your chances."
                }
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.scores.formatting)}`}>
                    {analysis.scores.formatting}%
                  </div>
                  <div className="text-sm text-gray-600">Formatting</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.scores.content)}`}>
                    {analysis.scores.content}%
                  </div>
                  <div className="text-sm text-gray-600">Content</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.scores.keywords)}`}>
                    {analysis.scores.keywords}%
                  </div>
                  <div className="text-sm text-gray-600">Keywords</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className={`text-lg font-semibold ${getScoreColor(analysis.scores.experience)}`}>
                    {analysis.scores.experience}%
                  </div>
                  <div className="text-sm text-gray-600">Experience</div>
                </div>
              </div>
            </div>

            

            <div className="flex flex-col space-y-3 mt-4">
              <Button 
                onClick={downloadReport}
                className="bg-primary hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button 
                onClick={shareResults}
                variant="outline"
              >
                <Share className="w-4 h-4 mr-2" />
                Share Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Feedback */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Strengths */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Strengths</h3>
            </div>
            
            <div className="space-y-4">
              {analysis.strengths.map((strength, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{strength.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{strength.description}</p>
                  </div>
                </div>
              ))}
              {analysis.strengths.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Focus on the recommendations below to build your strengths.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations - Conditional based on job description */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {(analysis as any).jobDescription ? "AI-Powered Job-Specific Recommendations" : "Recommendations"}
              </h3>
            </div>
            
            {(analysis as any).jobDescription && (analysis as any).jobMatchRecommendations && (analysis as any).jobMatchRecommendations.length > 0 ? (
              // Show job-specific recommendations when job description is provided
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    These recommendations are tailored to the job description using AI analysis. Implement these to improve your match for this specific role.
                  </p>
                </div>
                {(analysis as any).jobMatchRecommendations.map((rec: any, index: number) => {
                  const priorityColors = {
                    high: "bg-red-50 border-red-200",
                    medium: "bg-yellow-50 border-yellow-200",
                    low: "bg-blue-50 border-blue-200"
                  };
                  const priorityBadgeColors = {
                    high: "bg-red-100 text-red-800",
                    medium: "bg-yellow-100 text-yellow-800",
                    low: "bg-blue-100 text-blue-800"
                  };
                  const borderColor = priorityColors[rec.priority as keyof typeof priorityColors] || "border-indigo-200 bg-indigo-50";
                  
                  return (
                    <div key={index} className={`border rounded-lg p-4 ${borderColor}`}>
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${priorityBadgeColors[rec.priority as keyof typeof priorityBadgeColors] || "bg-gray-100 text-gray-800"}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {rec.skill}
                          </h4>
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Current Status:</strong> {rec.current_status}
                          </p>
                          {rec.why_needed && (
                            <div className="text-sm text-gray-700 bg-white rounded px-3 py-2 border border-gray-200 mt-2">
                              <strong>Why needed:</strong> "{rec.why_needed}"
                            </div>
                          )}
                          <p className="text-sm text-gray-700 mt-2 font-medium">
                            <strong>Action:</strong> {rec.action}
                          </p>
                          {rec.resume_position && (
                            <p className="text-sm text-blue-700 mt-2">
                              <strong>Resume Position:</strong> {rec.resume_position}
                            </p>
                          )}
                          {rec.impact && (
                            <div className="text-sm text-green-700 bg-green-50 rounded px-3 py-2 border border-green-200 mt-2">
                              <strong>Impact:</strong> {rec.impact}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(analysis as any).skill_match_percentage && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-gray-900">
                      <strong>Skill Match:</strong> {(analysis as any).skill_match_percentage}% of job requirements covered
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Show general resume recommendations when no job description
              <div className="space-y-4">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                        <ArrowUp className="h-3 w-3 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 mb-2">{rec.description}</p>
                        {rec.example && (
                          <div className="text-sm text-gray-600 bg-white rounded px-3 py-2 border">
                            <strong>Example:</strong> {rec.example}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job-Specific Recommendations */}
      {(analysis as any).jobMatchRecommendations && (analysis as any).jobMatchRecommendations.length > 0 && (
        <Card className="mt-8 border-indigo-200 bg-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Skills to Develop for This Role</h3>
            </div>
            
            <div className="space-y-4">
              {(analysis as any).jobMatchRecommendations.map((rec: any, index: number) => (
                <div key={index} className="border border-indigo-300 rounded-lg p-4 bg-white">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-indigo-600 text-xs font-bold">★</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{rec.skill}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Sections */}
      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        {/* Content Analysis */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Analysis</h3>
            <div className="space-y-4">
              {Object.entries(analysis.sectionAnalysis).map(([section, score]) => (
                <div key={section} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {section.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`rounded-full h-2 ${
                          score >= 80 ? 'bg-green-500' : 
                          score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                      {score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ATS Compatibility */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">ATS Compatibility</h3>
            </div>

            {/* ATS Score */}
            {(analysis as any).atsScore !== undefined && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">ATS Score</p>
                    <div className={`text-3xl font-bold ${getScoreColor((analysis as any).atsScore)}`}>
                      {(analysis as any).atsScore}%
                    </div>
                  </div>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={getScoreGradient((analysis as any).atsScore)}>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{(analysis as any).atsScore}%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-blue-700 mt-3">
                  {(analysis as any).atsScore >= 80 ? "✓ Excellent ATS compatibility. Your resume is well-optimized for applicant tracking systems." : 
                   (analysis as any).atsScore >= 60 ? "Good ATS compatibility. Consider the recommendations below to improve." :
                   "ATS score could be improved. Focus on the items below to enhance compatibility."}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {analysis.atsCompatibility.map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {item.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onNewAnalysis}
          className="bg-primary hover:bg-blue-700 text-white px-8 py-3"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Analyze Another Resume
        </Button>
        <Button 
          onClick={generatePDFReport}
          variant="outline" 
          className="px-8 py-3"
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate PDF Report
        </Button>
      </div>
    </div>
  );
}
