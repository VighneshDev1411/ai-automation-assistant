'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  Search, 
  Brain, 
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  BarChart3,
  Zap,
  Plus
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
// import { createRAGSystem } from '@/lib/ai'
import { createRAGSystem } from '@/lib/ai/RAGSystem'

interface TestResult {
  id: string
  query: string
  answer: string
  sources: any[]
  confidence: number
  processingTime: number
  tokensUsed: number
  timestamp: Date
}

interface KnowledgeBase {
  id: string
  name: string
  documentCount: number
  chunkCount: number
}

export default function RAGTestInterface() {
  const [activeTab, setActiveTab] = useState('setup')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKB, setSelectedKB] = useState<string>('')
  const [query, setQuery] = useState('')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isQuerying, setIsQuerying] = useState(false)
  const [isCreatingKB, setIsCreatingKB] = useState(false)
  const [DocumentProcessor, setDocumentProcessor] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load DocumentProcessor client-side only
  useEffect(() => {
    const loadDocumentProcessor = async () => {
      try {
        const { DocumentProcessor: DP } = await import('@/lib/ai/DocumentProcessor')
        setDocumentProcessor(() => DP)
      } catch (error) {
        console.error('Failed to load DocumentProcessor:', error)
      }
    }
    
    loadDocumentProcessor()
  }, [])

  // Load existing knowledge bases on component mount
  useEffect(() => {
    loadExistingKnowledgeBases()
  }, [])

  const loadExistingKnowledgeBases = async () => {
    try {
      const rag = createRAGSystem()
      
      // Try to get the vector store instance - you might need to expose this method
      // For now, we'll catch the error and let user create new ones
      console.log('Checking for existing knowledge bases...')
      
    } catch (error) {
      console.log('No existing knowledge bases found or error loading them')
    }
  }

  const createTestKnowledgeBases = async () => {
    setIsCreatingKB(true)
    
    try {
      const rag = createRAGSystem()
      
      toast({
        title: 'Creating Knowledge Bases...',
        description: 'This may take a moment'
      })
      
      // Create the test knowledge bases
      const kb1Id = await rag.createKnowledgeBase(
        'default-org',
        'Product Documentation', 
        'Technical documentation and user guides'
      )
      
      const kb2Id = await rag.createKnowledgeBase(
        'default-org',
        'Company Policies',
        'Employee handbook and company policies'
      )

      const kb3Id = await rag.createKnowledgeBase(
        'default-org',
        'Sales Training',
        'Sales processes and training materials'
      )
      
      // Update your state with real IDs
      const newKBs = [
        { id: kb1Id, name: 'Product Documentation', documentCount: 0, chunkCount: 0 },
        { id: kb2Id, name: 'Company Policies', documentCount: 0, chunkCount: 0 },
        { id: kb3Id, name: 'Sales Training', documentCount: 0, chunkCount: 0 }
      ]
      
      setKnowledgeBases(newKBs)
      setSelectedKB(kb1Id)
      
      toast({
        title: 'Knowledge Bases Created Successfully!',
        description: `Created 3 knowledge bases with IDs: ${kb1Id.slice(0, 8)}..., ${kb2Id.slice(0, 8)}..., ${kb3Id.slice(0, 8)}...`
      })

      // Auto-switch to upload tab
      setActiveTab('upload')
      
    } catch (error) {
      console.error('Knowledge base creation error:', error)
      toast({
        title: 'Creation Failed', 
        description: error instanceof Error ? error.message : 'Failed to create knowledge bases',
        variant: 'destructive'
      })
    } finally {
      setIsCreatingKB(false)
    }
  }

  const handleRealDocumentUpload = async (files: File[]) => {
    if (!DocumentProcessor) {
      toast({
        title: 'Loading...',
        description: 'Document processor is still loading. Please try again.',
        variant: 'destructive'
      })
      return
    }

    if (!selectedKB) {
      toast({
        title: 'No Knowledge Base Selected',
        description: 'Please create and select a knowledge base first.',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      const rag = createRAGSystem()
      const processor = new DocumentProcessor()
      const processedDocs = []
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file
        const validation = processor.validateFile(file)
        if (!validation.valid) {
          throw new Error(`${file.name}: ${validation.error}`)
        }

        // Update progress - processing file
        setProcessingProgress((i / files.length) * 50)
        
        // Process document to extract text
        const processedDoc = await processor.processFile(file, {
          preserveFormatting: true,
          maxPages: 100 // Limit for large PDFs
        })

        // Prepare document for RAG system
        const ragDocument = {
          // id: `${Date.now()}-${i}`, // Unique ID
          id: crypto.randomUUID(),
          content: processedDoc.content,
          metadata: {
            source: file.name,
            title: processedDoc.metadata.title,
            fileType: processedDoc.metadata.fileType,
            wordCount: processedDoc.metadata.wordCount,
            pageCount: processedDoc.metadata.pageCount,
            uploadedAt: new Date().toISOString(),
            originalSize: file.size
          }
        }

        processedDocs.push(ragDocument)
        
        // Update progress - file processed
        setProcessingProgress(((i + 0.5) / files.length) * 100)
      }

      // Add all documents to the knowledge base
      await rag.addDocuments(selectedKB, processedDocs)
      
      // Update progress - complete
      setProcessingProgress(100)

      // Update knowledge base stats in UI
      const newChunkCount = processedDocs.length * 15 // Rough estimate
      setKnowledgeBases(prev => prev.map(kb => 
        kb.id === selectedKB 
          ? { 
              ...kb, 
              documentCount: kb.documentCount + files.length,
              chunkCount: kb.chunkCount + newChunkCount
            }
          : kb
      ))

      toast({
        title: 'Documents Processed Successfully!',
        description: `Processed ${files.length} documents and added ~${newChunkCount} chunks to knowledge base`
      })

    } catch (error) {
      console.error('Document upload error:', error)
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to process documents',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const handleRealRAGQuery = async (query: string): Promise<TestResult> => {
    setIsQuerying(true)
    
    try {
      const rag = createRAGSystem()
      
      // Perform actual RAG query
      const response = await rag.query(selectedKB, {
        query,
        topK: 5,
        threshold: 0.7,
        includeMetadata: true
      })

      // Transform response to TestResult format
      const result: TestResult = {
        id: Date.now().toString(),
        query: response.query,
        answer: response.answer,
        sources: response.sources.map((source:any) => ({
          chunk: {
            content: source.chunk.content,
            metadeta: {
              source: source.chunk.metadeta.source,
              page: source.chunk.metadeta.page,
              section: source.chunk.metadeta.section || 'Unknown'
            }
          },
          score: source.score,
          relevance: source.relevance
        })),
        confidence: response.confidence,
        processingTime: response.processingTime,
        tokensUsed: response.tokensUsed,
        timestamp: new Date()
      }

      return result

    } catch (error) {
      console.error('RAG query error:', error)
      
      // Return error result
      return {
        id: Date.now().toString(),
        query,
        answer: `Error: ${error instanceof Error ? error.message : 'Query failed'}`,
        sources: [],
        confidence: 0,
        processingTime: 0,
        tokensUsed: 0,
        timestamp: new Date()
      }
    } finally {
      setIsQuerying(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    await handleRealDocumentUpload(files)
  }

  const handleQuery = async () => {
    if (!query.trim()) return

    try {
      const result = await handleRealRAGQuery(query)
      setTestResults(prev => [result, ...prev])
      setQuery('')
      
      if (result.confidence > 0) {
        toast({
          title: 'Query Completed',
          description: `Answer generated in ${result.processingTime}ms with ${result.confidence}% confidence`
        })
      } else {
        toast({
          title: 'Query Failed',
          description: result.answer,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Query Failed',
        description: 'Failed to process query',
        variant: 'destructive'
      })
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRelevanceColor = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">RAG System Testing Interface</h1>
        <p className="text-muted-foreground">
          Test and validate your Retrieval-Augmented Generation system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Setup
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="query" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Query
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Knowledge Base Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {knowledgeBases.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Knowledge Bases Found</h3>
                  <p className="text-gray-600 mb-4">
                    Create knowledge bases in your Supabase database to get started with RAG testing.
                  </p>
                  <Button 
                    onClick={createTestKnowledgeBases}
                    disabled={isCreatingKB}
                    size="lg"
                    className="gap-2"
                  >
                    {isCreatingKB ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Knowledge Bases...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Test Knowledge Bases
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Knowledge Bases Ready</h3>
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {knowledgeBases.length} Created
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {knowledgeBases.map(kb => (
                      <div 
                        key={kb.id}
                        className="border rounded-lg p-4 bg-green-50 border-green-200"
                      >
                        <h4 className="font-medium text-green-800">{kb.name}</h4>
                        <p className="text-sm text-green-600 mt-1">ID: {kb.id.slice(0, 8)}...</p>
                        <div className="text-sm text-green-700 mt-2">
                          <div>{kb.documentCount} documents</div>
                          <div>{kb.chunkCount} chunks</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
                    <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                      <li>Switch to the Upload tab to add documents</li>
                      <li>Upload the sample test files (TXT format recommended)</li>
                      <li>Use the Query tab to test RAG responses</li>
                      <li>Check Results and Analytics for performance metrics</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {knowledgeBases.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Please create knowledge bases in the Setup tab first before uploading documents.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Document Upload
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Knowledge Base</label>
                      <select 
                        value={selectedKB} 
                        onChange={(e) => setSelectedKB(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        {knowledgeBases.map(kb => (
                          <option key={kb.id} value={kb.id}>
                            {kb.name} ({kb.documentCount} docs, {kb.chunkCount} chunks)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Upload Documents
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Supported formats: TXT, MD, DOCX (PDF temporarily disabled)
                      </p>
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing || !selectedKB}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Select Files'
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".txt,.md,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Processing documents...</span>
                          <span>{Math.round(processingProgress)}%</span>
                        </div>
                        <Progress value={processingProgress} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Knowledge Bases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {knowledgeBases.map(kb => (
                        <div 
                          key={kb.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedKB === kb.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedKB(kb.id)}
                        >
                          <h4 className="font-medium">{kb.name}</h4>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>{kb.documentCount} documents</div>
                            <div>{kb.chunkCount} chunks</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Query Testing Tab */}
        <TabsContent value="query" className="space-y-6">
          {knowledgeBases.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Please create knowledge bases and upload documents before testing queries.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Test RAG Queries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Knowledge Base</label>
                  <select 
                    value={selectedKB} 
                    onChange={(e) => setSelectedKB(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {knowledgeBases.map(kb => (
                      <option key={kb.id} value={kb.id}>{kb.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Query</label>
                  <div className="flex gap-2">
                    <Textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter your question..."
                      className="flex-1"
                      rows={3}
                    />
                    <Button 
                      onClick={handleQuery}
                      disabled={isQuerying || !query.trim() || !selectedKB}
                      className="px-6"
                    >
                      {isQuerying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery('Who founded ACME Corporation?')}
                  >
                    Sample Query 1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery('What is the Starter Plan pricing?')}
                  >
                    Sample Query 2
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery('How many remote work days are allowed?')}
                  >
                    Sample Query 3
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery('What are the office locations?')}
                  >
                    Sample Query 4
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.slice(0, 3).map(result => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium">{result.query}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          {result.processingTime}ms
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">{result.answer}</div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={getConfidenceColor(result.confidence)}>
                          {result.confidence}% confidence
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {result.tokensUsed} tokens
                        </span>
                        <span className="text-sm text-gray-600">
                          {result.sources.length} sources
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{testResults.length}</div>
                    <div className="text-sm text-gray-600">Total Queries</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {testResults.length > 0 ? Math.round(testResults.reduce((sum, r) => sum + r.processingTime, 0) / testResults.length) : 0}ms
                    </div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {testResults.length > 0 ? Math.round(testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length) : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {testResults.length > 0 ? Math.round(testResults.reduce((sum, r) => sum + r.tokensUsed, 0) / testResults.length) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Avg Tokens</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Query Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No queries tested yet. Switch to the Query Testing tab to get started.
                </div>
              ) : (
                <div className="space-y-6">
                  {testResults.map(result => (
                    <div key={result.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-lg">{result.query}</h3>
                          <div className="text-sm text-gray-600 mt-1">
                            {result.timestamp.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getConfidenceColor(result.confidence)}>
                            {result.confidence}% confidence
                          </Badge>
                          <div className="text-sm text-gray-600">
                            {result.processingTime}ms
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h4 className="font-medium mb-2">Answer:</h4>
                        <p className="text-gray-700">{result.answer}</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Sources ({result.sources.length}):</h4>
                        {result.sources.map((source, index) => (
                          <div key={index} className="border-l-4 border-blue-200 pl-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getRelevanceColor(source.relevance)}>
                                {source.relevance} relevance
                              </Badge>
                              <span className="text-sm text-gray-600">
                                Score: {(source.score * 100).toFixed(1)}%
                              </span>
                              <span className="text-sm text-gray-600">
                                {source.chunk.metadeta.source}
                              </span>
                              {source.chunk.metadeta.page && (
                                <span className="text-sm text-gray-600">
                                  Page {source.chunk.metadeta.page}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">
                              {source.chunk.content.slice(0, 200)}...
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Tokens Used:</span>
                          <span className="ml-2 font-medium">{result.tokensUsed}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="ml-2 font-medium">{result.processingTime}ms</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Sources:</span>
                          <span className="ml-2 font-medium">{result.sources.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Fastest Response</span>
                      <span className="font-medium">
                        {Math.min(...testResults.map(r => r.processingTime))}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Slowest Response</span>
                      <span className="font-medium">
                        {Math.max(...testResults.map(r => r.processingTime))}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Highest Confidence</span>
                      <span className="font-medium">
                        {Math.max(...testResults.map(r => r.confidence))}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Lowest Confidence</span>
                      <span className="font-medium">
                        {Math.min(...testResults.map(r => r.confidence))}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Tokens Used</span>
                      <span className="font-medium">
                        {testResults.reduce((sum, r) => sum + r.tokensUsed, 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">High Confidence Queries</span>
                      <span className="font-medium">
                        {testResults.filter(r => r.confidence >= 80).length} / {testResults.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Medium Confidence Queries</span>
                      <span className="font-medium">
                        {testResults.filter(r => r.confidence >= 60 && r.confidence < 80).length} / {testResults.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Low Confidence Queries</span>
                      <span className="font-medium">
                        {testResults.filter(r => r.confidence < 60).length} / {testResults.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Sources per Query</span>
                      <span className="font-medium">
                        {testResults.length > 0 ? (testResults.reduce((sum, r) => sum + r.sources.length, 0) / testResults.length).toFixed(1) : 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {knowledgeBases.map(kb => (
                  <div key={kb.id} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-3">{kb.name}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Documents</span>
                        <span className="font-medium">{kb.documentCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Chunks</span>
                        <span className="font-medium">{kb.chunkCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Chunks/Doc</span>
                        <span className="font-medium">
                          {kb.documentCount > 0 ? (kb.chunkCount / kb.documentCount).toFixed(1) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">ID</span>
                        <span className="font-mono text-xs">{kb.id.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Alert */}
      {knowledgeBases.length > 0 && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>RAG System Ready!</strong> Knowledge bases created successfully. Upload documents and test queries to verify your RAG system is working with real data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}