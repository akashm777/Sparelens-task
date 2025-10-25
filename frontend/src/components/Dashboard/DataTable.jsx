import React, { useState, useEffect } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const DataTable = ({ 
  data, 
  columns, 
  onQueryChange, 
  isLoading = false 
}) => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    sort_by: '',
    sort_order: 'asc',
    search: '',
    filters: []
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('contains');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onQueryChange(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSort = (column) => {
    setQuery(prev => ({
      ...prev,
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handleSearch = (search) => {
    setQuery(prev => ({
      ...prev,
      search,
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setQuery(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit) => {
    setQuery(prev => ({ ...prev, limit, page: 1 }));
  };

  const addFilter = () => {
    if (!filterColumn || !filterValue) return;

    const newFilter = {
      column: filterColumn,
      operator: filterOperator,
      value: filterValue
    };

    setQuery(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter],
      page: 1
    }));

    // Reset filter form
    setFilterColumn('');
    setFilterValue('');
  };

  const removeFilter = (index) => {
    setQuery(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
      page: 1
    }));
  };

  const getSortIcon = (column) => {
    if (query.sort_by !== column) return null;
    return query.sort_order === 'asc' ? (
      <ArrowUpIcon className="h-4 w-4" />
    ) : (
      <ArrowDownIcon className="h-4 w-4" />
    );
  };

  const renderPagination = () => {
    const { page, pages, total } = data.pagination;
    const startItem = (page - 1) * query.limit + 1;
    const endItem = Math.min(page * query.limit, total);

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-dark-700">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {startItem} to {endItem} of {total} results
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={query.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded px-2 py-1 bg-white dark:bg-dark-800"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {pages}
          </span>
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= pages}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Data Table
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search across all columns..."
            className="input-field pl-10"
            value={query.search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filterColumn}
                onChange={(e) => setFilterColumn(e.target.value)}
                className="input-field"
              >
                <option value="">Select column</option>
                {columns.map(column => (
                  <option key={column} value={column}>{column}</option>
                ))}
              </select>
              
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="input-field"
              >
                <option value="contains">Contains</option>
                <option value="eq">Equals</option>
                <option value="ne">Not equals</option>
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
                <option value="gte">Greater or equal</option>
                <option value="lte">Less or equal</option>
              </select>
              
              <input
                type="text"
                placeholder="Filter value"
                className="input-field"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
              
              <button
                onClick={addFilter}
                className="btn-primary"
                disabled={!filterColumn || !filterValue}
              >
                Add Filter
              </button>
            </div>

            {/* Active Filters */}
            {query.filters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {query.filters.map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200"
                  >
                    {filter.column} {filter.operator} "{filter.value}"
                    <button
                      onClick={() => removeFilter(index)}
                      className="ml-2 hover:text-primary-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
            <thead className="bg-gray-50 dark:bg-dark-800">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      {getSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
              {data.data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    >
                      {row[column] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && data.data.length > 0 && renderPagination()}
    </div>
  );
};

export default DataTable;