// src/lib/integrations/providers/google/GoogleSheetsIntegration.ts

import { sheets_v4, google } from 'googleapis'
import { GoogleIntegration, GoogleCredentials, GoogleConfig, handleGoogleAPIError, GoogleRateLimiter } from './GoogleIntegration'
import { IntegrationAction, IntegrationTrigger } from '../../base-integration'

export interface SpreadsheetInfo {
  id: string
  title: string
  url: string
  sheets: SheetInfo[]
  createdAt: Date
  updatedAt: Date
  owner: string
}

export interface SheetInfo {
  id: number
  title: string
  index: number
  gridProperties: {
    rowCount: number
    columnCount: number
  }
}

export interface CellData {
  row: number
  column: number
  value: any
  formattedValue: string
  formula?: string
  note?: string
}

export interface Range {
  spreadsheetId: string
  sheetName: string
  startRow: number
  startColumn: number
  endRow?: number
  endColumn?: number
}

export interface UpdateOptions {
  valueInputOption: 'RAW' | 'USER_ENTERED'
  includeValuesInResponse?: boolean
}

export class GoogleSheetsIntegration extends GoogleIntegration {
  private sheets: sheets_v4.Sheets
  private rateLimiter: GoogleRateLimiter

  constructor(config: GoogleConfig, credentials?: GoogleCredentials) {
    super(config, credentials)
    
    const auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )
    
    if (credentials) {
      auth.setCredentials(credentials)
    }

