import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { datasetAPI } from '../../services/api.js';
import toast from 'react-hot-toast';

const FileUpload = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.name) {
        setUploadData(prev => ({
          ...prev,
          name: file.name.replace(/\.[^/.]+$/, '')
        }));
      }
    }
  }, [uploadData.name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.name.trim()) {
      toast.error('Please select a file and provide a name');
      return;
    }

    setIsUploading(true);
    try {
      await datasetAPI.upload(selectedFile, uploadData.name, uploadData.description);
      toast.success('Dataset uploaded successfully!');
      
      // Reset form
      setSelectedFile(null);
      setUploadData({ name: '', description: '' });
      onUploadSuccess();
    } catch (error) {
      const message = error.response?.data?.detail || 'Upload failed';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Upload Dataset
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload CSV or Excel files to start analyzing your data
        </p>
      </div>

      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-dark-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-dark-800'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-primary-600 dark:text-primary-400">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supports CSV, XLSX, XLS files
            </p>
          </div>
        )}
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DocumentIcon className="h-8 w-8 text-primary-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-full transition-colors duration-200"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dataset Name *
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Enter dataset name"
            value={uploadData.name}
            onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Optional)
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Describe your dataset..."
            value={uploadData.description}
            onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFile || !uploadData.name.trim() || isUploading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <div className="loading-spinner h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Uploading...
            </>
          ) : (
            'Upload Dataset'
          )}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;