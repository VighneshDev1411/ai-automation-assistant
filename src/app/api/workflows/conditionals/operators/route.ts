import { NextResponse } from "next/server"

export async function GET() {
  try {
    const operators = {
      basic: [
        { value: 'equals', label: 'Equals', description: 'Check if values are exactly equal', example: 'field equals "value"' },
        { value: 'not_equals', label: 'Not Equals', description: 'Check if values are not equal', example: 'field not_equals "value"' },
        { value: 'contains', label: 'Contains', description: 'Check if string contains substring', example: 'field contains "substring"' },
        { value: 'not_contains', label: 'Not Contains', description: 'Check if string does not contain substring', example: 'field not_contains "substring"' },
        { value: 'starts_with', label: 'Starts With', description: 'Check if string starts with prefix', example: 'field starts_with "prefix"' },
        { value: 'ends_with', label: 'Ends With', description: 'Check if string ends with suffix', example: 'field ends_with "suffix"' },
        { value: 'matches_regex', label: 'Matches Regex', description: 'Check if string matches regular expression', example: 'field matches_regex "^[A-Z]+"' }
      ],
      numeric: [
        { value: 'greater_than', label: 'Greater Than', description: 'Check if number is greater than value', example: 'field > 10' },
        { value: 'greater_than_or_equal', label: 'Greater Than or Equal', description: 'Check if number is greater than or equal to value', example: 'field >= 10' },
        { value: 'less_than', label: 'Less Than', description: 'Check if number is less than value', example: 'field < 10' },
        { value: 'less_than_or_equal', label: 'Less Than or Equal', description: 'Check if number is less than or equal to value', example: 'field <= 10' },
        { value: 'between', label: 'Between', description: 'Check if number is between two values', example: 'field between [1, 10]' },
        { value: 'not_between', label: 'Not Between', description: 'Check if number is not between two values', example: 'field not_between [1, 10]' }
      ],
      array: [
        { value: 'in', label: 'In Array', description: 'Check if value exists in array', example: 'field in ["a", "b", "c"]' },
        { value: 'not_in', label: 'Not In Array', description: 'Check if value does not exist in array', example: 'field not_in ["a", "b", "c"]' },
        { value: 'includes_any', label: 'Includes Any', description: 'Check if array includes any of the values', example: 'field includes_any ["a", "b"]' },
        { value: 'includes_all', label: 'Includes All', description: 'Check if array includes all of the values', example: 'field includes_all ["a", "b"]' },
        { value: 'array_length_equals', label: 'Array Length Equals', description: 'Check if array length equals value', example: 'field.length == 5' },
        { value: 'array_length_greater_than', label: 'Array Length Greater Than', description: 'Check if array length is greater than value', example: 'field.length > 5' }
      ],
      existence: [
        { value: 'exists', label: 'Exists', description: 'Check if field exists and is not null/undefined', example: 'field exists' },
        { value: 'not_exists', label: 'Not Exists', description: 'Check if field does not exist or is null/undefined', example: 'field not_exists' },
        { value: 'is_null', label: 'Is Null', description: 'Check if field is null', example: 'field is null' },
        { value: 'is_not_null', label: 'Is Not Null', description: 'Check if field is not null', example: 'field is not null' },
        { value: 'is_empty', label: 'Is Empty', description: 'Check if field is empty (string, array, or object)', example: 'field is empty' },
        { value: 'is_not_empty', label: 'Is Not Empty', description: 'Check if field is not empty', example: 'field is not empty' }
      ],
      date: [
        { value: 'date_equals', label: 'Date Equals', description: 'Check if dates are equal', example: 'field date_equals "2024-01-01"' },
        { value: 'date_after', label: 'Date After', description: 'Check if date is after specified date', example: 'field date_after "2024-01-01"' },
        { value: 'date_before', label: 'Date Before', description: 'Check if date is before specified date', example: 'field date_before "2024-01-01"' },
        { value: 'date_between', label: 'Date Between', description: 'Check if date is between two dates', example: 'field date_between ["2024-01-01", "2024-12-31"]' },
        { value: 'date_is_today', label: 'Is Today', description: 'Check if date is today', example: 'field is today' },
        { value: 'date_is_yesterday', label: 'Is Yesterday', description: 'Check if date is yesterday', example: 'field is yesterday' },
        { value: 'date_is_this_week', label: 'Is This Week', description: 'Check if date is in current week', example: 'field is this week' },
        { value: 'date_is_this_month', label: 'Is This Month', description: 'Check if date is in current month', example: 'field is this month' },
        { value: 'date_is_this_year', label: 'Is This Year', description: 'Check if date is in current year', example: 'field is this year' }
      ],
      logical: [
        { value: 'and', label: 'AND', description: 'All conditions must be true', example: 'condition1 AND condition2' },
        { value: 'or', label: 'OR', description: 'At least one condition must be true', example: 'condition1 OR condition2' },
        { value: 'not', label: 'NOT', description: 'Condition must be false', example: 'NOT condition1' },
        { value: 'xor', label: 'XOR', description: 'Exactly one condition must be true', example: 'condition1 XOR condition2' }
      ],
      advanced: [
        { value: 'fuzzy_match', label: 'Fuzzy Match', description: 'Check similarity between strings', example: 'field fuzzy_match "similar text"' },
        { value: 'similarity_score', label: 'Similarity Score', description: 'Check if similarity score meets threshold', example: 'field similarity >= 0.8' },
        { value: 'json_path_exists', label: 'JSON Path Exists', description: 'Check if JSON path exists', example: 'field.path.exists' },
        { value: 'json_path_equals', label: 'JSON Path Equals', description: 'Check if JSON path value equals expected', example: 'field.path.value == "expected"' }
      ]
    }

    return NextResponse.json({
      success: true,
      operators,
      totalOperators: Object.values(operators).reduce((sum, category) => sum + category.length, 0)
    })

  } catch (error) {
    console.error('Error fetching operators:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operators' },
      { status: 500 }
    )
  }
}