    this.sheets = google.sheets({ version: 'v4', auth })
    this.rateLimiter = new GoogleRateLimiter(100, 100000) // 100 requests per 100 seconds
  }

  getName(): string {
    return 'Google Sheets'
  }

  getDescription(): string {
    return 'Read, write, and manipulate Google Sheets data'
  }

  getActions(): IntegrationAction[] {
    return [
      {
        id: 'create_spreadsheet',
        name: 'Create Spreadsheet',
        description: 'Create a new Google Spreadsheet',
        requiresAuth: true,
        inputs: [
          { id: 'title', name: 'Title', type: 'string', required: true, description: 'Spreadsheet title' },
          { id: 'sheets', name: 'Sheets', type: 'array', required: false, description: 'Initial sheet names' }
        ],
        outputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', description: 'Created spreadsheet ID' },
          { id: 'url', name: 'URL', type: 'string', description: 'Spreadsheet URL' },
          { id: 'sheets', name: 'Sheets', type: 'array', description: 'Created sheets info' }
        ]
      },
      {
        id: 'read_range',
        name: 'Read Range',
        description: 'Read data from a specific range in a sheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'range', name: 'Range', type: 'string', required: true, description: 'Range (e.g., "Sheet1!A1:C10")' },
          { id: 'majorDimension', name: 'Major Dimension', type: 'string', required: false, description: 'ROWS or COLUMNS' }
        ],
        outputs: [
          { id: 'values', name: 'Values', type: 'array', description: 'Cell values as 2D array' },
          { id: 'range', name: 'Range', type: 'string', description: 'Actual range read' },
          { id: 'majorDimension', name: 'Major Dimension', type: 'string', description: 'Dimension used' }
        ]
      },
      {
        id: 'write_range',
        name: 'Write Range',
        description: 'Write data to a specific range in a sheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'range', name: 'Range', type: 'string', required: true, description: 'Range (e.g., "Sheet1!A1")' },
          { id: 'values', name: 'Values', type: 'array', required: true, description: '2D array of values to write' },
          { id: 'valueInputOption', name: 'Value Input Option', type: 'string', required: false, description: 'RAW or USER_ENTERED' }
        ],
        outputs: [
          { id: 'updatedRange', name: 'Updated Range', type: 'string', description: 'Range that was updated' },
          { id: 'updatedRows', name: 'Updated Rows', type: 'number', description: 'Number of rows updated' },
          { id: 'updatedColumns', name: 'Updated Columns', type: 'number', description: 'Number of columns updated' },
          { id: 'updatedCells', name: 'Updated Cells', type: 'number', description: 'Number of cells updated' }
        ]
      },
      {
        id: 'append_row',
        name: 'Append Row',
        description: 'Append a new row to the end of a sheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'sheetName', name: 'Sheet Name', type: 'string', required: true, description: 'Sheet name' },
          { id: 'values', name: 'Values', type: 'array', required: true, description: 'Row values to append' },
          { id: 'valueInputOption', name: 'Value Input Option', type: 'string', required: false, description: 'RAW or USER_ENTERED' }
        ],
        outputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', description: 'Spreadsheet ID' },
          { id: 'updatedRange', name: 'Updated Range', type: 'string', description: 'Range where row was added' },
          { id: 'updatedRows', name: 'Updated Rows', type: 'number', description: 'Number of rows added' }
        ]
      },
      {
        id: 'clear_range',
        name: 'Clear Range',
        description: 'Clear values from a range in a sheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'range', name: 'Range', type: 'string', required: true, description: 'Range to clear (e.g., "Sheet1!A1:C10")' }
        ],
        outputs: [
          { id: 'clearedRange', name: 'Cleared Range', type: 'string', description: 'Range that was cleared' },
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' }
        ]
      },
      {
        id: 'find_replace',
        name: 'Find and Replace',
        description: 'Find and replace text in a spreadsheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'find', name: 'Find', type: 'string', required: true, description: 'Text to find' },
          { id: 'replacement', name: 'Replacement', type: 'string', required: true, description: 'Replacement text' },
          { id: 'sheetId', name: 'Sheet ID', type: 'number', required: false, description: 'Specific sheet ID (optional)' },
          { id: 'matchCase', name: 'Match Case', type: 'boolean', required: false, description: 'Match case sensitivity' },
          { id: 'matchEntireCell', name: 'Match Entire Cell', type: 'boolean', required: false, description: 'Match entire cell content' }
        ],
        outputs: [
          { id: 'occurrencesChanged', name: 'Occurrences Changed', type: 'number', description: 'Number of replacements made' },
          { id: 'valuesChanged', name: 'Values Changed', type: 'number', description: 'Number of values changed' },
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' }
        ]
      },
      {
        id: 'get_spreadsheet_info',
        name: 'Get Spreadsheet Info',
        description: 'Get metadata about a spreadsheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' }
        ],
        outputs: [
          { id: 'title', name: 'Title', type: 'string', description: 'Spreadsheet title' },
          { id: 'sheets', name: 'Sheets', type: 'array', description: 'List of sheets' },
          { id: 'url', name: 'URL', type: 'string', description: 'Spreadsheet URL' },
          { id: 'createdAt', name: 'Created At', type: 'string', description: 'Creation timestamp' },
          { id: 'updatedAt', name: 'Updated At', type: 'string', description: 'Last update timestamp' }
        ]
      },
      {
        id: 'create_sheet',
        name: 'Create Sheet',
        description: 'Add a new sheet to an existing spreadsheet',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'title', name: 'Title', type: 'string', required: true, description: 'New sheet title' },
          { id: 'rowCount', name: 'Row Count', type: 'number', required: false, description: 'Number of rows (default: 1000)' },
          { id: 'columnCount', name: 'Column Count', type: 'number', required: false, description: 'Number of columns (default: 26)' }
        ],
        outputs: [
          { id: 'sheetId', name: 'Sheet ID', type: 'number', description: 'Created sheet ID' },
          { id: 'title', name: 'Title', type: 'string', description: 'Sheet title' },
          { id: 'index', name: 'Index', type: 'number', description: 'Sheet index' }
        ]
      },
      {
        id: 'format_cells',
        name: 'Format Cells',
        description: 'Apply formatting to a range of cells',
        requiresAuth: true,
        inputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', required: true, description: 'Spreadsheet ID' },
          { id: 'range', name: 'Range', type: 'string', required: true, description: 'Range to format' },
          { id: 'backgroundColor', name: 'Background Color', type: 'string', required: false, description: 'Background color (hex)' },
          { id: 'textColor', name: 'Text Color', type: 'string', required: false, description: 'Text color (hex)' },
          { id: 'bold', name: 'Bold', type: 'boolean', required: false, description: 'Bold text' },
          { id: 'italic', name: 'Italic', type: 'boolean', required: false, description: 'Italic text' },
          { id: 'fontSize', name: 'Font Size', type: 'number', required: false, description: 'Font size' }
        ],
        outputs: [
          { id: 'success', name: 'Success', type: 'boolean', description: 'Operation success status' },
          { id: 'formattedRange', name: 'Formatted Range', type: 'string', description: 'Range that was formatted' }
        ]
      }
    ]
  }

  getTriggers(): IntegrationTrigger[] {
    return [
      {
        id: 'row_added',
        name: 'Row Added',
        description: 'Triggers when a new row is added to a sheet',
        type: 'webhook',
        outputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', description: 'ID of the spreadsheet' },
          { id: 'sheetName', name: 'Sheet Name', type: 'string', description: 'Name of the sheet' },
          { id: 'row', name: 'Row', type: 'array', description: 'The newly added row data' },
          { id: 'rowIndex', name: 'Row Index', type: 'number', description: 'Index of the new row' }
        ]
      },
      {
        id: 'cell_updated',
        name: 'Cell Updated',
        description: 'Triggers when a cell value is changed',
        type: 'webhook',
        outputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', description: 'ID of the spreadsheet' },
          { id: 'sheetName', name: 'Sheet Name', type: 'string', description: 'Name of the sheet' },
          { id: 'cell', name: 'Cell', type: 'object', description: 'The updated cell data' },
          { id: 'oldValue', name: 'Old Value', type: 'string', description: 'Previous cell value' },
          { id: 'newValue', name: 'New Value', type: 'string', description: 'New cell value' }
        ]
      },
      {
        id: 'sheet_created',
        name: 'Sheet Created',
        description: 'Triggers when a new sheet is added to spreadsheet',
        type: 'webhook',
        outputs: [
          { id: 'spreadsheetId', name: 'Spreadsheet ID', type: 'string', description: 'ID of the spreadsheet' },
          { id: 'sheetId', name: 'Sheet ID', type: 'number', description: 'ID of the new sheet' },
          { id: 'sheetName', name: 'Sheet Name', type: 'string', description: 'Name of the new sheet' },
          { id: 'sheetIndex', name: 'Sheet Index', type: 'number', description: 'Index of the new sheet' }
        ]
      }
    ]
  }

  async executeAction(actionId: string, inputs: Record<string, any>): Promise<any> {
    await this.rateLimiter.checkRateLimit()
    
    try {
      switch (actionId) {
        case 'create_spreadsheet':
          return await this.createSpreadsheet(inputs.title, inputs.sheets)
        case 'read_range':
          return await this.readRange(inputs.spreadsheetId, inputs.range, inputs.majorDimension)
        case 'write_range':
          return await this.writeRange(inputs.spreadsheetId, inputs.range, inputs.values, inputs.valueInputOption)
        case 'append_row':
          return await this.appendRow(inputs.spreadsheetId, inputs.sheetName, inputs.values, inputs.valueInputOption)
        case 'clear_range':
          return await this.clearRange(inputs.spreadsheetId, inputs.range)
        case 'find_replace':
          return await this.findReplace({
            spreadsheetId: inputs.spreadsheetId,
            find: inputs.find,
            replacement: inputs.replacement,
            sheetId: inputs.sheetId,
            matchCase: inputs.matchCase,
            matchEntireCell: inputs.matchEntireCell
          })
        case 'get_spreadsheet_info':
          return await this.getSpreadsheetInfo(inputs.spreadsheetId)
        case 'create_sheet':
          return await this.createSheet(inputs.spreadsheetId, inputs.title, inputs.rowCount, inputs.columnCount)
        case 'format_cells':
          return await this.formatCells({
            spreadsheetId: inputs.spreadsheetId,
            range: inputs.range,
            backgroundColor: inputs.backgroundColor,
            textColor: inputs.textColor,
            bold: inputs.bold,
            italic: inputs.italic,
            fontSize: inputs.fontSize
          })
        default:
          throw new Error(`Unknown action: ${actionId}`)
      }
    } catch (error) {
      handleGoogleAPIError(error)
    }
  }

  // Create new spreadsheet
  async createSpreadsheet(title: string, sheetNames?: string[]): Promise<{
    spreadsheetId: string
    url: string
    sheets: SheetInfo[]
  }> {
    const sheets = sheetNames?.map((name, index) => ({
      properties: {
        title: name,
        index,
        gridProperties: {
          rowCount: 1000,
          columnCount: 26
        }
      }
    })) || [{
      properties: {
        title: 'Sheet1',
        index: 0,
        gridProperties: {
          rowCount: 1000,
          columnCount: 26
        }
      }
    }]

    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets
      }
    })

    const spreadsheet = response.data
    
    return {
      spreadsheetId: spreadsheet.spreadsheetId!,
      url: spreadsheet.spreadsheetUrl!,
      sheets: spreadsheet.sheets?.map(sheet => ({
        id: sheet.properties?.sheetId!,
        title: sheet.properties?.title!,
        index: sheet.properties?.index!,
        gridProperties: {
          rowCount: sheet.properties?.gridProperties?.rowCount!,
          columnCount: sheet.properties?.gridProperties?.columnCount!
        }
      })) || []
    }
  }

  // Read data from range
  async readRange(
    spreadsheetId: string, 
    range: string, 
    majorDimension: 'ROWS' | 'COLUMNS' = 'ROWS'
  ): Promise<{
    values: any[][]
    range: string
    majorDimension: string
  }> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension
    })

    return {
      values: response.data.values || [],
      range: response.data.range!,
      majorDimension: response.data.majorDimension!
    }
  }

  // Write data to range
  async writeRange(
    spreadsheetId: string,
    range: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<{
    updatedRange: string
    updatedRows: number
    updatedColumns: number
    updatedCells: number
  }> {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: {
        values
      }
    })

    return {
      updatedRange: response.data.updatedRange!,
      updatedRows: response.data.updatedRows!,
      updatedColumns: response.data.updatedColumns!,
      updatedCells: response.data.updatedCells!
    }
  }

  // Append row to sheet
  async appendRow(
    spreadsheetId: string,
    sheetName: string,
    values: any[],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<{
    spreadsheetId: string
    updatedRange: string
    updatedRows: number
  }> {
    const range = `${sheetName}!A:A` // Append to first available row
    
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values]
      }
    })

    return {
      spreadsheetId,
      updatedRange: response.data.updates?.updatedRange!,
      updatedRows: response.data.updates?.updatedRows!
    }
  }

  // Clear range
  async clearRange(spreadsheetId: string, range: string): Promise<{
    clearedRange: string
    success: boolean
  }> {
    const response = await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range
    })

    return {
      clearedRange: response.data.clearedRange!,
      success: true
    }
  }

  // Find and replace
  async findReplace(options: {
    spreadsheetId: string
    find: string
    replacement: string
    sheetId?: number
    matchCase?: boolean
    matchEntireCell?: boolean
  }): Promise<{
    occurrencesChanged: number
    valuesChanged: number
    success: boolean
  }> {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [{
          findReplace: {
            find: options.find,
            replacement: options.replacement,
            sheetId: options.sheetId,
            matchCase: options.matchCase || false,
            matchEntireCell: options.matchEntireCell || false,
            searchByRegex: false
          }
        }]
      }
    })

    const findReplaceResponse = response.data.replies?.[0]?.findReplace

    return {
      occurrencesChanged: findReplaceResponse?.occurrencesChanged || 0,
      valuesChanged: findReplaceResponse?.valuesChanged || 0,
      success: true
    }
  }

  // Get spreadsheet metadata
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId
    })

    const spreadsheet = response.data

    return {
      id: spreadsheet.spreadsheetId!,
      title: spreadsheet.properties?.title!,
      url: spreadsheet.spreadsheetUrl!,
      sheets: spreadsheet.sheets?.map(sheet => ({
        id: sheet.properties?.sheetId!,
        title: sheet.properties?.title!,
        index: sheet.properties?.index!,
        gridProperties: {
          rowCount: sheet.properties?.gridProperties?.rowCount!,
          columnCount: sheet.properties?.gridProperties?.columnCount!
        }
      })) || [],
      createdAt: new Date(), // Google Sheets API doesn't provide creation date
      updatedAt: new Date(), // Would need Drive API for actual dates
      owner: 'Current User' // Would need Drive API for actual owner
    }
  }

  // Create new sheet in existing spreadsheet
  async createSheet(
    spreadsheetId: string,
    title: string,
    rowCount = 1000,
    columnCount = 26
  ): Promise<{
    sheetId: number
    title: string
    index: number
  }> {
    const response = await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title,
              gridProperties: {
                rowCount,
                columnCount
              }
            }
          }
        }]
      }
    })

    const addedSheet = response.data.replies?.[0]?.addSheet?.properties

    return {
      sheetId: addedSheet?.sheetId!,
      title: addedSheet?.title!,
      index: addedSheet?.index!
    }
  }

  // Format cells
  async formatCells(options: {
    spreadsheetId: string
    range: string
    backgroundColor?: string
    textColor?: string
    bold?: boolean
    italic?: boolean
    fontSize?: number
  }): Promise<{
    success: boolean
    formattedRange: string
  }> {
    // Parse range to get sheet ID and cell range
    const rangeParts = options.range.split('!')
    const sheetName = rangeParts[0]
    
    // Get sheet ID from name
    const spreadsheetInfo = await this.getSpreadsheetInfo(options.spreadsheetId)
    const sheet = spreadsheetInfo.sheets.find(s => s.title === sheetName)
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    // Convert range to grid range
    const cellRange = rangeParts[1] || 'A1'
    const gridRange = this.parseRangeToGridRange(cellRange, sheet.id)

    // Build format request
    const format: any = {}
    
    if (options.backgroundColor) {
      format.backgroundColor = this.hexToRgb(options.backgroundColor)
    }
    
    if (options.textColor || options.bold || options.italic || options.fontSize) {
      format.textFormat = {}
      
      if (options.textColor) {
        format.textFormat.foregroundColor = this.hexToRgb(options.textColor)
      }
      
      if (options.bold !== undefined) {
        format.textFormat.bold = options.bold
      }
      
      if (options.italic !== undefined) {
        format.textFormat.italic = options.italic
      }
      
      if (options.fontSize) {
        format.textFormat.fontSize = options.fontSize
      }
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: options.spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: gridRange,
            cell: {
              userEnteredFormat: format
            },
            fields: Object.keys(format).map(key => 
              key === 'textFormat' ? 'userEnteredFormat.textFormat' : `userEnteredFormat.${key}`
            ).join(',')
          }
        }]
      }
    })

    return {
      success: true,
      formattedRange: options.range
    }
  }

  // Helper methods
  private parseRangeToGridRange(range: string, sheetId: number): any {
    // Simple A1 notation parser - for production, use a more robust parser
    const match = range.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/)
    
    if (!match) {
      throw new Error(`Invalid range format: ${range}`)
    }

    const startColumn = this.columnToIndex(match[1])
    const startRow = parseInt(match[2]) - 1
    const endColumn = match[3] ? this.columnToIndex(match[3]) : startColumn
    const endRow = match[4] ? parseInt(match[4]) - 1 : startRow

    return {
      sheetId,
      startRowIndex: startRow,
      endRowIndex: endRow + 1,
      startColumnIndex: startColumn,
      endColumnIndex: endColumn + 1
    }
  }

  private columnToIndex(column: string): number {
    let result = 0
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
    }
    return result - 1
  }

  private hexToRgb(hex: string): { red: number; green: number; blue: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    
    if (!result) {
      throw new Error(`Invalid hex color: ${hex}`)
    }

    return {
      red: parseInt(result[1], 16) / 255,
      green: parseInt(result[2], 16) / 255,
      blue: parseInt(result[3], 16) / 255
    }
  }
}