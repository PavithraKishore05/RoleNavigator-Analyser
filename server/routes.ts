import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import pdf from "pdf-parse";
import natural from "natural";
import { insertResumeAnalysisSchema } from "@shared/schema";
import Groq from "groq-sdk";

// Global variable for Groq client - will be initialized in registerRoutes
let groqClient: InstanceType<typeof Groq> | null = null;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Resume analysis utilities
class ResumeAnalyzer {
  private techKeywords = [
    "javascript", "python", "java", "react", "node.js", "sql", "mongodb", "aws", 
    "docker", "kubernetes", "git", "agile", "scrum", "machine learning", "data analysis",
    "typescript", "vue", "angular", "express", "postgresql", "redis", "elasticsearch"
  ];

  private skillKeywords = [
    "leadership", "communication", "problem solving", "teamwork", "project management",
    "analytical", "creative", "strategic", "detail-oriented", "adaptable"
  ];

  analyzeResume(text: string, fileName: string, fileSize: number, jobDescription?: string) {
    const extractedText = text.toLowerCase();
    
    // Score different sections
    const scores = {
      formatting: this.analyzeFormatting(text),
      content: this.analyzeContent(extractedText),
      keywords: this.analyzeKeywords(extractedText),
      experience: this.analyzeExperience(extractedText),
    };

    const overallScore = Math.round(
      (scores.formatting + scores.content + scores.keywords + scores.experience) / 4
    );

    const result: any = {
      fileName,
      fileSize,
      extractedText: text,
      overallScore,
      scores,
      strengths: this.generateStrengths(scores, extractedText),
      recommendations: this.generateRecommendations(scores, extractedText),
      sectionAnalysis: this.analyzeSections(extractedText),
    };

    // Analyze ATS Compatibility and get ATS score
    const atsAnalysis = this.analyzeATSCompatibility(extractedText);
    result.atsCompatibility = atsAnalysis.compatibility;
    result.atsScore = atsAnalysis.score;

    // If job description is provided, initialize empty job-matching fields
    // (These will be filled by Groq analysis)
    if (jobDescription && jobDescription.trim()) {
      result.jobDescription = jobDescription;
      result.missingSkills = [];
      result.matchedSkills = [];
      result.jobMatchRecommendations = [];
    }

    return result;
  }

  private analyzeFormatting(text: string): number {
    let score = 60; // Base score
    
    // Check for consistent formatting patterns
    const lines = text.split('\n');
    const hasHeaders = lines.some(line => 
      /^(experience|education|skills|summary|objective)/i.test(line.trim())
    );
    if (hasHeaders) score += 20;

    // Check for consistent spacing
    const emptyLineCount = lines.filter(line => line.trim() === '').length;
    if (emptyLineCount > 5) score += 10;

    // Check length (not too short, not too long)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 200 && wordCount <= 800) score += 10;

    return Math.min(score, 100);
  }

  private analyzeContent(text: string): number {
    let score = 50; // Base score
    
    // Check for key sections
    const sections = ['experience', 'education', 'skills'];
    const foundSections = sections.filter(section => 
      text.includes(section) || text.includes(section.replace('e', 'ion'))
    );
    score += foundSections.length * 10;

    // Check for contact information
    const hasEmail = /@/.test(text);
    const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text);
    if (hasEmail) score += 10;
    if (hasPhone) score += 10;

    // Check for action verbs
    const actionVerbs = ['managed', 'developed', 'led', 'created', 'implemented', 'improved'];
    const foundVerbs = actionVerbs.filter(verb => text.includes(verb));
    score += Math.min(foundVerbs.length * 5, 20);

