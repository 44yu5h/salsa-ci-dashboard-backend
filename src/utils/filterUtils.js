export const parseFilterParams = (query, options = {}) => {
  const {
    defaultSortBy = 'started_at',
    defaultSortOrder = 'DESC',
    defaultLimit = 10,
  } = options;

  const {
    sortBy = defaultSortBy,
    sortOrder = defaultSortOrder,
    status,
    minDuration,
    maxDuration,
    startDate,
    endDate,
    page = '1',
    limit = String(defaultLimit),
  } = query;

  return {
    sortBy,
    sortOrder,
    statusFilter: status ? status.split(',') : [],
    minDuration: minDuration ? Number(minDuration) : undefined,
    maxDuration: maxDuration ? Number(maxDuration) : undefined,
    startDate,
    endDate,
    page: Number(page) || 1,
    limit: Number(limit) || defaultLimit,
  };
};

export const buildFilterConditions = (filters, params = [], options = {}) => {
  const { prefix = '' } = options;
  const whereConditions = [];

  // Status filter
  if (filters.statusFilter && filters.statusFilter.length > 0) {
    whereConditions.push(
      `${prefix}status IN (${Array(filters.statusFilter.length).fill('?').join(',')})`
    );
    params.push(...filters.statusFilter);
  }

  // Duration range filter
  if (filters.minDuration !== undefined) {
    whereConditions.push(`${prefix}duration >= ?`);
    params.push(filters.minDuration);
  }

  if (filters.maxDuration !== undefined) {
    whereConditions.push(`${prefix}duration <= ?`);
    params.push(filters.maxDuration);
  }

  // Date range filter
  if (filters.startDate) {
    whereConditions.push(`${prefix}started_at >= ?`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereConditions.push(`${prefix}started_at <= ?`);
    params.push(filters.endDate);
  }

  return { whereConditions, params };
};

export const buildOrderByClause = (
  sortBy,
  sortOrder,
  validColumns = [],
  defaultColumn = 'created_at',
  prefix = ''
) => {
  const actualSortBy = validColumns.includes(sortBy) ? sortBy : defaultColumn;
  const actualSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase())
    ? sortOrder.toUpperCase()
    : 'DESC';

  return `ORDER BY ${prefix}${actualSortBy} ${actualSortOrder}`;
};

export const buildPaginationParams = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    limitClause: 'LIMIT ? OFFSET ?',
    params: [Number(limit), Number(offset)],
  };
};

export const buildFilterableQuery = (
  baseQuery,
  countQuery,
  filters,
  baseParams = [],
  options = {}
) => {
  const {
    validSortColumns = ['created_at', 'updated_at'],
    defaultSortColumn = 'created_at',
    prefix = '',
    additionalWhereClause = '',
  } = options;

  let params = [...baseParams];

  // Build filter conditions
  const { whereConditions, params: updatedParams } = buildFilterConditions(
    filters,
    params,
    { prefix }
  );
  params = updatedParams;

  // Concat "WHERE" conditions
  let whereClause = '';
  if (whereConditions.length > 0 || additionalWhereClause) {
    whereClause = 'WHERE ';
    if (additionalWhereClause) {
      whereClause += additionalWhereClause;
      if (whereConditions.length > 0) {
        whereClause += ' AND ';
      }
    }
    whereClause += whereConditions.join(' AND ');
  }

  // Build "order by"
  const orderByClause = buildOrderByClause(
    filters.sortBy,
    filters.sortOrder,
    validSortColumns,
    defaultSortColumn,
    prefix
  );

  // Build "limit/offset"
  const { limitClause, params: paginationParams } = buildPaginationParams(
    filters.page,
    filters.limit
  );
  params.push(...paginationParams);

  // Arrange thw final queries
  const finalQuery = `${baseQuery} ${whereClause} ${orderByClause} ${limitClause}`;
  const finalCountQuery = `${countQuery} ${whereClause}`;
  const countParams = params.slice(0, params.length - 2); // Remove pagination params for total

  return {
    query: finalQuery,
    countQuery: finalCountQuery,
    params,
    countParams,
  };
};
