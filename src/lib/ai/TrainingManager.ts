// src/lib/ai/TrainingManager.ts
export interface TrainingExample {
  id: string
  input: string
  expectedOutput: string
  category: 'conversation' | 'task' | 'domain_specific' | 'function_call'
  quality: 'high' | 'medium' | 'low'
  tags: string[]
  createdAt: Date
  createdBy: string
  validated: boolean
}

export interface TrainingDataset {
  id: string
  name: string
  description: string
  examples: TrainingExample[]
  totalExamples: number
  qualityDistribution: {
    high: number
    medium: number
    low: number
  }
  categories: Record<string, number>
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface FineTuningJob {
  id: string
  modelName: string
  baseModel: string
  datasetId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startedAt?: Date
  completedAt?: Date
  trainingMetrics: {
    loss: number[]
    accuracy: number[]
    validationLoss: number[]
    epochs: number
    learningRate: number
  }
  hyperparameters: {
    learningRate: number
    batchSize: number
    epochs: number
    temperature: number
  }
  cost: {
    estimated: number
    actual?: number
    currency: 'USD'
  }
  resultModelId?: string
  error?: string
}

export interface ModelComparison {
  id: string
  name: string
  models: Array<{
    id: string
    name: string
    baseModel: string
    metrics: {
      accuracy: number
      responseTime: number
      costPerRequest: number
      userSatisfaction: number
    }
  }>
  testCases: Array<{
    input: string
    expectedOutput: string
    results: Record<string, {
      output: string
      score: number
      responseTime: number
    }>
  }>
  createdAt: Date
}

export class AITrainingManager {
  private datasets: Map<string, TrainingDataset> = new Map()
  private trainingJobs: Map<string, FineTuningJob> = new Map()
  private modelComparisons: Map<string, ModelComparison> = new Map()

  constructor() {
    this.initializeMockData()
  }

  /**
   * Create a new training dataset
   */
  createDataset(
    name: string,
    description: string,
    organizationId: string
  ): string {
    const id = crypto.randomUUID()
    const dataset: TrainingDataset = {
      id,
      name,
      description,
      examples: [],
      totalExamples: 0,
      qualityDistribution: { high: 0, medium: 0, low: 0 },
      categories: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    }
    
    this.datasets.set(id, dataset)
    return id
  }

  /**
   * Add training example to dataset
   */
  addTrainingExample(
    datasetId: string,
    example: Omit<TrainingExample, 'id' | 'createdAt' | 'validated'>
  ): boolean {
    const dataset = this.datasets.get(datasetId)
    if (!dataset) return false

    const trainingExample: TrainingExample = {
      ...example,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      validated: false
    }

    dataset.examples.push(trainingExample)
    dataset.totalExamples++
    dataset.qualityDistribution[example.quality]++
    dataset.categories[example.category] = (dataset.categories[example.category] || 0) + 1
    dataset.updatedAt = new Date()

    this.datasets.set(datasetId, dataset)
    return true
  }

  /**
   * Start fine-tuning job
   */
  async startFineTuning(
    datasetId: string,
    modelName: string,
    baseModel: string = 'gpt-3.5-turbo',
    hyperparameters: Partial<FineTuningJob['hyperparameters']> = {}
  ): Promise<string> {
    const dataset = this.datasets.get(datasetId)
    if (!dataset) {
      throw new Error('Dataset not found')
    }

    if (dataset.totalExamples < 10) {
      throw new Error('Need at least 10 training examples')
    }

    const jobId = crypto.randomUUID()
    const job: FineTuningJob = {
      id: jobId,
      modelName,
      baseModel,
      datasetId,
      status: 'pending',
      progress: 0,
      trainingMetrics: {
        loss: [],
        accuracy: [],
        validationLoss: [],
        epochs: 0,
        learningRate: hyperparameters.learningRate || 0.001
      },
      hyperparameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 3,
        temperature: 0.7,
        ...hyperparameters
      },
      cost: {
        estimated: this.estimateTrainingCost(dataset.totalExamples, baseModel),
        currency: 'USD'
      }
    }

    this.trainingJobs.set(jobId, job)
    
    // Start training simulation
    this.simulateTraining(jobId)
    
    return jobId
  }

  /**
   * Get training job status
   */
  getTrainingStatus(jobId: string): FineTuningJob | null {
    return this.trainingJobs.get(jobId) || null
  }

  /**
   * List all datasets
   */
  listDatasets(): TrainingDataset[] {
    return Array.from(this.datasets.values())
  }