    return Math.min(score, 100);
  }

  private analyzeKeywords(text: string): number {
    let score = 40; // Base score
    
    // Check for technical keywords
    const foundTechKeywords = this.techKeywords.filter(keyword => text.includes(keyword));
    score += Math.min(foundTechKeywords.length * 8, 40);

    // Check for skill keywords
    const foundSkillKeywords = this.skillKeywords.filter(keyword => text.includes(keyword));
    score += Math.min(foundSkillKeywords.length * 4, 20);

    return Math.min(score, 100);
  }

  private analyzeExperience(text: string): number {
    let score = 50; // Base score

    // Check for years of experience mentions
    const yearPattern = /\d{4}/g;
    const years = text.match(yearPattern);
    if (years && years.length >= 2) score += 20;

    // Check for company names (capitalized words)
    const companyPattern = /[A-Z][a-z]+ [A-Z][a-z]+/g;
    const companies = text.match(companyPattern);
    if (companies && companies.length >= 1) score += 15;

    // Check for job titles
    const titleKeywords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'specialist'];
    const foundTitles = titleKeywords.filter(title => text.includes(title));
    score += Math.min(foundTitles.length * 10, 15);

    return Math.min(score, 100);
  }

  private generateStrengths(scores: any, text: string) {
    const strengths = [];

    if (scores.formatting >= 80) {
      strengths.push({
        title: "Professional Formatting",
        description: "Your resume has consistent formatting, proper spacing, and clear section headers that make it easy to scan."
      });
    }

    if (scores.experience >= 75) {
      strengths.push({
        title: "Strong Experience Section",
        description: "You've included relevant work experience with clear job titles and company names."
      });
    }

    if (text.includes('@') && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text)) {
      strengths.push({
        title: "Complete Contact Information",
        description: "All essential contact details are present and professionally formatted."
      });
    }

    if (scores.keywords >= 70) {
      strengths.push({
        title: "Relevant Keywords",
        description: "Good use of industry-relevant terms and technical skills."
      });
    }

    return strengths;
  }

  private generateRecommendations(scores: any, text: string) {
    const recommendations = [];

    if (scores.content < 80) {
      recommendations.push({
        title: "Add Quantified Achievements",
        description: "Include specific numbers and metrics in your experience descriptions to demonstrate impact.",
        example: "\"Increased sales by 25%\" instead of \"Responsible for sales\""
      });
    }

    if (scores.keywords < 75) {
      const missingKeywords = this.techKeywords.filter(keyword => !text.includes(keyword)).slice(0, 4);
      recommendations.push({
        title: "Include More Relevant Keywords",
        description: "Add industry-specific terms and skills that match the job descriptions you're targeting.",
        example: `Missing keywords: ${missingKeywords.join(', ')}`
      });
    }

    if (!text.includes('skills') || scores.keywords < 70) {
      recommendations.push({
        title: "Expand Skills Section",
        description: "Add more technical and soft skills relevant to your target roles.",
        example: "Organize skills by category (Technical, Languages, Tools)"
      });
    }

    if (scores.experience < 75) {
      recommendations.push({
        title: "Strengthen Experience Descriptions",
        description: "Use more action verbs and specific accomplishments in your work experience.",
        example: "Start bullet points with strong action verbs like 'Led', 'Developed', 'Managed'"
      });
    }

    return recommendations;
  }

  private analyzeSections(text: string) {
    const sections = {
      contactInfo: text.includes('@') && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text) ? 100 : 60,
      summary: text.includes('summary') || text.includes('objective') ? 75 : 50,
      experience: text.includes('experience') ? 80 : 40,
      education: text.includes('education') ? 100 : 70,
      skills: text.includes('skills') ? 60 : 30,
    };

    return sections;
  }

  private analyzeATSCompatibility(text: string) {
    const compatibility = [];
    let atsScore = 0;
    const checks = [];

    // Check for standard fonts (assume good since it's PDF)
    compatibility.push({
      status: "success",
      title: "Standard fonts detected",
      description: "Using readable fonts that work well with ATS systems"
    });
    checks.push(true); // success

    // Check for section headers
    const hasHeaders = /^(experience|education|skills|summary)/im.test(text);
    compatibility.push({
      status: hasHeaders ? "success" : "warning",
      title: "Clear section headings",
      description: hasHeaders ? "Section headers are properly formatted and recognizable" : "Consider adding clear section headers"
    });
    checks.push(hasHeaders);

    // Keyword density
    const techKeywordCount = this.techKeywords.filter(k => text.includes(k)).length;
    const goodKeywordDensity = techKeywordCount >= 5;
    compatibility.push({
      status: goodKeywordDensity ? "success" : "warning", 
      title: goodKeywordDensity ? "Good keyword density" : "Consider adding more keywords",
      description: goodKeywordDensity ? "Good use of relevant keywords for ATS matching" : "Include more job-relevant terms for better matching"
    });
    checks.push(goodKeywordDensity);

    // Check for complex formatting
    compatibility.push({
      status: "success",
      title: "No complex formatting",
      description: "Simple layout that ATS systems can parse easily"
    });
    checks.push(true); // success

    // Check for email and phone
    const hasContactInfo = /@/.test(text) && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text);
    compatibility.push({
      status: hasContactInfo ? "success" : "warning",
      title: hasContactInfo ? "Contact information present" : "Add contact information",
      description: hasContactInfo ? "Email and phone number are clearly present" : "Include email and phone number for ATS parsing"
    });
    checks.push(hasContactInfo);

    // Calculate ATS score based on checks
    atsScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    return {
      compatibility,
      score: atsScore
    };
  }

  private analyzeJobMatch(resumeText: string, jobDescription: string) {
    const jobDescLower = jobDescription.toLowerCase();
    const resumeTextLower = resumeText.toLowerCase();

    // Extract keywords from job description
    const jobKeywords = this.extractKeywordsFromJob(jobDescription);
    
    // Find matched skills in resume
    const matchedSkills = jobKeywords.filter(keyword => 
      resumeTextLower.includes(keyword)
    );

    // Find missing skills
    const missingSkills = jobKeywords.filter(keyword => 
      !resumeTextLower.includes(keyword)
    );

    // Calculate match score
    const matchScore = jobKeywords.length > 0 
      ? Math.round((matchedSkills.length / jobKeywords.length) * 100)
      : 0;

    // Generate recommendations based on missing skills
    const recommendations = missingSkills.slice(0, 5).map(skill => ({
      skill,
      suggestion: `Add experience or mention of ${skill} to better match this job requirement`
    }));

    return {
      matchScore,
      matchedSkills: matchedSkills.slice(0, 10),
      missingSkills: missingSkills.slice(0, 10),
      recommendations
    };
  }

  private extractKeywordsFromJob(jobDescription: string): string[] {
    // Extended keyword lists
    const allKeywords = [
      // Programming languages
      "javascript", "typescript", "python", "java", "c#", "c++", "php", "ruby", "go", "rust",
      "kotlin", "swift", "objective-c", "scala", "r", "sql", "html", "css", "xml", "json",
      
      // Frontend frameworks
      "react", "vue", "angular", "svelte", "next.js", "nuxt", "ember", "backbone",
      
      // Backend frameworks
      "node.js", "express", "django", "flask", "spring", "asp.net", "laravel", "rails",
      "gradle", "maven", "fastapi",
      
      // Databases
      "mongodb", "postgresql", "mysql", "oracle", "sql server", "elasticsearch", "redis",
      "dynamodb", "cassandra", "mariadb", "firebase",
      
      // DevOps & Cloud
      "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "gitlab", "github",
      "circleci", "travis", "heroku", "vagrant", "terraform", "ansible",
      
      // Tools & Platforms
      "git", "svn", "jira", "confluence", "slack", "trello", "asana", "figma", "sketch",
      "adobe", "photoshop", "illustrator", "xd", "visual studio", "intellij", "vscode",
      
      // Methodologies & Practices
      "agile", "scrum", "kanban", "waterfall", "ci/cd", "testing", "tdd", "bdd",
      "rest api", "graphql", "microservices", "monolithic", "serverless",
      
      // Soft skills
      "leadership", "communication", "teamwork", "problem solving", "analytical",
      "creative", "strategic", "detail-oriented", "adaptable", "organized",
      "project management", "mentoring", "collaboration", "negotiation"
    ];

    const jobDescLower = jobDescription.toLowerCase();
    
    // Find keywords that appear in the job description
    return allKeywords.filter(keyword => jobDescLower.includes(keyword));
  }

  async generateAIRecommendations(resumeText: string, jobDescription?: string): Promise<any> {
    // If no Groq key or no job description, return empty (fall back to rule-based)
    if (!groqClient || !jobDescription) {
      return null;
    }

    try {
      const prompt = `You are an expert technical recruiter and resume strategist. Your job is to analyze a resume against a job posting and provide specific, actionable recommendations to help the candidate qualify for the role.

CRITICAL INSTRUCTIONS:
- You MUST analyze the actual text provided (resume + job description)
- Extract skills from what you READ, not assumptions
- Focus on job-specific recommendations ONLY (skills, experience, qualifications)
- DO NOT recommend formatting or spacing changes
- Be specific and practical

JOB DESCRIPTION:
---
${jobDescription}
---

CANDIDATE RESUME:
---
${resumeText}
---

YOUR ANALYSIS TASK:

1. IDENTIFY JOB REQUIREMENTS
   List all required skills, experience, qualifications, and certifications from the job description

2. ANALYZE CANDIDATE'S FIT
   - Which required skills does the candidate already have?
   - Which required skills are missing?
   - What experience gaps exist?
   - What certifications or qualifications are missing?

3. CREATE SKILL LISTS
   - matched_skills: Skills currently in resume that match job requirements
   - missing_skills: Skills from job description NOT in resume

4. PROVIDE ACTIONABLE RECOMMENDATIONS (5-7 recommendations)
   For EACH critical missing skill or qualification:
   - What skill/qualification is needed
   - Why it's required (quote from job description)
   - Specific action: How to acquire it (e.g., "Take AWS certification", "Build a React project", "Learn Docker")
   - How to position it in resume (add to projects, experience, certifications, skills section)
   - Impact: How this improves candidacy for the role

RESPOND WITH ONLY VALID JSON (no markdown, explanations, or code blocks):

{
  "matched_skills": [
    "Skill that appears in both job AND resume"
  ],
  "missing_skills": [
    "Critical skill from job description that's NOT in resume"
  ],
  "recommendations": [
    {
      "priority": "high",
      "skill": "Exact skill/qualification name",
      "current_status": "What the resume currently shows (or 'Not mentioned')",
      "why_needed": "Exact quote from job description showing why",
      "action": "Specific action to acquire/demonstrate this skill",
      "resume_position": "Where to add this in resume (e.g., Skills section, Projects, Experience, Certifications)",
      "impact": "How this makes the candidate more qualified for this role"
    }
  ]
}

REQUIREMENTS FOR OUTPUT:
- matched_skills: Only skills that clearly exist in BOTH the job description AND the resume
- missing_skills: Only critical skills from job that are clearly NOT in resume
- recommendations: Specific, not generic. Each must address a real gap for THIS job
- All fields must be filled with actionable content
- Focus on skills, experience, qualifications (NOT formatting)
- Make each recommendation practical and achievable
- Return valid JSON that can be parsed`;

      console.log("📤 Calling Groq API with improved prompt...");
      const message = await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 2500,
        temperature: 0.3, // Lower temperature for more consistent, professional results
      });

      const content = message.choices[0]?.message?.content;
      console.log("📥 Groq response received, length:", content?.length);
      
      if (content) {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          console.log("✓ JSON extracted, parsing...");
          const analysis = JSON.parse(jsonText);
          console.log("✓ JSON parsed successfully!");
          console.log("  📊 Matched Skills:", analysis.matched_skills?.length || 0);
          console.log("  ⚠️  Missing Skills:", analysis.missing_skills?.length || 0);
          console.log("  💡 Recommendations:", analysis.recommendations?.length || 0);
          return analysis;
        } else {
          console.error("❌ Could not find JSON in Groq response. Content:", content.substring(0, 300));
        }
      } else {
        console.error("❌ No content in Groq response");
      }
    } catch (error) {
      console.error("❌ Error generating Groq recommendations:", error);
    }

    return null;
  }

  generateOptimizedResume(analysis: any) {
    const originalText = analysis.extractedText.toLowerCase();
    
    // Extract basic information
    const emailMatch = analysis.extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = analysis.extractedText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const nameMatch = analysis.extractedText.split('\n')[0];
    
    // Extract sections
    const sections = this.extractSections(analysis.extractedText);
    
    // Generate optimized content
    const optimizedContent = {
      name: nameMatch || "Your Name",
      email: emailMatch ? emailMatch[0] : "your.email@example.com",
      phone: phoneMatch ? phoneMatch[0] : "(555) 123-4567",
      summary: this.generateOptimizedSummary(sections, originalText),
      experience: this.optimizeExperienceSection(sections.experience || ""),
      education: this.optimizeEducationSection(sections.education || ""),
      skills: this.generateOptimizedSkills(originalText),
      additionalSections: this.generateAdditionalSections(originalText)
    };

    return this.formatOptimizedResume(optimizedContent);
  }

  private extractSections(text: string) {
    const sections: any = {};
    const lines = text.split('\n');
    let currentSection = '';
    let sectionContent = '';

    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      
      if (trimmedLine.includes('experience') || trimmedLine.includes('work history')) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = 'experience';
        sectionContent = '';
      } else if (trimmedLine.includes('education')) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = 'education';
        sectionContent = '';
      } else if (trimmedLine.includes('skills')) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = 'skills';
        sectionContent = '';
      } else if (trimmedLine.includes('summary') || trimmedLine.includes('objective')) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = 'summary';
        sectionContent = '';
      } else if (currentSection) {
        sectionContent += line + '\n';
      }
    }

    if (currentSection && sectionContent) {
      sections[currentSection] = sectionContent.trim();
    }

    return sections;
  }

  private generateOptimizedSummary(sections: any, originalText: string) {
    const hasExperience = originalText.includes('years') || originalText.includes('experience');
    const techKeywords = this.techKeywords.filter(k => originalText.includes(k)).slice(0, 4);
    
    return `Results-driven professional with proven expertise in ${techKeywords.join(', ') || 'technology solutions'}. Demonstrated track record of delivering high-impact projects and driving operational excellence. Strong analytical and problem-solving abilities with excellent communication skills and a collaborative approach to achieving organizational goals.`;
  }

  private optimizeExperienceSection(experienceText: string) {
    if (!experienceText.trim()) {
      return `SENIOR SOFTWARE ENGINEER | Tech Solutions Inc. | 2021 - Present
• Developed and deployed 15+ scalable web applications, increasing user engagement by 40%
• Led cross-functional team of 8 developers, delivering projects 25% ahead of schedule
• Implemented automated testing frameworks, reducing bug reports by 60%
• Collaborated with product managers to define technical requirements for new features

SOFTWARE DEVELOPER | Innovation Labs | 2019 - 2021
• Built responsive web applications using React and Node.js, serving 10K+ daily users
• Optimized database queries and API performance, improving response times by 50%
• Participated in code reviews and mentored 3 junior developers
• Contributed to agile development processes and sprint planning sessions`;
    }

    // Enhance existing experience with better action verbs and metrics
    const enhancedExperience = experienceText
      .replace(/responsible for/gi, 'Led')
      .replace(/worked on/gi, 'Developed')
      .replace(/helped/gi, 'Collaborated to')
      .replace(/did/gi, 'Executed')
      .replace(/made/gi, 'Created');

    return enhancedExperience;
  }

  private optimizeEducationSection(educationText: string) {
    if (!educationText.trim()) {
      return `BACHELOR OF SCIENCE IN COMPUTER SCIENCE
University of Technology | 2015 - 2019
• Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems
• Academic Projects: Built web applications, mobile apps, and data analysis tools
• GPA: 3.7/4.0`;
    }

    return educationText;
  }

  private generateOptimizedSkills(originalText: string) {
    const foundTechSkills = this.techKeywords.filter(k => originalText.includes(k));
    const foundSoftSkills = this.skillKeywords.filter(k => originalText.includes(k));
    
    const additionalTechSkills = ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'AWS', 'Docker'];
    const additionalSoftSkills = ['Leadership', 'Communication', 'Problem Solving', 'Project Management'];
    
    const allTechSkills = Array.from(new Set([...foundTechSkills, ...additionalTechSkills])).slice(0, 12);
    const allSoftSkills = Array.from(new Set([...foundSoftSkills, ...additionalSoftSkills])).slice(0, 8);

    return `TECHNICAL SKILLS
${allTechSkills.join(' • ')}

CORE COMPETENCIES  
${allSoftSkills.join(' • ')}`;
  }

  private generateAdditionalSections(originalText: string) {
    return `ACHIEVEMENTS
• Increased team productivity by 30% through implementation of agile methodologies
• Recognized as "Employee of the Quarter" for outstanding project delivery
• Successfully delivered 20+ projects with 98% client satisfaction rate

CERTIFICATIONS
• AWS Certified Solutions Architect (if applicable to role)
• Certified Scrum Master (if applicable)
• Professional Development Certificate in Advanced Technologies`;
  }

  private formatOptimizedResume(content: any) {
    return `${content.name.toUpperCase()}
${content.email} | ${content.phone}

PROFESSIONAL SUMMARY
${content.summary}

PROFESSIONAL EXPERIENCE
${content.experience}

EDUCATION
${content.education}

${content.skills}

${content.additionalSections}

---
This optimized resume incorporates:
• Action-oriented language with quantified achievements
• Industry-relevant keywords for ATS optimization
• Professional formatting with clear section headers
• Balanced technical and soft skills presentation
• Strategic content placement for maximum impact
`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Groq client NOW when environment variables are available
  const groqApiKey = process.env.GROQ_API_KEY;
  console.log("🔑 Groq API Key Status:", groqApiKey ? "✅ LOADED" : "❌ NOT FOUND");
  if (!groqApiKey) {
    console.log("⚠️  GROQ_API_KEY not found in environment variables");
    console.log("📍 Make sure .env.local has: GROQ_API_KEY=your_key");
  } else {
    console.log("✅ Initializing Groq client...");
  }
  groqClient = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;
  
  const analyzer = new ResumeAnalyzer();

  // Configure multer to capture both file and text fields
  const uploadMultiple = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === "resume" && file.mimetype === "application/pdf") {
        cb(null, true);
      } else if (file.fieldname === "resume") {
        cb(new Error("Only PDF files are allowed"));
      } else {
        cb(null, true); // Allow other fields
      }
    },
  }).any(); // Use .any() to capture both files and text fields

  // Upload and analyze resume endpoint
  app.post("/api/analyze-resume", uploadMultiple, async (req, res) => {
    try {
      // Extract file and text fields from req.files when using .any()
      const resumeFile = (req.files as Express.Multer.File[])?.find(f => f.fieldname === "resume");
      
      if (!resumeFile) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Extract job description from req.body (plain text field, not file)
      const jobDescription = (req.body as any)?.jobDescription as string | undefined;

      // Debug logging
      console.log("=== DEBUG: Upload Request ===");
      console.log("Files received:", (req.files as Express.Multer.File[])?.map(f => ({ fieldname: f.fieldname, size: f.size })));
      console.log("Job description:", !!jobDescription ? `${jobDescription.length} chars` : "none");
      console.log("📋 Job description content:", jobDescription?.substring(0, 100) + "...");

      let extractedText = "";
      
      try {
        // Extract text from PDF
        const pdfData = await pdf(resumeFile.buffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return res.status(400).json({ 
          error: "Unable to parse PDF file. Please ensure it's a valid PDF with readable text content." 
        });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ 
          error: "No readable text found in PDF. Please ensure the PDF contains text content and is not image-based." 
        });
      }

      // Analyze the resume
      console.log("Analyzing with job description:", !!jobDescription);
      const analysisData = analyzer.analyzeResume(
        extractedText,
        resumeFile.originalname,
        resumeFile.size,
        jobDescription
      );

      // If job description provided and Groq is available, get AI recommendations
      if (jobDescription && jobDescription.trim() && groqClient) {
        console.log("🔄 Generating job-specific analysis with Groq...");
        console.log("Job description length:", jobDescription.length);
        try {
          const aiAnalysis = await analyzer.generateAIRecommendations(extractedText, jobDescription);
          console.log("📊 Groq analysis result:", aiAnalysis ? "✓ Received" : "❌ Null/undefined");
          
          if (aiAnalysis && aiAnalysis.recommendations !== undefined) {
            // Merge Groq analysis into results
            analysisData.missingSkills = aiAnalysis.missing_skills || [];
            analysisData.matchedSkills = aiAnalysis.matched_skills || [];
            analysisData.jobMatchRecommendations = aiAnalysis.recommendations || [];
            console.log("✅ Groq analysis merged!");
            console.log("   - Matched Skills:", aiAnalysis.matched_skills?.length || 0, "→", aiAnalysis.matched_skills || []);
            console.log("   - Missing Skills:", aiAnalysis.missing_skills?.length || 0, "→", aiAnalysis.missing_skills || []);
            console.log("   - Recommendations:", aiAnalysis.recommendations?.length || 0);
          } else {
            console.log("⚠️  Groq returned no analysis (null or no recommendations)");
            if (aiAnalysis) {
              console.log("   Groq response keys:", Object.keys(aiAnalysis));
            }
          }
        } catch (groqError) {
          console.error("❌ Groq error:", groqError instanceof Error ? groqError.message : groqError);
        }
      } else if (jobDescription && jobDescription.trim()) {
        console.log("⚠️  Groq API key not configured");
      }

      // Validate and store the analysis
      const validatedData = insertResumeAnalysisSchema.parse(analysisData);
      const analysis = await storage.createResumeAnalysis(validatedData);

      res.json(analysis);
    } catch (error) {
      console.error("Resume analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to analyze resume" 
      });
    }
  });

  // Get sample resume analysis
  app.get("/api/sample-analysis/:sampleId", async (req, res) => {
    try {
      const sampleId = parseInt(req.params.sampleId);
      
      // Generate sample analysis based on resume type
      let sampleText = "";
      let fileName = "";
      
      switch (sampleId) {
        case 1:
          fileName = "software_engineer_resume.pdf";
          sampleText = `John Doe
Software Engineer
john.doe@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-2024
- Developed scalable web applications using React and Node.js
- Led a team of 5 developers on multiple projects
- Implemented CI/CD pipelines reducing deployment time by 40%

Software Developer | StartupXYZ | 2018-2020
- Built RESTful APIs using Python and Django
- Collaborated with cross-functional teams on product development

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014-2018

SKILLS
JavaScript, Python, React, Node.js, SQL, MongoDB, AWS, Docker`;
          break;
        case 2:
          fileName = "data_scientist_resume.pdf";
          sampleText = `Jane Smith
Data Scientist
jane.smith@email.com | (555) 987-6543

EXPERIENCE
Senior Data Scientist | Analytics Inc | 2021-2024
- Developed machine learning models improving prediction accuracy by 25%
- Analyzed large datasets using Python and SQL
- Created data visualizations and dashboards using Tableau

Data Analyst | Research Corp | 2019-2021
- Performed statistical analysis on customer behavior data
- Built automated reporting systems

EDUCATION
Master of Science in Data Science
Data University | 2017-2019

SKILLS
Python, R, SQL, Machine Learning, Tableau, Pandas, Scikit-learn, Statistics`;
          break;
        case 3:
          fileName = "ux_designer_resume.pdf";
          sampleText = `Alex Johnson
UX Designer
alex.johnson@email.com | (555) 456-7890

EXPERIENCE
Senior UX Designer | Design Studio | 2020-2024
- Led user research and design for mobile applications
- Created wireframes, prototypes, and user journey maps
- Collaborated with product managers and developers

UX Designer | Creative Agency | 2018-2020
- Designed user interfaces for web and mobile platforms
- Conducted user testing and usability studies

EDUCATION
Bachelor of Fine Arts in Graphic Design
Art Institute | 2014-2018

SKILLS
Figma, Sketch, Adobe Creative Suite, Prototyping, User Research, Wireframing`;
          break;
        default:
          return res.status(404).json({ error: "Sample not found" });
      }

      const analysisData = analyzer.analyzeResume(sampleText, fileName, 250000);
      const validatedData = insertResumeAnalysisSchema.parse(analysisData);
      const analysis = await storage.createResumeAnalysis(validatedData);

      res.json(analysis);
    } catch (error) {
      console.error("Sample analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate sample analysis" 
      });
    }
  });

  // Get analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getResumeAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get analysis" 
      });
    }
  });

  // Generate optimized resume
  app.post("/api/generate-optimized-resume/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getResumeAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      const optimizedResume = analyzer.generateOptimizedResume(analysis);
      res.json({ optimizedResume });
    } catch (error) {
      console.error("Generate optimized resume error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate optimized resume" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
