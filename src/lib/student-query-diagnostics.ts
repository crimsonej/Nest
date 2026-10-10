type QueryError = { code?: string } | null

export function reportStudentQuery(
  request: string,
  filters: Record<string, string | number | boolean>,
  data: unknown,
  error: QueryError
) {
  if (error) {
    console.error('[student-data][temporary] Query failed', {
      request,
      filters,
      errorCode: error.code || 'unknown',
    })
    return
  }

  const rowCount = Array.isArray(data) ? data.length : data == null ? 0 : 1
  const diagnostic = {
    request,
    filters,
    rowCount,
  }

  if (rowCount > 0) {
    console.info('[student-data][temporary] Query completed', diagnostic)
    return
  }

  const empty = rowCount === 0
  if (empty) {
    console.warn('[student-data][temporary] Query returned no rows', {
      ...diagnostic,
    })
  }
}