  /**
   * List all training jobs
   */
  listTrainingJobs(): FineTuningJob[] {
    return Array.from(this.trainingJobs.values())
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
  }

  /**
   * Compare model performance
   */
  async compareModels(
    modelIds: string[],
    testCases: Array<{ input: string; expectedOutput: string }>
  ): Promise<string> {
    const comparisonId = crypto.randomUUID()
    
    // Mock model comparison
    const comparison: ModelComparison = {
      id: comparisonId,
      name: `Model Comparison ${new Date().toLocaleDateString()}`,
      models: modelIds.map(id => ({
        id,
        name: `Model ${id.slice(0, 8)}`,
        baseModel: 'gpt-3.5-turbo',
        metrics: {
          accuracy: Math.random() * 0.3 + 0.7, // 70-100%
          responseTime: Math.random() * 1000 + 500, // 500-1500ms
          costPerRequest: Math.random() * 0.01 + 0.005, // $0.005-0.015
          userSatisfaction: Math.random() * 0.2 + 0.8 // 80-100%
        }
      })),
      testCases: testCases.map(testCase => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        results: modelIds.reduce((acc, modelId) => {
          acc[modelId] = {
            output: `Response from model ${modelId.slice(0, 8)} for: ${testCase.input}`,
            score: Math.random() * 0.3 + 0.7,
            responseTime: Math.random() * 1000 + 500
          }
          return acc
        }, {} as Record<string, any>)
      })),
      createdAt: new Date()
    }

    this.modelComparisons.set(comparisonId, comparison)
    return comparisonId
  }

  /**
   * Get model comparison results
   */
  getModelComparison(comparisonId: string): ModelComparison | null {
    return this.modelComparisons.get(comparisonId) || null
  }

  // Private methods
  private simulateTraining(jobId: string) {
    const job = this.trainingJobs.get(jobId)
    if (!job) return

    job.status = 'running'
    job.startedAt = new Date()
    
    let currentEpoch = 0
    const totalEpochs = job.hyperparameters.epochs

    const interval = setInterval(() => {
      currentEpoch++
      job.progress = (currentEpoch / totalEpochs) * 100
      job.trainingMetrics.epochs = currentEpoch
      
      // Simulate improving metrics
      const loss = Math.max(0.1, 2.0 - (currentEpoch * 0.3) + (Math.random() * 0.2))
      const accuracy = Math.min(0.95, 0.6 + (currentEpoch * 0.1) + (Math.random() * 0.05))
      
      job.trainingMetrics.loss.push(loss)
      job.trainingMetrics.accuracy.push(accuracy)
      job.trainingMetrics.validationLoss.push(loss + Math.random() * 0.1)

      if (currentEpoch >= totalEpochs) {
        job.status = 'completed'
        job.completedAt = new Date()
        job.progress = 100
        job.resultModelId = `ft-${crypto.randomUUID().slice(0, 8)}`
        job.cost.actual = job.cost.estimated * (0.9 + Math.random() * 0.2) // ±10% variance
        clearInterval(interval)
      }

      this.trainingJobs.set(jobId, job)
    }, 2000) // Update every 2 seconds for demo
  }

  private estimateTrainingCost(exampleCount: number, baseModel: string): number {
    const baseRate = baseModel.includes('gpt-4') ? 0.03 : 0.008 // per example
    return exampleCount * baseRate
  }

  private initializeMockData() {
    // Create sample dataset
    const sampleDatasetId = this.createDataset(
      'Customer Support Dataset',
      'Training data for customer support conversations',
      'default-org'
    )

    // Add sample training examples
    const sampleExamples = [
      {
        input: 'How do I reset my password?',
        expectedOutput: 'To reset your password, click on the "Forgot Password" link on the login page and follow the instructions sent to your email.',
        category: 'conversation' as const,
        quality: 'high' as const,
        tags: ['password', 'account'],
        createdBy: 'admin'
      },
      {
        input: 'What are your business hours?',
        expectedOutput: 'Our business hours are Monday through Friday, 9 AM to 6 PM EST. We also offer 24/7 chat support.',
        category: 'conversation' as const,
        quality: 'high' as const,
        tags: ['hours', 'support'],
        createdBy: 'admin'
      }
    ]

    sampleExamples.forEach(example => {
      this.addTrainingExample(sampleDatasetId, example)
    })
  }
}

// Export singleton instance
export const aiTrainingManager = new AITrainingManager()