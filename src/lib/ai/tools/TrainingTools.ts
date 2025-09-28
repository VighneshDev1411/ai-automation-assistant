// src/lib/ai/tools/TrainingTools.ts
import { ToolDefinition } from '../FunctionCallingSystem'
import { aiTrainingManager } from '../TrainingManager'

/**
 * AI Training Tools for fine-tuning and model management
 */

export const createTrainingDataset: ToolDefinition = {
  name: 'create_training_dataset',
  description: 'Create a new training dataset for AI model fine-tuning',
  parameters: {
    name: {
      name: 'name',
      type: 'string',
      description: 'Name of the training dataset',
      required: true
    },
    description: {
      name: 'description',
      type: 'string',
      description: 'Description of what this dataset will be used for',
      required: true
    },
    organization_id: {
      name: 'organization_id',
      type: 'string',
      description: 'Organization ID (optional, defaults to current org)',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { name, description, organization_id = 'default-org' } = params
    
    try {
      const datasetId = aiTrainingManager.createDataset(name, description, organization_id)
      
      return {
        success: true,
        dataset_id: datasetId,
        name,
        description,
        message: `Training dataset "${name}" created successfully`,
        next_steps: [
          'Add training examples using add_training_example',
          'Ensure you have at least 10 high-quality examples',
          'Start fine-tuning once dataset is ready'
        ],
        created_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create dataset: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const addTrainingExample: ToolDefinition = {
  name: 'add_training_example',
  description: 'Add a training example to an existing dataset',
  parameters: {
    dataset_id: {
      name: 'dataset_id',
      type: 'string',
      description: 'ID of the dataset to add the example to',
      required: true
    },
    input: {
      name: 'input',
      type: 'string',
      description: 'Input text for the training example',
      required: true
    },
    expected_output: {
      name: 'expected_output',
      type: 'string',
      description: 'Expected output/response for this input',
      required: true
    },
    category: {
      name: 'category',
      type: 'string',
      description: 'Category of the training example',
      required: false,
      enum: ['conversation', 'task', 'domain_specific', 'function_call']
    },
    quality: {
      name: 'quality',
      type: 'string',
      description: 'Quality rating of this example',
      required: false,
      enum: ['high', 'medium', 'low']
    },
    tags: {
      name: 'tags',
      type: 'array',
      description: 'Tags to categorize this example',
      required: false,
      items: {
        type: 'string'
      }
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { 
      dataset_id, 
      input, 
      expected_output, 
      category = 'conversation', 
      quality = 'high',
      tags = []
    } = params
    
    try {
      const success = aiTrainingManager.addTrainingExample(dataset_id, {
        input,
        expectedOutput: expected_output,
        category,
        quality,
        tags,
        createdBy: 'ai-agent'
      })
      
      if (!success) {
        return {
          success: false,
          error: 'Dataset not found or invalid'
        }
      }
      
      return {
        success: true,
        message: 'Training example added successfully',
        example: {
          input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
          expected_output: expected_output.substring(0, 100) + (expected_output.length > 100 ? '...' : ''),
          category,
          quality,
          tags
        },
        dataset_id,
        added_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to add training example: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const startFineTuning: ToolDefinition = {
  name: 'start_fine_tuning',
  description: 'Start fine-tuning an AI model with a training dataset',
  parameters: {
    dataset_id: {
      name: 'dataset_id',
      type: 'string',
      description: 'ID of the dataset to use for training',
      required: true
    },
    model_name: {
      name: 'model_name',
      type: 'string',
      description: 'Name for the new fine-tuned model',
      required: true
    },
    base_model: {
      name: 'base_model',
      type: 'string',
      description: 'Base model to fine-tune',
      required: false,
      enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']
    },
    learning_rate: {
      name: 'learning_rate',
      type: 'number',
      description: 'Learning rate for training (default: 0.001)',
      required: false
    },
    epochs: {
      name: 'epochs',
      type: 'number',
      description: 'Number of training epochs (default: 3)',
      required: false
    }
  },
  category: 'automation',
  enabled: true,
  timeout: 5000,
  handler: async (params) => {
    const { 
      dataset_id, 
      model_name, 
      base_model = 'gpt-3.5-turbo',
      learning_rate = 0.001,
      epochs = 3
    } = params
    
    try {
      const jobId = await aiTrainingManager.startFineTuning(
        dataset_id,
        model_name,
        base_model,
        {
          learningRate: learning_rate,
          epochs
        }
      )
      
      return {
        success: true,
        job_id: jobId,
        model_name,
        base_model,
        message: `Fine-tuning job started for model "${model_name}"`,
        estimated_duration: `${epochs * 5} minutes`,
        hyperparameters: {
          learning_rate,
          epochs,
          base_model
        },
        next_steps: [
          `Monitor progress using get_training_status with job_id: ${jobId}`,
          'Training will run in the background',
          'You will receive a model ID when training completes'
        ],
        started_at: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to start fine-tuning: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const getTrainingStatus: ToolDefinition = {
  name: 'get_training_status',
  description: 'Check the status of a fine-tuning job',
  parameters: {
    job_id: {
      name: 'job_id',
      type: 'string',
      description: 'ID of the training job to check',
      required: true
    }
  },
  category: 'automation',
  enabled: true,
  handler: async (params) => {
    const { job_id } = params
    
    try {
      const job = aiTrainingManager.getTrainingStatus(job_id)
      
      if (!job) {
        return {
          success: false,
          error: 'Training job not found'
        }
      }
      
      return {
        success: true,
        job_id,
        status: job.status,
        progress: `${job.progress.toFixed(1)}%`,
        model_name: job.modelName,
        base_model: job.baseModel,
        current_metrics: {
          epochs_completed: job.trainingMetrics.epochs,
          current_loss: job.trainingMetrics.loss[job.trainingMetrics.loss.length - 1]?.toFixed(4),
          current_accuracy: job.trainingMetrics.accuracy[job.trainingMetrics.accuracy.length - 1]?.toFixed(3)
        },
        cost: {
          estimated: `$${job.cost.estimated.toFixed(3)}`,
          actual: job.cost.actual ? `$${job.cost.actual.toFixed(3)}` : 'TBD'
        },
        started_at: job.startedAt?.toISOString(),
        completed_at: job.completedAt?.toISOString(),
        result_model_id: job.resultModelId,
        error: job.error
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get training status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export const listTrainingDatasets: ToolDefinition = {
  name: 'list_training_datasets',
  description: 'List all available training datasets',
  parameters: {},
  category: 'automation',
  enabled: true,
  handler: async () => {
    try {
      const datasets = aiTrainingManager.listDatasets()
      
      return {
        success: true,
        datasets: datasets.map(dataset => ({
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          total_examples: dataset.totalExamples,
          quality_distribution: dataset.qualityDistribution,
          categories: dataset.categories,
          is_active: dataset.isActive,
          created_at: dataset.createdAt.toISOString(),
          updated_at: dataset.updatedAt.toISOString()
        })),
        total_count: datasets.length,
        message: datasets.length > 0 
          ? `Found ${datasets.length} training datasets`
          : 'No training datasets found. Create one with create_training_dataset.'
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list datasets: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// Export all training tools
export const TRAINING_TOOLS: ToolDefinition[] = [
  createTrainingDataset,
  addTrainingExample,
  startFineTuning,
  getTrainingStatus,
  listTrainingDatasets
]