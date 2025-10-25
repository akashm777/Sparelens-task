import React, { useState, useEffect } from 'react';
import { datasetAPI } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import FileUpload from '../components/Dashboard/FileUpload.jsx';
import DatasetCard from '../components/Dashboard/DatasetCard.jsx';
import { 
  PlusIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const data = await datasetAPI.getAll();
      setDatasets(data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load datasets';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadDatasets();
  };

  const handleViewDataset = (dataset) => {
    window.location.href = `/dataset/${dataset.id}`;
  };

  const handleDeleteDataset = async (dataset) => {
    if (!window.confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
      return;
    }

    try {
      await datasetAPI.delete(dataset.id);
      toast.success('Dataset deleted successfully');
      loadDatasets();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete dataset';
      toast.error(message);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalRows = datasets.reduce((sum, dataset) => sum + dataset.row_count, 0);
  const totalColumns = datasets.reduce((sum, dataset) => sum + dataset.columns.length, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <SparklesIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    {getGreeting()}, {user?.full_name}!
                  </h1>
                  <p className="text-white/80 text-lg">
                    Ready to unlock insights from your data?
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-8 w-8 text-white/80" />
                    <div>
                      <p className="text-2xl font-bold">{datasets.length}</p>
                      <p className="text-white/80">Datasets</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <ChartBarIcon className="h-8 w-8 text-white/80" />
                    <div>
                      <p className="text-2xl font-bold">{totalRows.toLocaleString()}</p>
                      <p className="text-white/80">Total Rows</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <TrophyIcon className="h-8 w-8 text-white/80" />
                    <div>
                      <p className="text-2xl font-bold">{totalColumns}</p>
                      <p className="text-white/80">Total Columns</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <ChartBarIcon className="h-16 w-16 text-white/60" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Datasets
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and analyze your data collections
          </p>
        </div>
        
        <button
          onClick={() => setShowUpload(true)}
          className="btn-primary flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Upload Dataset</span>
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-bounce-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Upload New Dataset
              </h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>
      )}

      {/* Datasets Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gray-200 dark:bg-dark-700 p-2 rounded-lg">
                  <div className="h-6 w-6 bg-gray-300 dark:bg-dark-600 rounded"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded mb-4"></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-800 dark:to-dark-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No datasets yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Upload your first dataset to start creating beautiful visualizations and gaining insights from your data.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-primary inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Upload Your First Dataset</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((dataset, index) => (
            <div
              key={dataset.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <DatasetCard
                dataset={dataset}
                onView={handleViewDataset}
                onDelete={handleDeleteDataset}
                canDelete={user?.role === 'admin' || dataset.user_id === user?.id}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {datasets.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-800 dark:to-dark-700 rounded-2xl p-6 mt-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Data Analytics Journey
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {datasets.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Datasets Uploaded
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {totalRows.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Rows Processed
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {totalColumns}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Columns Analyzed
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {Math.round(totalRows / Math.max(datasets.length, 1)).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Rows/Dataset
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;