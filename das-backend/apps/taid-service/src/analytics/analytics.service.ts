// das-backend/apps/taid-service/src/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@das/prisma-client';
import { 
  AnalysisResult, 
  Experiment, 
  ExperimentMedia,
  Prisma 
} from '@prisma/client';
import * as stats from 'simple-statistics';

interface ModelPerformance {
  modelName: string;
  modelVersion: string;
  metrics: {
    mAP: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  degradationImpact: Record<string, any>;
}

interface InsightReport {
  experimentId: string;
  timestamp: Date;
  models: ModelPerformance[];
  criticalFindings: string[];
  recommendations: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async analyzeExperiment(
    experimentId: string,
    inferenceResults: any[],
  ): Promise<InsightReport> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        mediaItems: {
          include: {
            originalMedia: true,
          },
        },
      },
    });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    // Group results by model
    const modelResults = new Map<string, any[]>();
    for (const result of inferenceResults) {
      const key = `${result.modelName}@${result.modelVersion}`;
      if (!modelResults.has(key)) {
        modelResults.set(key, []);
      }
      modelResults.get(key)!.push(result);
    }

    const models: ModelPerformance[] = [];
    const criticalFindings: string[] = [];

    // Analyze each model
    for (const [modelKey, results] of modelResults) {
      const [modelName, modelVersion] = modelKey.split('@');
      const performance = await this.analyzeModelPerformance(
        experiment,
        modelName,
        modelVersion,
        results,
      );
      models.push(performance);

      // Detect critical issues
      if (performance.metrics.mAP < 0.5) {
        criticalFindings.push(
          `${modelName} shows poor overall performance (mAP: ${performance.metrics.mAP.toFixed(3)})`
        );
      }

      // Analyze degradation impacts
      for (const [degradationType, impact] of Object.entries(performance.degradationImpact)) {
        if (impact.dropRate > 0.2) {
          criticalFindings.push(
            `${modelName} suffers ${(impact.dropRate * 100).toFixed(1)}% accuracy drop with ${degradationType}`
          );
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(models, criticalFindings);

    // Store analysis results
    for (const model of models) {
      await this.prisma.analysisResult.create({
        data: {
          experimentId,
          modelName: model.modelName,
          modelVersion: model.modelVersion,
          metrics: model.metrics as any,
          insights: {
            degradationImpact: model.degradationImpact,
            criticalFindings: criticalFindings.filter(f => f.includes(model.modelName)),
          },
        },
      });
    }

    return {
      experimentId,
      timestamp: new Date(),
      models,
      criticalFindings,
      recommendations,
    };
  }

  private async analyzeModelPerformance(
    experiment: any,
    modelName: string,
    modelVersion: string,
    results: any[],
  ): Promise<ModelPerformance> {
    // Calculate overall metrics
    const metrics = this.calculateMetrics(results);

    // Analyze degradation impacts
    const degradationImpact = await this.analyzeDegradationImpact(
      experiment.mediaItems,
      results,
    );

    return {
      modelName,
      modelVersion,
      metrics,
      degradationImpact,
    };
  }

  private calculateMetrics(results: any[]): any {
    // Extract performance metrics from inference results
    const precisions = results.map(r => r.metrics?.precision || 0);
    const recalls = results.map(r => r.metrics?.recall || 0);
    const aps = results.map(r => r.metrics?.ap || 0);

    const avgPrecision = stats.mean(precisions);
    const avgRecall = stats.mean(recalls);
    const mAP = stats.mean(aps);
    const f1Score = (2 * avgPrecision * avgRecall) / (avgPrecision + avgRecall);

    return {
      mAP: isNaN(mAP) ? 0 : mAP,
      precision: isNaN(avgPrecision) ? 0 : avgPrecision,
      recall: isNaN(avgRecall) ? 0 : avgRecall,
      f1Score: isNaN(f1Score) ? 0 : f1Score,
    };
  }

  private async analyzeDegradationImpact(
    experimentMedia: any[],
    results: any[],
  ): Promise<Record<string, any>> {
    const degradationGroups = new Map<string, any[]>();

    // Group results by degradation type
    for (const media of experimentMedia) {
      const result = results.find(r => r.mediaId === media.id);
      if (!result) continue;

      const degradations = media.degradations as any[];
      for (const deg of degradations) {
        if (!degradationGroups.has(deg.type)) {
          degradationGroups.set(deg.type, []);
        }
        degradationGroups.get(deg.type)!.push({
          parameters: deg.actualParameters,
          performance: result.metrics,
        });
      }
    }

    // Analyze impact of each degradation type
    const impact: Record<string, any> = {};
    
    // Get baseline performance (if available)
    const baselineResults = results.filter(r => {
      const media = experimentMedia.find(m => m.id === r.mediaId);
      return !media || (media.degradations as any[]).length === 0;
    });
    
    const baselineMetrics = baselineResults.length > 0 
      ? this.calculateMetrics(baselineResults)
      : null;

    for (const [degradationType, degradationResults] of degradationGroups) {
      const degradedMetrics = this.calculateMetrics(
        degradationResults.map(d => ({ metrics: d.performance }))
      );

      const dropRate = baselineMetrics 
        ? (baselineMetrics.mAP - degradedMetrics.mAP) / baselineMetrics.mAP
        : 0;

      // Perform regression analysis to find parameter sensitivities
      const parameterAnalysis = this.analyzeParameterSensitivity(degradationResults);

      impact[degradationType] = {
        dropRate,
        averageMetrics: degradedMetrics,
        sampleCount: degradationResults.length,
        parameterSensitivity: parameterAnalysis,
        severityLevel: this.calculateSeverityLevel(dropRate),
      };
    }

    return impact;
  }

  private analyzeParameterSensitivity(degradationResults: any[]): any {
    // Simple linear regression for each parameter
    const sensitivity: Record<string, any> = {};

    if (degradationResults.length < 3) {
      return sensitivity;
    }

    // Get all parameter names
    const paramNames = Object.keys(degradationResults[0].parameters);

    for (const paramName of paramNames) {
      const xValues = degradationResults.map(r => r.parameters[paramName]);
      const yValues = degradationResults.map(r => r.performance.mAP || 0);

      // Skip if parameter doesn't vary
      if (new Set(xValues).size === 1) continue;

      try {
        const regression = stats.linearRegression([
          xValues.map((x, i) => [x, yValues[i]])
        ][0]);

        sensitivity[paramName] = {
          slope: regression.m,
          intercept: regression.b,
          correlation: stats.sampleCorrelation(xValues, yValues),
          impact: Math.abs(regression.m) > 0.1 ? 'high' : 'low',
        };
      } catch (error) {
        this.logger.warn(`Failed to calculate sensitivity for ${paramName}:`, error);
      }
    }

    return sensitivity;
  }

  private calculateSeverityLevel(dropRate: number): string {
    if (dropRate > 0.3) return 'critical';
    if (dropRate > 0.15) return 'high';
    if (dropRate > 0.05) return 'medium';
    return 'low';
  }

  private generateRecommendations(
    models: ModelPerformance[],
    criticalFindings: string[],
  ): string[] {
    const recommendations: string[] = [];

    // Model-specific recommendations
    for (const model of models) {
      if (model.metrics.mAP < 0.7) {
        recommendations.push(
          `Consider retraining ${model.modelName} with more diverse data to improve baseline performance`
        );
      }

      // Degradation-specific recommendations
      for (const [degradationType, impact] of Object.entries(model.degradationImpact)) {
        if (impact.severityLevel === 'critical') {
          recommendations.push(
            `${model.modelName} requires specialized training for ${degradationType} conditions`
          );

          // Parameter-specific recommendations
          for (const [param, sensitivity] of Object.entries(impact.parameterSensitivity || {})) {
            if (sensitivity.impact === 'high') {
              recommendations.push(
                `Focus on data augmentation for ${degradationType} with varying ${param} values`
              );
            }
          }
        }
      }
    }

    // General recommendations based on patterns
    if (criticalFindings.some(f => f.includes('motion_blur'))) {
      recommendations.push(
        'Implement deblurring preprocessing or train with motion-augmented datasets'
      );
    }

    if (criticalFindings.some(f => f.includes('brightness'))) {
      recommendations.push(
        'Add adaptive histogram equalization to preprocessing pipeline'
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async getExperimentReport(experimentId: string): Promise<any> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        analysisResults: true,
        mediaItems: true,
      },
    });

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const latestResults = await this.prisma.analysisResult.findMany({
      where: { experimentId },
      orderBy: { timestamp: 'desc' },
      distinct: ['modelName'],
    });

    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        createdAt: experiment.createdAt,
        configuration: experiment.configuration,
      },
      summary: {
        totalImages: experiment.mediaItems.length,
        modelsAnalyzed: latestResults.length,
        degradationTypes: this.extractDegradationTypes(experiment.degradationManifest),
      },
      modelPerformance: latestResults.map(r => ({
        modelName: r.modelName,
        modelVersion: r.modelVersion,
        metrics: r.metrics,
        insights: r.insights,
        timestamp: r.timestamp,
      })),
      visualizations: await this.generateVisualizationData(experimentId, latestResults),
    };
  }

  private extractDegradationTypes(manifest: any): string[] {
    if (!manifest || !manifest.degradationSummary) return [];
    return Object.keys(manifest.degradationSummary);
  }

  private async generateVisualizationData(
    experimentId: string,
    results: AnalysisResult[],
  ): Promise<any> {
    // Generate data formatted for frontend charts
    const performanceComparison = results.map(r => ({
      model: `${r.modelName} v${r.modelVersion}`,
      mAP: (r.metrics as any).mAP || 0,
      precision: (r.metrics as any).precision || 0,
      recall: (r.metrics as any).recall || 0,
      f1Score: (r.metrics as any).f1Score || 0,
    }));

    // Degradation impact heatmap
    const degradationHeatmap: any[] = [];
    for (const result of results) {
      const insights = result.insights as any;
      if (insights?.degradationImpact) {
        for (const [degradation, impact] of Object.entries(insights.degradationImpact)) {
          degradationHeatmap.push({
            model: result.modelName,
            degradation,
            dropRate: (impact as any).dropRate || 0,
            severity: (impact as any).severityLevel || 'low',
          });
        }
      }
    }

    return {
      performanceComparison,
      degradationHeatmap,
    };
  }
}