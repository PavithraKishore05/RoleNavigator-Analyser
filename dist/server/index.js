// server/index.ts
import dotenv from "dotenv";
import path3 from "path";
import { fileURLToPath } from "url";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  analyses;
  currentId;
  constructor() {
    this.analyses = /* @__PURE__ */ new Map();
    this.currentId = 1;
  }
  async createResumeAnalysis(insertAnalysis) {
    const id = this.currentId++;
    const analysis = {
      ...insertAnalysis,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.analyses.set(id, analysis);
    return analysis;
  }
  async getResumeAnalysis(id) {
    return this.analyses.get(id);
  }
  async getAllResumeAnalyses() {
    return Array.from(this.analyses.values());
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
import pdf from "pdf-parse";

// shared/schema.ts
import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var resumeAnalyses = pgTable("resume_analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text").notNull(),
  jobDescription: text("job_description"),
  // optional job description for targeted analysis
  overallScore: integer("overall_score").notNull(),
  scores: jsonb("scores").notNull(),
  // {formatting: 85, content: 72, keywords: 68, experience: 82}
  strengths: jsonb("strengths").notNull(),
  // array of {title, description}
  recommendations: jsonb("recommendations").notNull(),
  // array of {title, description, example}
  sectionAnalysis: jsonb("section_analysis").notNull(),
  // detailed section breakdowns
  atsCompatibility: jsonb("ats_compatibility").notNull(),
  // ATS analysis results
  jobMatchScore: integer("job_match_score"),
  // score based on job description match
  matchedSkills: jsonb("matched_skills"),
  // skills found in both job and resume
  missingSkills: jsonb("missing_skills"),
  // skills required for job but missing in resume
  jobMatchRecommendations: jsonb("job_match_recommendations"),
  // recommendations for missing skills
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses).omit({
  id: true,
  createdAt: true
}).extend({
  jobDescription: z.string().optional(),
  jobMatchScore: z.number().optional(),
  missingSkills: z.any().optional(),
  matchedSkills: z.array(z.string()).optional(),
  jobMatchRecommendations: z.array(z.any()).optional()
});

// server/routes.ts
import Groq from "groq-sdk";
var groqClient = null;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
var ResumeAnalyzer = class {
  techKeywords = [
    "javascript",
    "python",
    "java",
    "react",
    "node.js",
    "sql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "git",
    "agile",
    "scrum",
    "machine learning",
    "data analysis",
    "typescript",
    "vue",
    "angular",
    "express",
    "postgresql",
    "redis",
    "elasticsearch"
  ];
  skillKeywords = [
    "leadership",
    "communication",
    "problem solving",
    "teamwork",
    "project management",
    "analytical",
    "creative",
    "strategic",
    "detail-oriented",
    "adaptable"
  ];
  analyzeResume(text2, fileName, fileSize, jobDescription) {
    const extractedText = text2.toLowerCase();
    const scores = {
      formatting: this.analyzeFormatting(text2),
      content: this.analyzeContent(extractedText),
      keywords: this.analyzeKeywords(extractedText),
      experience: this.analyzeExperience(extractedText)
    };
    const overallScore = Math.round(
      (scores.formatting + scores.content + scores.keywords + scores.experience) / 4
    );
    const result = {
      fileName,
      fileSize,
      extractedText: text2,
      overallScore,
      scores,
      strengths: this.generateStrengths(scores, extractedText),
      recommendations: this.generateRecommendations(scores, extractedText),
      sectionAnalysis: this.analyzeSections(extractedText)
    };
    const atsAnalysis = this.analyzeATSCompatibility(extractedText);
    result.atsCompatibility = atsAnalysis.compatibility;
    result.atsScore = atsAnalysis.score;
    if (jobDescription && jobDescription.trim()) {
      result.jobDescription = jobDescription;
      result.missingSkills = [];
      result.matchedSkills = [];
      result.jobMatchRecommendations = [];
    }
    return result;
  }
  analyzeFormatting(text2) {
    let score = 60;
    const lines = text2.split("\n");
    const hasHeaders = lines.some(
      (line) => /^(experience|education|skills|summary|objective)/i.test(line.trim())
    );
    if (hasHeaders) score += 20;
    const emptyLineCount = lines.filter((line) => line.trim() === "").length;
    if (emptyLineCount > 5) score += 10;
    const wordCount = text2.split(/\s+/).length;
    if (wordCount >= 200 && wordCount <= 800) score += 10;
    return Math.min(score, 100);
  }
  analyzeContent(text2) {
    let score = 50;
    const sections = ["experience", "education", "skills"];
    const foundSections = sections.filter(
      (section) => text2.includes(section) || text2.includes(section.replace("e", "ion"))
    );
    score += foundSections.length * 10;
    const hasEmail = /@/.test(text2);
    const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text2);
    if (hasEmail) score += 10;
    if (hasPhone) score += 10;
    const actionVerbs = ["managed", "developed", "led", "created", "implemented", "improved"];
    const foundVerbs = actionVerbs.filter((verb) => text2.includes(verb));
    score += Math.min(foundVerbs.length * 5, 20);
    return Math.min(score, 100);
  }
  analyzeKeywords(text2) {
    let score = 40;
    const foundTechKeywords = this.techKeywords.filter((keyword) => text2.includes(keyword));
    score += Math.min(foundTechKeywords.length * 8, 40);
    const foundSkillKeywords = this.skillKeywords.filter((keyword) => text2.includes(keyword));
    score += Math.min(foundSkillKeywords.length * 4, 20);
    return Math.min(score, 100);
  }
  analyzeExperience(text2) {
    let score = 50;
    const yearPattern = /\d{4}/g;
    const years = text2.match(yearPattern);
    if (years && years.length >= 2) score += 20;
    const companyPattern = /[A-Z][a-z]+ [A-Z][a-z]+/g;
    const companies = text2.match(companyPattern);
    if (companies && companies.length >= 1) score += 15;
    const titleKeywords = ["engineer", "developer", "manager", "analyst", "designer", "specialist"];
    const foundTitles = titleKeywords.filter((title) => text2.includes(title));
    score += Math.min(foundTitles.length * 10, 15);
    return Math.min(score, 100);
  }
  generateStrengths(scores, text2) {
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
    if (text2.includes("@") && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text2)) {
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
  generateRecommendations(scores, text2) {
    const recommendations = [];
    if (scores.content < 80) {
      recommendations.push({
        title: "Add Quantified Achievements",
        description: "Include specific numbers and metrics in your experience descriptions to demonstrate impact.",
        example: '"Increased sales by 25%" instead of "Responsible for sales"'
      });
    }
    if (scores.keywords < 75) {
      const missingKeywords = this.techKeywords.filter((keyword) => !text2.includes(keyword)).slice(0, 4);
      recommendations.push({
        title: "Include More Relevant Keywords",
        description: "Add industry-specific terms and skills that match the job descriptions you're targeting.",
        example: `Missing keywords: ${missingKeywords.join(", ")}`
      });
    }
    if (!text2.includes("skills") || scores.keywords < 70) {
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
  analyzeSections(text2) {
    const sections = {
      contactInfo: text2.includes("@") && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text2) ? 100 : 60,
      summary: text2.includes("summary") || text2.includes("objective") ? 75 : 50,
      experience: text2.includes("experience") ? 80 : 40,
      education: text2.includes("education") ? 100 : 70,
      skills: text2.includes("skills") ? 60 : 30
    };
    return sections;
  }
  analyzeATSCompatibility(text2) {
    const compatibility = [];
    let atsScore = 0;
    const checks = [];
    compatibility.push({
      status: "success",
      title: "Standard fonts detected",
      description: "Using readable fonts that work well with ATS systems"
    });
    checks.push(true);
    const hasHeaders = /^(experience|education|skills|summary)/im.test(text2);
    compatibility.push({
      status: hasHeaders ? "success" : "warning",
      title: "Clear section headings",
      description: hasHeaders ? "Section headers are properly formatted and recognizable" : "Consider adding clear section headers"
    });
    checks.push(hasHeaders);
    const techKeywordCount = this.techKeywords.filter((k) => text2.includes(k)).length;
    const goodKeywordDensity = techKeywordCount >= 5;
    compatibility.push({
      status: goodKeywordDensity ? "success" : "warning",
      title: goodKeywordDensity ? "Good keyword density" : "Consider adding more keywords",
      description: goodKeywordDensity ? "Good use of relevant keywords for ATS matching" : "Include more job-relevant terms for better matching"
    });
    checks.push(goodKeywordDensity);
    compatibility.push({
      status: "success",
      title: "No complex formatting",
      description: "Simple layout that ATS systems can parse easily"
    });
    checks.push(true);
    const hasContactInfo = /@/.test(text2) && /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text2);
    compatibility.push({
      status: hasContactInfo ? "success" : "warning",
      title: hasContactInfo ? "Contact information present" : "Add contact information",
      description: hasContactInfo ? "Email and phone number are clearly present" : "Include email and phone number for ATS parsing"
    });
    checks.push(hasContactInfo);
    atsScore = Math.round(checks.filter(Boolean).length / checks.length * 100);
    return {
      compatibility,
      score: atsScore
    };
  }
  analyzeJobMatch(resumeText, jobDescription) {
    const jobDescLower = jobDescription.toLowerCase();
    const resumeTextLower = resumeText.toLowerCase();
    const jobKeywords = this.extractKeywordsFromJob(jobDescription);
    const matchedSkills = jobKeywords.filter(
      (keyword) => resumeTextLower.includes(keyword)
    );
    const missingSkills = jobKeywords.filter(
      (keyword) => !resumeTextLower.includes(keyword)
    );
    const matchScore = jobKeywords.length > 0 ? Math.round(matchedSkills.length / jobKeywords.length * 100) : 0;
    const recommendations = missingSkills.slice(0, 5).map((skill) => ({
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
  extractKeywordsFromJob(jobDescription) {
    const allKeywords = [
      // Programming languages
      "javascript",
      "typescript",
      "python",
      "java",
      "c#",
      "c++",
      "php",
      "ruby",
      "go",
      "rust",
      "kotlin",
      "swift",
      "objective-c",
      "scala",
      "r",
      "sql",
      "html",
      "css",
      "xml",
      "json",
      // Frontend frameworks
      "react",
      "vue",
      "angular",
      "svelte",
      "next.js",
      "nuxt",
      "ember",
      "backbone",
      // Backend frameworks
      "node.js",
      "express",
      "django",
      "flask",
      "spring",
      "asp.net",
      "laravel",
      "rails",
      "gradle",
      "maven",
      "fastapi",
      // Databases
      "mongodb",
      "postgresql",
      "mysql",
      "oracle",
      "sql server",
      "elasticsearch",
      "redis",
      "dynamodb",
      "cassandra",
      "mariadb",
      "firebase",
      // DevOps & Cloud
      "aws",
      "azure",
      "gcp",
      "docker",
      "kubernetes",
      "jenkins",
      "gitlab",
      "github",
      "circleci",
      "travis",
      "heroku",
      "vagrant",
      "terraform",
      "ansible",
      // Tools & Platforms
      "git",
      "svn",
      "jira",
      "confluence",
      "slack",
      "trello",
      "asana",
      "figma",
      "sketch",
      "adobe",
      "photoshop",
      "illustrator",
      "xd",
      "visual studio",
      "intellij",
      "vscode",
      // Methodologies & Practices
      "agile",
      "scrum",
      "kanban",
      "waterfall",
      "ci/cd",
      "testing",
      "tdd",
      "bdd",
      "rest api",
      "graphql",
      "microservices",
      "monolithic",
      "serverless",
      // Soft skills
      "leadership",
      "communication",
      "teamwork",
      "problem solving",
      "analytical",
      "creative",
      "strategic",
      "detail-oriented",
      "adaptable",
      "organized",
      "project management",
      "mentoring",
      "collaboration",
      "negotiation"
    ];
    const jobDescLower = jobDescription.toLowerCase();
    return allKeywords.filter((keyword) => jobDescLower.includes(keyword));
  }
  async generateAIRecommendations(resumeText, jobDescription) {
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
      console.log("\u{1F4E4} Calling Groq API with improved prompt...");
      const message = await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 2500,
        temperature: 0.3
        // Lower temperature for more consistent, professional results
      });
      const content = message.choices[0]?.message?.content;
      console.log("\u{1F4E5} Groq response received, length:", content?.length);
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          console.log("\u2713 JSON extracted, parsing...");
          const analysis = JSON.parse(jsonText);
          console.log("\u2713 JSON parsed successfully!");
          console.log("  \u{1F4CA} Matched Skills:", analysis.matched_skills?.length || 0);
          console.log("  \u26A0\uFE0F  Missing Skills:", analysis.missing_skills?.length || 0);
          console.log("  \u{1F4A1} Recommendations:", analysis.recommendations?.length || 0);
          return analysis;
        } else {
          console.error("\u274C Could not find JSON in Groq response. Content:", content.substring(0, 300));
        }
      } else {
        console.error("\u274C No content in Groq response");
      }
    } catch (error) {
      console.error("\u274C Error generating Groq recommendations:", error);
    }
    return null;
  }
  generateOptimizedResume(analysis) {
    const originalText = analysis.extractedText.toLowerCase();
    const emailMatch = analysis.extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = analysis.extractedText.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const nameMatch = analysis.extractedText.split("\n")[0];
    const sections = this.extractSections(analysis.extractedText);
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
  extractSections(text2) {
    const sections = {};
    const lines = text2.split("\n");
    let currentSection = "";
    let sectionContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim().toLowerCase();
      if (trimmedLine.includes("experience") || trimmedLine.includes("work history")) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = "experience";
        sectionContent = "";
      } else if (trimmedLine.includes("education")) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = "education";
        sectionContent = "";
      } else if (trimmedLine.includes("skills")) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = "skills";
        sectionContent = "";
      } else if (trimmedLine.includes("summary") || trimmedLine.includes("objective")) {
        if (currentSection && sectionContent) {
          sections[currentSection] = sectionContent.trim();
        }
        currentSection = "summary";
        sectionContent = "";
      } else if (currentSection) {
        sectionContent += line + "\n";
      }
    }
    if (currentSection && sectionContent) {
      sections[currentSection] = sectionContent.trim();
    }
    return sections;
  }
  generateOptimizedSummary(sections, originalText) {
    const hasExperience = originalText.includes("years") || originalText.includes("experience");
    const techKeywords = this.techKeywords.filter((k) => originalText.includes(k)).slice(0, 4);
    return `Results-driven professional with proven expertise in ${techKeywords.join(", ") || "technology solutions"}. Demonstrated track record of delivering high-impact projects and driving operational excellence. Strong analytical and problem-solving abilities with excellent communication skills and a collaborative approach to achieving organizational goals.`;
  }
  optimizeExperienceSection(experienceText) {
    if (!experienceText.trim()) {
      return `SENIOR SOFTWARE ENGINEER | Tech Solutions Inc. | 2021 - Present
\u2022 Developed and deployed 15+ scalable web applications, increasing user engagement by 40%
\u2022 Led cross-functional team of 8 developers, delivering projects 25% ahead of schedule
\u2022 Implemented automated testing frameworks, reducing bug reports by 60%
\u2022 Collaborated with product managers to define technical requirements for new features

SOFTWARE DEVELOPER | Innovation Labs | 2019 - 2021
\u2022 Built responsive web applications using React and Node.js, serving 10K+ daily users
\u2022 Optimized database queries and API performance, improving response times by 50%
\u2022 Participated in code reviews and mentored 3 junior developers
\u2022 Contributed to agile development processes and sprint planning sessions`;
    }
    const enhancedExperience = experienceText.replace(/responsible for/gi, "Led").replace(/worked on/gi, "Developed").replace(/helped/gi, "Collaborated to").replace(/did/gi, "Executed").replace(/made/gi, "Created");
    return enhancedExperience;
  }
  optimizeEducationSection(educationText) {
    if (!educationText.trim()) {
      return `BACHELOR OF SCIENCE IN COMPUTER SCIENCE
University of Technology | 2015 - 2019
\u2022 Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems
\u2022 Academic Projects: Built web applications, mobile apps, and data analysis tools
\u2022 GPA: 3.7/4.0`;
    }
    return educationText;
  }
  generateOptimizedSkills(originalText) {
    const foundTechSkills = this.techKeywords.filter((k) => originalText.includes(k));
    const foundSoftSkills = this.skillKeywords.filter((k) => originalText.includes(k));
    const additionalTechSkills = ["JavaScript", "Python", "React", "Node.js", "SQL", "Git", "AWS", "Docker"];
    const additionalSoftSkills = ["Leadership", "Communication", "Problem Solving", "Project Management"];
    const allTechSkills = Array.from(/* @__PURE__ */ new Set([...foundTechSkills, ...additionalTechSkills])).slice(0, 12);
    const allSoftSkills = Array.from(/* @__PURE__ */ new Set([...foundSoftSkills, ...additionalSoftSkills])).slice(0, 8);
    return `TECHNICAL SKILLS
${allTechSkills.join(" \u2022 ")}

CORE COMPETENCIES  
${allSoftSkills.join(" \u2022 ")}`;
  }
  generateAdditionalSections(originalText) {
    return `ACHIEVEMENTS
\u2022 Increased team productivity by 30% through implementation of agile methodologies
\u2022 Recognized as "Employee of the Quarter" for outstanding project delivery
\u2022 Successfully delivered 20+ projects with 98% client satisfaction rate

CERTIFICATIONS
\u2022 AWS Certified Solutions Architect (if applicable to role)
\u2022 Certified Scrum Master (if applicable)
\u2022 Professional Development Certificate in Advanced Technologies`;
  }
  formatOptimizedResume(content) {
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
\u2022 Action-oriented language with quantified achievements
\u2022 Industry-relevant keywords for ATS optimization
\u2022 Professional formatting with clear section headers
\u2022 Balanced technical and soft skills presentation
\u2022 Strategic content placement for maximum impact
`;
  }
};
async function registerRoutes(app2) {
  const groqApiKey = process.env.GROQ_API_KEY;
  console.log("\u{1F511} Groq API Key Status:", groqApiKey ? "\u2705 LOADED" : "\u274C NOT FOUND");
  if (!groqApiKey) {
    console.log("\u26A0\uFE0F  GROQ_API_KEY not found in environment variables");
    console.log("\u{1F4CD} Make sure .env.local has: GROQ_API_KEY=your_key");
  } else {
    console.log("\u2705 Initializing Groq client...");
  }
  groqClient = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;
  const analyzer = new ResumeAnalyzer();
  const uploadMultiple = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
      // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === "resume" && file.mimetype === "application/pdf") {
        cb(null, true);
      } else if (file.fieldname === "resume") {
        cb(new Error("Only PDF files are allowed"));
      } else {
        cb(null, true);
      }
    }
  }).any();
  app2.post("/api/analyze-resume", uploadMultiple, async (req, res) => {
    try {
      const resumeFile = req.files?.find((f) => f.fieldname === "resume");
      if (!resumeFile) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }
      const jobDescription = req.body?.jobDescription;
      console.log("=== DEBUG: Upload Request ===");
      console.log("Files received:", req.files?.map((f) => ({ fieldname: f.fieldname, size: f.size })));
      console.log("Job description:", !!jobDescription ? `${jobDescription.length} chars` : "none");
      console.log("\u{1F4CB} Job description content:", jobDescription?.substring(0, 100) + "...");
      let extractedText = "";
      try {
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
      console.log("Analyzing with job description:", !!jobDescription);
      const analysisData = analyzer.analyzeResume(
        extractedText,
        resumeFile.originalname,
        resumeFile.size,
        jobDescription
      );
      if (jobDescription && jobDescription.trim() && groqClient) {
        console.log("\u{1F504} Generating job-specific analysis with Groq...");
        console.log("Job description length:", jobDescription.length);
        try {
          const aiAnalysis = await analyzer.generateAIRecommendations(extractedText, jobDescription);
          console.log("\u{1F4CA} Groq analysis result:", aiAnalysis ? "\u2713 Received" : "\u274C Null/undefined");
          if (aiAnalysis && aiAnalysis.recommendations !== void 0) {
            analysisData.missingSkills = aiAnalysis.missing_skills || [];
            analysisData.matchedSkills = aiAnalysis.matched_skills || [];
            analysisData.jobMatchRecommendations = aiAnalysis.recommendations || [];
            console.log("\u2705 Groq analysis merged!");
            console.log("   - Matched Skills:", aiAnalysis.matched_skills?.length || 0, "\u2192", aiAnalysis.matched_skills || []);
            console.log("   - Missing Skills:", aiAnalysis.missing_skills?.length || 0, "\u2192", aiAnalysis.missing_skills || []);
            console.log("   - Recommendations:", aiAnalysis.recommendations?.length || 0);
          } else {
            console.log("\u26A0\uFE0F  Groq returned no analysis (null or no recommendations)");
            if (aiAnalysis) {
              console.log("   Groq response keys:", Object.keys(aiAnalysis));
            }
          }
        } catch (groqError) {
          console.error("\u274C Groq error:", groqError instanceof Error ? groqError.message : groqError);
        }
      } else if (jobDescription && jobDescription.trim()) {
        console.log("\u26A0\uFE0F  Groq API key not configured");
      }
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
  app2.get("/api/sample-analysis/:sampleId", async (req, res) => {
    try {
      const sampleId = parseInt(req.params.sampleId);
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
      const analysisData = analyzer.analyzeResume(sampleText, fileName, 25e4);
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
  app2.get("/api/analysis/:id", async (req, res) => {
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
  app2.post("/api/generate-optimized-resume/:id", async (req, res) => {
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var __dirname = path3.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV !== "production") {
  const envPath = path3.resolve(__dirname, "../.env.local");
  console.log("\u{1F4C2} Loading .env from:", envPath);
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}
console.log(
  "\u{1F511} GROQ_API_KEY from env:",
  process.env.GROQ_API_KEY ? "\u2705 SET" : "\u274C NOT SET"
);
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const isProd = process.env.NODE_ENV === "production";
  const port = process.env.PORT || 5e3;
  const host = isProd ? "0.0.0.0" : "localhost";
  server.listen({ port, host }, () => {
    console.log(`\u{1F680} Server running at: http://localhost:${port}`);
  });
})();
