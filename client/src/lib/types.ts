export interface ResumeAnalysis {
  id: number;
  fileName: string;
  fileSize: number;
  extractedText: string;
  jobDescription?: string;
  overallScore: number;
  scores: {
    formatting: number;
    content: number;
    keywords: number;
    experience: number;
  };
  strengths: Array<{
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    example: string;
  }>;
  sectionAnalysis: {
    contactInfo: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
  };
  atsCompatibility: Array<{
    status: 'success' | 'warning' | 'error';
    title: string;
    description: string;
  }>;
  atsScore?: number;
  jobMatchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  jobMatchRecommendations?: Array<{
    skill: string;
    suggestion: string;
  }>;
  createdAt: string;
}

export interface SampleResume {
  id: number;
  title: string;
  description: string;
  icon: string;
}
