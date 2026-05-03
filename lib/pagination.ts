export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(10, pageSize), 100),
  };
}

export function calculatePagination(params: {
  page: number;
  pageSize: number;
  totalRows: number;
}) {
  const totalPages = Math.ceil(params.totalRows / params.pageSize);
  const hasNextPage = params.page < totalPages;
  const hasPreviousPage = params.page > 1;

  return {
    page: params.page,
    pageSize: params.pageSize,
    totalRows: params.totalRows,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}

export function getOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

