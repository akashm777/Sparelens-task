import React from 'react';
import { 
  DocumentTextIcon, 
  CalendarIcon, 
  TableCellsIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const DatasetCard = ({ 
  dataset, 
  onView, 
  onDelete, 
  canDelete = true 
}) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card-hover p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
              {dataset.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {dataset.filename}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onView(dataset)}
            className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors duration-200"
            title="View dataset"
          >
            <EyeIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </button>
          {canDelete && (
            <button
              onClick={() => onDelete(dataset)}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
              title="Delete dataset"
            >
              <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {dataset.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {dataset.description}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <TableCellsIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {dataset.row_count.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {dataset.columns.length} columns
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <CalendarIcon className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}
          </span>
        </div>
        <span>{formatFileSize(dataset.file_size)}</span>
      </div>
    </div>
  );
};

export default DatasetCard;