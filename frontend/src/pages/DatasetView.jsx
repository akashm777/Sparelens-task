import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { datasetAPI } from '../services/api.js';
import DataTable from '../components/Dashboard/DataTable.jsx';
import ChartContainer from '../components/Charts/ChartContainer.jsx';
import { 
  ArrowLeftIcon,
  ChartBarIcon,
  TableCellsIcon,
  InformationCircleIcon,
  EyeIcon,
  ChartPieIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const DatasetView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [dataset, setDataset] = useState(null);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const loadAllData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([
            loadDataset(),
            loadStats()
          ]);
          await loadData({
            page: 1,
            limit: 10,
            sort_by: '',
            sort_order: 'asc',
            search: '',
            filters: []
          });
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAllData();
    }
  }, [id]);

  const loadDataset = async () => {
    try {
      const datasets = await datasetAPI.getAll();
      const currentDataset = datasets.find(d => d.id === id);
      if (currentDataset) {
        setDataset(currentDataset);
      } else {
        toast.error('Dataset not found');
        navigate('/');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load dataset';
      toast.error(message);
      navigate('/');
    }
  };

  const loadStats = async () => {
    if (!id) return;
    try {
      const statsData = await datasetAPI.getStats(id);
      setStats(statsData);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load stats';
      toast.error(message);
    }
  };



  const loadData = useCallback(async (query) => {
    if (!id) return;
    setIsDataLoading(true);
    try {
      const result = await datasetAPI.getData(id, query);
      setData(result);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load data';
      toast.error(message);
    } finally {
      setIsDataLoading(false);
    }
  }, [id]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDataTypeColor = (type) => {
    if (type.includes('int') || type.includes('float')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    if (type.includes('object') || type.includes('string')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (type.includes('datetime')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 dark:bg-dark-700 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-dark-700 rounded mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-dark-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isLoading && (!dataset || !stats)) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">
          <InformationCircleIcon className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Dataset not found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The dataset you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: EyeIcon },
    { id: 'table', name: 'Data Table', icon: TableCellsIcon },
    { id: 'charts', name: 'Visualizations', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-3 rounded-xl">
            <DocumentChartBarIcon className="h-8 w-8 text-white" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {dataset.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {dataset.description || dataset.filename}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Rows</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {stats.total_rows.toLocaleString()}
              </p>
            </div>
            <TableCellsIcon className="h-12 w-12 text-blue-500 dark:text-blue-400" />
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Columns</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {stats.total_columns}
              </p>
            </div>
            <ChartBarIcon className="h-12 w-12 text-green-500 dark:text-green-400" />
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Numeric Columns</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {stats.numeric_columns.length}
              </p>
            </div>
            <ChartPieIcon className="h-12 w-12 text-purple-500 dark:text-purple-400" />
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">File Size</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {formatFileSize(dataset.file_size)}
              </p>
            </div>
            <InformationCircleIcon className="h-12 w-12 text-orange-500 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-slide-up">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="card p-6">
              <div className="flex items-center space-x-3 mb-6">
                <DocumentChartBarIcon className="h-6 w-6 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Dataset Overview
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{stats.total_rows}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.total_columns}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Columns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.numeric_columns.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Numeric</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.categorical_columns.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Categorical</div>
                </div>
              </div>
            </div>

            {/* Column Information */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Column Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Data Types
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(stats.data_types).map(([column, type]) => (
                      <div key={column} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {column}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDataTypeColor(type)}`}>
                          {type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Missing Values
                  </h4>
                  <div className="space-y-3">
                    {stats.missing_values && typeof stats.missing_values === 'object' ? 
                      Object.entries(stats.missing_values).map(([column, count]) => (
                        <div key={column} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {column}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {count}
                            </span>
                            <div className="w-20 bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  count === 0 ? 'bg-green-500' : count < stats.total_rows * 0.1 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min((count / stats.total_rows) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )) : 
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        No missing values data available
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Column Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Numeric Columns ({stats.numeric_columns.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.numeric_columns.map((column) => (
                    <span
                      key={column}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Categorical Columns ({stats.categorical_columns.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.categorical_columns.map((column) => (
                    <span
                      key={column}
                      className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'table' && data && (
          <DataTable
            data={data}
            columns={dataset.columns}
            onQueryChange={loadData}
            isLoading={isDataLoading}
          />
        )}

        {activeTab === 'charts' && (
          <ChartContainer
            datasetId={dataset.id}
            columns={dataset.columns}
            numericColumns={stats.numeric_columns}
            categoricalColumns={stats.categorical_columns}
          />
        )}
      </div>
    </div>
  );
};

export default DatasetView;