import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import { datasetAPI } from '../../services/api.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

const ChartContainer = ({
  datasetId,
  columns,
  numericColumns,
  categoricalColumns
}) => {
  const [chartConfig, setChartConfig] = useState({
    chart_type: 'bar',
    x_axis: columns[0] || '',
    y_axis: numericColumns[0] || '',
    group_by: '',
    aggregate: 'count'
  });
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (chartConfig.x_axis) {
      generateChart();
    }
  }, [chartConfig, datasetId]);

  const generateChart = async () => {
    setIsLoading(true);
    try {
      const data = await datasetAPI.generateChart(datasetId, chartConfig);
      setChartData(data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to generate chart';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setChartConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
        }
      },
      title: {
        display: true,
        text: `${chartConfig.chart_type.charAt(0).toUpperCase() + chartConfig.chart_type.slice(1)} Chart - ${chartConfig.x_axis}${chartConfig.y_axis ? ` vs ${chartConfig.y_axis}` : ''}`,
        color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
      },
      tooltip: {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        titleColor: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
        bodyColor: document.documentElement.classList.contains('dark') ? '#d1d5db' : '#374151',
        borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb',
        borderWidth: 1
      }
    },
    scales: chartConfig.chart_type !== 'pie' ? {
      x: {
        title: {
          display: true,
          text: chartConfig.x_axis,
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
        }
      },
      y: {
        title: {
          display: true,
          text: chartConfig.y_axis || `${chartConfig.aggregate} of ${chartConfig.x_axis}`,
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        ticks: {
          color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
        }
      }
    } : undefined
  };

  const renderChart = () => {
    if (!chartData) return null;

    switch (chartConfig.chart_type) {
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />;
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />;
      case 'scatter':
        return <Scatter data={chartData} options={chartOptions} />;
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Data Visualization
        </h3>
        <button
          onClick={generateChart}
          disabled={isLoading}
          className="btn-primary disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Refresh Chart'}
        </button>
      </div>

      {/* Chart Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chart Type
          </label>
          <select
            value={chartConfig.chart_type}
            onChange={(e) => handleConfigChange('chart_type', e.target.value)}
            className="input-field"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="scatter">Scatter Plot</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            X-Axis
          </label>
          <select
            value={chartConfig.x_axis}
            onChange={(e) => handleConfigChange('x_axis', e.target.value)}
            className="input-field"
          >
            <option value="">Select column</option>
            {columns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </div>

        {chartConfig.chart_type !== 'pie' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Y-Axis
            </label>
            <select
              value={chartConfig.y_axis || ''}
              onChange={(e) => handleConfigChange('y_axis', e.target.value)}
              className="input-field"
            >
              <option value="">Auto (Count)</option>
              {numericColumns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group By
          </label>
          <select
            value={chartConfig.group_by || ''}
            onChange={(e) => handleConfigChange('group_by', e.target.value)}
            className="input-field"
          >
            <option value="">None</option>
            {categoricalColumns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </div>

        {chartConfig.y_axis && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Aggregate
            </label>
            <select
              value={chartConfig.aggregate}
              onChange={(e) => handleConfigChange('aggregate', e.target.value)}
              className="input-field"
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
        )}
      </div>

      {/* Chart Display */}
      <div className="h-96 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="loading-spinner h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
        ) : chartData ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Configure chart settings and click "Generate Chart" to visualize your data
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartContainer;