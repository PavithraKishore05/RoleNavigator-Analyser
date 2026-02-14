import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { User, TrendingUp, Palette, Zap } from "lucide-react";
import type { ResumeAnalysis } from "@/lib/types";

interface UploadSectionProps {
  onAnalysisComplete: (analysis: ResumeAnalysis) => void;
}

const sampleResumes = [
  {
    id: 1,
    title: "Software Engineer",
    description: "5 years experience • Tech industry",
    icon: User,
  },
  {
    id: 2,
    title: "Data Scientist", 
    description: "3 years experience • Analytics",
    icon: TrendingUp,
  },
  {
    id: 3,
    title: "UX Designer",
    description: "4 years experience • Design", 
    icon: Palette,
  },
];

export function UploadSection({ onAnalysisComplete }: UploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription);
      }
      
      const response = await apiRequest("POST", "/api/analyze-resume", formData);
      return response.json();
    },
    onSuccess: (analysis: ResumeAnalysis) => {
      setUploadError("");
      setJobDescription("");
      setSelectedFile(null);
      onAnalysisComplete(analysis);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
    },
  });

  const sampleMutation = useMutation({
    mutationFn: async (sampleId: number) => {
      const response = await apiRequest("GET", `/api/sample-analysis/${sampleId}`);
      return response.json();
    },
    onSuccess: (analysis: ResumeAnalysis) => {
      onAnalysisComplete(analysis);
    },
    onError: (error: Error) => {
      setUploadError(error.message);
    },
  });

  const handleFileSelect = (file: File) => {
    setUploadError("");
    setSelectedFile(file);
  };

  const handleAnalyzeResume = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleSampleSelect = (sampleId: number) => {
    setUploadError("");
    sampleMutation.mutate(sampleId);
  };

  const isLoading = uploadMutation.isPending || sampleMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Get Your Resume Score in Seconds
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your resume and receive an instant score out of 100, plus actionable 
          feedback to help you land your dream job.
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        isUploading={isLoading}
        error={uploadError}
      />

      {/* Show selected file status */}
      {selectedFile && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Resume selected: <strong>{selectedFile.name}</strong>
          </p>
        </div>
      )}

      <div className="mt-8 mb-8 bg-white p-6 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Job Description (Optional)
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Paste a job description to get job-specific recommendations powered by AI
        </p>
        <Textarea
          placeholder="Paste the job description here... (e.g., 'We are looking for a React developer with 5+ years of experience in...')"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className="min-h-32"
        />
      </div>

      {/* Analyze Resume Button */}
      {selectedFile && (
        <div className="mb-8 flex justify-center">
          <Button
            onClick={handleAnalyzeResume}
            disabled={isLoading}
            className="bg-primary hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium rounded-lg flex items-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>{isLoading ? "Analyzing..." : "Analyze Resume"}</span>
          </Button>
        </div>
      )}

      {/* Sample Resume Cards */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
          Try with Sample Resumes
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {sampleResumes.map((sample) => {
            const IconComponent = sample.icon;
            return (
              <Card 
                key={sample.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSampleSelect(sample.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{sample.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{sample.description}</p>
                      <Button 
                        variant="link" 
                        className="text-primary p-0 h-auto font-medium mt-2 hover:underline"
                        disabled={isLoading}
                      >
                        Analyze Sample →
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
