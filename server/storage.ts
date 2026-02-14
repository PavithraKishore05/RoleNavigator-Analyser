import { resumeAnalyses, type ResumeAnalysis, type InsertResumeAnalysis } from "@shared/schema";

export interface IStorage {
  createResumeAnalysis(analysis: InsertResumeAnalysis): Promise<ResumeAnalysis>;
  getResumeAnalysis(id: number): Promise<ResumeAnalysis | undefined>;
  getAllResumeAnalyses(): Promise<ResumeAnalysis[]>;
}

export class MemStorage implements IStorage {
  private analyses: Map<number, ResumeAnalysis>;
  private currentId: number;

  constructor() {
    this.analyses = new Map();
    this.currentId = 1;
  }

  async createResumeAnalysis(insertAnalysis: InsertResumeAnalysis): Promise<ResumeAnalysis> {
    const id = this.currentId++;
    const analysis: ResumeAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getResumeAnalysis(id: number): Promise<ResumeAnalysis | undefined> {
    return this.analyses.get(id);
  }

  async getAllResumeAnalyses(): Promise<ResumeAnalysis[]> {
    return Array.from(this.analyses.values());
  }
}

export const storage = new MemStorage();
