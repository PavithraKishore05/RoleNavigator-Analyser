import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const resumeAnalyses = pgTable("resume_analyses", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  extractedText: text("extracted_text").notNull(),
  jobDescription: text("job_description"), // optional job description for targeted analysis
  overallScore: integer("overall_score").notNull(),
  scores: jsonb("scores").notNull(), // {formatting: 85, content: 72, keywords: 68, experience: 82}
  strengths: jsonb("strengths").notNull(), // array of {title, description}
  recommendations: jsonb("recommendations").notNull(), // array of {title, description, example}
  sectionAnalysis: jsonb("section_analysis").notNull(), // detailed section breakdowns
  atsCompatibility: jsonb("ats_compatibility").notNull(), // ATS analysis results
  jobMatchScore: integer("job_match_score"), // score based on job description match
  matchedSkills: jsonb("matched_skills"), // skills found in both job and resume
  missingSkills: jsonb("missing_skills"), // skills required for job but missing in resume
  jobMatchRecommendations: jsonb("job_match_recommendations"), // recommendations for missing skills
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertResumeAnalysisSchema = createInsertSchema(resumeAnalyses).omit({
  id: true,
  createdAt: true,
}).extend({
  jobDescription: z.string().optional(),
  jobMatchScore: z.number().optional(),
  missingSkills: z.any().optional(),
  matchedSkills: z.array(z.string()).optional(),
  jobMatchRecommendations: z.array(z.any()).optional(),
});

export type InsertResumeAnalysis = z.infer<typeof insertResumeAnalysisSchema>;
export type ResumeAnalysis = typeof resumeAnalyses.$inferSelect;

// Sample resume data for demo purposes
export const sampleResumes = [
  {
    id: 1,
    title: "Software Engineer",
    description: "5 years experience • Tech industry",
    icon: "fas fa-user",
  },
  {
    id: 2,
    title: "Data Scientist", 
    description: "3 years experience • Analytics",
    icon: "fas fa-chart-line",
  },
  {
    id: 3,
    title: "UX Designer",
    description: "4 years experience • Design", 
    icon: "fas fa-palette",
  },
];
