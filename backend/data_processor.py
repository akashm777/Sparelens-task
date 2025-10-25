import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from io import BytesIO
import json
from bson import ObjectId
from datetime import datetime, timedelta
import re

class DataProcessor:
    @staticmethod
    def process_file(file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process uploaded file and extract data information"""
        try:
            # Determine file type and read accordingly
            if filename.endswith('.csv'):
                df = pd.read_csv(BytesIO(file_content))
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(BytesIO(file_content))
            else:
                raise ValueError("Unsupported file format")
            
            # Clean column names
            df.columns = df.columns.str.strip().str.replace(' ', '_')
            
            # Get basic info
            columns = df.columns.tolist()
            row_count = len(df)
            
            # Identify column types
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            categorical_columns = df.select_dtypes(include=['object']).columns.tolist()
            
            # Handle missing values
            missing_values = df.isnull().sum().to_dict()
            
            # Get data types
            data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
            
            # Convert DataFrame to records for storage
            records = df.fillna("").to_dict('records')
            
            return {
                "data": records,
                "columns": columns,
                "row_count": row_count,
                "numeric_columns": numeric_columns,
                "categorical_columns": categorical_columns,
                "missing_values": {k: int(v) for k, v in missing_values.items()},
                "data_types": data_types
            }
            
        except Exception as e:
            raise ValueError(f"Error processing file: {str(e)}")
    
    @staticmethod
    def apply_filters(data: List[Dict], filters: List[Dict]) -> List[Dict]:
        """Apply filters to data"""
        if not filters:
            return data
        
        filtered_data = data.copy()
        
        for filter_item in filters:
            column = filter_item["column"]
            operator = filter_item["operator"]
            value = filter_item["value"]
            
            if operator == "eq":
                filtered_data = [row for row in filtered_data if str(row.get(column, "")).lower() == str(value).lower()]
            elif operator == "ne":
                filtered_data = [row for row in filtered_data if str(row.get(column, "")).lower() != str(value).lower()]
            elif operator == "contains":
                filtered_data = [row for row in filtered_data if str(value).lower() in str(row.get(column, "")).lower()]
            elif operator == "gt":
                filtered_data = [row for row in filtered_data if DataProcessor._safe_numeric_compare(row.get(column), value, ">")]
            elif operator == "lt":
                filtered_data = [row for row in filtered_data if DataProcessor._safe_numeric_compare(row.get(column), value, "<")]
            elif operator == "gte":
                filtered_data = [row for row in filtered_data if DataProcessor._safe_numeric_compare(row.get(column), value, ">=")]
            elif operator == "lte":
                filtered_data = [row for row in filtered_data if DataProcessor._safe_numeric_compare(row.get(column), value, "<=")]
            elif operator == "in":
                if isinstance(value, list):
                    filtered_data = [row for row in filtered_data if str(row.get(column, "")) in [str(v) for v in value]]
        
        return filtered_data
    
    @staticmethod
    def _safe_numeric_compare(val1: Any, val2: Any, operator: str) -> bool:
        """Safely compare numeric values"""
        try:
            num1 = float(val1) if val1 != "" else 0
            num2 = float(val2)
            
            if operator == ">":
                return num1 > num2
            elif operator == "<":
                return num1 < num2
            elif operator == ">=":
                return num1 >= num2
            elif operator == "<=":
                return num1 <= num2
        except (ValueError, TypeError):
            return False
        return False
    
    @staticmethod
    def search_data(data: List[Dict], search_term: str) -> List[Dict]:
        """Search data across all columns"""
        if not search_term:
            return data
        
        search_term = search_term.lower()
        return [
            row for row in data 
            if any(search_term in str(value).lower() for value in row.values())
        ]
    
    @staticmethod
    def sort_data(data: List[Dict], sort_by: str, sort_order: str = "asc") -> List[Dict]:
        """Sort data by column"""
        if not sort_by or sort_by not in (data[0].keys() if data else []):
            return data
        
        reverse = sort_order == "desc"
        
        try:
            # Try numeric sort first
            return sorted(data, key=lambda x: float(x.get(sort_by, 0) or 0), reverse=reverse)
        except (ValueError, TypeError):
            # Fall back to string sort
            return sorted(data, key=lambda x: str(x.get(sort_by, "")), reverse=reverse)
    
    @staticmethod
    def paginate_data(data: List[Dict], page: int, limit: int) -> Dict[str, Any]:
        """Paginate data"""
        total = len(data)
        start = (page - 1) * limit
        end = start + limit
        
        return {
            "data": data[start:end],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    
    @staticmethod
    def generate_chart_data(data: List[Dict], config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate chart data based on configuration
    TODO: Add more chart types in future versions
    NOTE: This was tricky to implement with pandas groupby"""
        if not data:
            return {"labels": [], "datasets": []}
        
        chart_type = config.get("chart_type", "bar")
        x_axis = config.get("x_axis")
        y_axis = config.get("y_axis")
        group_by = config.get("group_by")
        aggregate = config.get("aggregate", "count")
        
        try:
            df = pd.DataFrame(data)
            
            # Check if columns exist - learned this the hard way during testing!
            if x_axis and x_axis not in df.columns:
                raise ValueError(f"Column '{x_axis}' not found in data")
            if y_axis and y_axis not in df.columns:
                raise ValueError(f"Column '{y_axis}' not found in data")
            if group_by and group_by not in df.columns:
                raise ValueError(f"Column '{group_by}' not found in data")
                
        except Exception as e:
            raise ValueError(f"Error processing data: {str(e)}")
        
        if chart_type == "pie":
            # For pie charts, just count how many times each value appears
            value_counts = df[x_axis].value_counts()
            return {
                "labels": value_counts.index.tolist(),
                "datasets": [{
                    "data": value_counts.values.tolist(),
                    "backgroundColor": DataProcessor._generate_colors(len(value_counts))
                }]
            }
        
        elif chart_type in ["bar", "line"]:
            if group_by:
                # Grouped data
                grouped = df.groupby([x_axis, group_by])
                if aggregate == "count":
                    result = grouped.size().unstack(fill_value=0)
                else:
                    result = grouped[y_axis].agg(aggregate).unstack(fill_value=0)
                
                colors = DataProcessor._generate_colors(len(result.columns))
                return {
                    "labels": result.index.tolist(),
                    "datasets": [
                        {
                            "label": str(col),
                            "data": result[col].tolist(),
                            "backgroundColor": colors[i] if chart_type == "bar" else colors[i] + "20",
                            "borderColor": colors[i],
                            "borderWidth": 2,
                            "fill": chart_type == "line"
                        }
                        for i, col in enumerate(result.columns)
                    ]
                }
            else:
                # Simple aggregation
                if aggregate == "count":
                    result = df[x_axis].value_counts().sort_index()
                else:
                    result = df.groupby(x_axis)[y_axis].agg(aggregate)
                
                colors = DataProcessor._generate_colors(len(result))
                return {
                    "labels": result.index.tolist(),
                    "datasets": [{
                        "label": f"{aggregate.title()} of {y_axis or 'Count'}",
                        "data": result.values.tolist(),
                        "backgroundColor": colors if chart_type == "bar" else [colors[0] + "20"] * len(result),
                        "borderColor": colors[0] if chart_type == "line" else colors,
                        "borderWidth": 2,
                        "fill": chart_type == "line"
                    }]
                }
        
        elif chart_type == "scatter":
            # For scatter plots, we need x and y numeric values
            if not y_axis or x_axis not in df.columns or y_axis not in df.columns:
                return {"labels": [], "datasets": []}
            
            # Remove any rows with missing data for scatter plots
            scatter_df = df[[x_axis, y_axis]].copy()
            scatter_df = scatter_df.dropna()
            
            # Convert to numeric if possible
            try:
                scatter_df[x_axis] = pd.to_numeric(scatter_df[x_axis], errors='coerce')
                scatter_df[y_axis] = pd.to_numeric(scatter_df[y_axis], errors='coerce')
                scatter_df = scatter_df.dropna()
            except:
                return {"labels": [], "datasets": []}
            
            if len(scatter_df) == 0:
                return {"labels": [], "datasets": []}
            
            scatter_data = [
                {"x": float(row[x_axis]), "y": float(row[y_axis])} 
                for _, row in scatter_df.iterrows()
            ]
            
            color = DataProcessor._generate_colors(1)[0]
            return {
                "labels": [],
                "datasets": [{
                    "label": f"{y_axis} vs {x_axis}",
                    "data": scatter_data,
                    "backgroundColor": color + "60",
                    "borderColor": color,
                    "borderWidth": 2
                }]
            }
        
        return {"labels": [], "datasets": []}
    
    @staticmethod
    def _generate_colors(count: int) -> List[str]:
        """Generate colors for charts"""
        colors = [
            "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
            "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6366F1",
            "#F43F5E", "#14B8A6", "#F97316", "#8B5CF6", "#06B6D4"
        ]
        if count == 1:
            return [colors[0]]
        return (colors * ((count // len(colors)) + 1))[:count]
    
    @staticmethod
    def detect_data_domain(columns: List[str], data: List[Dict]) -> str:
        """Detect the domain/type of data based on column names and content"""
        columns_lower = [col.lower() for col in columns]
        
        # E-commerce indicators
        ecommerce_indicators = ['revenue', 'price', 'product', 'customer', 'order', 'sales', 'quantity', 'payment', 'rating', 'discount']
        if any(indicator in ' '.join(columns_lower) for indicator in ecommerce_indicators):
            return 'ecommerce'
        
        # Financial indicators
        financial_indicators = ['portfolio', 'investment', 'return', 'dividend', 'stock', 'bond', 'asset', 'balance']
        if any(indicator in ' '.join(columns_lower) for indicator in financial_indicators):
            return 'financial'
        
        # HR/Employee indicators
        hr_indicators = ['employee', 'performance', 'salary', 'department', 'manager', 'hire', 'evaluation']
        if any(indicator in ' '.join(columns_lower) for indicator in hr_indicators):
            return 'hr'
        
        return 'general'
    
    @staticmethod
    def generate_domain_insights(data: List[Dict], columns: List[str], domain: str) -> Dict[str, Any]:
        """Generate domain-specific insights and analytics"""
        if not data:
            return {}
        
        df = pd.DataFrame(data)
        insights = {}
        
        if domain == 'ecommerce':
            insights = DataProcessor._generate_ecommerce_insights(df, columns)
        elif domain == 'financial':
            insights = DataProcessor._generate_financial_insights(df, columns)
        elif domain == 'hr':
            insights = DataProcessor._generate_hr_insights(df, columns)
        else:
            insights = DataProcessor._generate_general_insights(df, columns)
        
        return insights
    
    @staticmethod
    def _generate_ecommerce_insights(df: pd.DataFrame, columns: List[str]) -> Dict[str, Any]:
        """Generate e-commerce specific insights"""
        insights = {
            "domain": "E-commerce Analytics",
            "key_metrics": {},
            "trends": {},
            "recommendations": []
        }
        
        columns_lower = [col.lower() for col in columns]
        
        # Revenue Analysis
        revenue_col = DataProcessor._find_column(columns, ['revenue', 'total', 'amount'])
        if revenue_col:
            total_revenue = df[revenue_col].sum()
            avg_order_value = df[revenue_col].mean()
            insights["key_metrics"]["total_revenue"] = f"${total_revenue:,.2f}"
            insights["key_metrics"]["average_order_value"] = f"${avg_order_value:.2f}"
        
        # Product Analysis
        product_col = DataProcessor._find_column(columns, ['product', 'item'])
        category_col = DataProcessor._find_column(columns, ['category', 'type'])
        
        if product_col:
            top_products = df[product_col].value_counts().head(5)
            insights["key_metrics"]["top_products"] = top_products.to_dict()
        
        if category_col:
            category_performance = df.groupby(category_col)[revenue_col].sum().sort_values(ascending=False) if revenue_col else df[category_col].value_counts()
            insights["key_metrics"]["category_performance"] = category_performance.head(5).to_dict()
        
        # Customer Analysis
        customer_col = DataProcessor._find_column(columns, ['customer', 'user'])
        age_col = DataProcessor._find_column(columns, ['age'])
        gender_col = DataProcessor._find_column(columns, ['gender', 'sex'])
        location_col = DataProcessor._find_column(columns, ['location', 'city', 'state', 'region'])
        
        if age_col:
            avg_customer_age = df[age_col].mean()
            insights["key_metrics"]["average_customer_age"] = f"{avg_customer_age:.1f} years"
        
        if gender_col:
            gender_dist = df[gender_col].value_counts()
            insights["key_metrics"]["customer_gender_distribution"] = gender_dist.to_dict()
        
        if location_col:
            top_locations = df[location_col].value_counts().head(5)
            insights["key_metrics"]["top_locations"] = top_locations.to_dict()
        
        # Time-based Analysis
        date_col = DataProcessor._find_column(columns, ['date', 'time', 'created'])
        if date_col and revenue_col:
            try:
                df[date_col] = pd.to_datetime(df[date_col])
                monthly_revenue = df.groupby(df[date_col].dt.to_period('M'))[revenue_col].sum()
                insights["trends"]["monthly_revenue"] = {str(k): v for k, v in monthly_revenue.to_dict().items()}
                
                # Growth rate
                if len(monthly_revenue) > 1:
                    growth_rate = ((monthly_revenue.iloc[-1] - monthly_revenue.iloc[0]) / monthly_revenue.iloc[0]) * 100
                    insights["key_metrics"]["revenue_growth_rate"] = f"{growth_rate:.1f}%"
            except:
                pass
        
        # Rating Analysis
        rating_col = DataProcessor._find_column(columns, ['rating', 'score', 'review'])
        if rating_col:
            avg_rating = df[rating_col].mean()
            insights["key_metrics"]["average_rating"] = f"{avg_rating:.2f}/5"
        
        # Payment Method Analysis
        payment_col = DataProcessor._find_column(columns, ['payment', 'method'])
        if payment_col:
            payment_methods = df[payment_col].value_counts()
            insights["key_metrics"]["payment_methods"] = payment_methods.to_dict()
        
        # Generate recommendations
        insights["recommendations"] = [
            "Focus on top-performing product categories for inventory planning",
            "Analyze customer demographics for targeted marketing campaigns",
            "Monitor monthly revenue trends for seasonal patterns",
            "Optimize payment methods based on customer preferences"
        ]
        
        return insights
    
    @staticmethod
    def _generate_financial_insights(df: pd.DataFrame, columns: List[str]) -> Dict[str, Any]:
        """Generate financial portfolio insights"""
        insights = {
            "domain": "Financial Portfolio Analytics",
            "key_metrics": {},
            "trends": {},
            "recommendations": []
        }
        
        # Portfolio value analysis
        value_col = DataProcessor._find_column(columns, ['value', 'amount', 'balance'])
        if value_col:
            total_value = df[value_col].sum()
            insights["key_metrics"]["total_portfolio_value"] = f"${total_value:,.2f}"
        
        # Asset allocation
        asset_col = DataProcessor._find_column(columns, ['asset', 'type', 'category'])
        if asset_col and value_col:
            allocation = df.groupby(asset_col)[value_col].sum()
            insights["key_metrics"]["asset_allocation"] = allocation.to_dict()
        
        # Return analysis
        return_col = DataProcessor._find_column(columns, ['return', 'yield', 'performance'])
        if return_col:
            avg_return = df[return_col].mean()
            insights["key_metrics"]["average_return"] = f"{avg_return:.2f}%"
        
        insights["recommendations"] = [
            "Diversify portfolio across different asset classes",
            "Monitor return performance regularly",
            "Rebalance portfolio based on risk tolerance"
        ]
        
        return insights
    
    @staticmethod
    def _generate_hr_insights(df: pd.DataFrame, columns: List[str]) -> Dict[str, Any]:
        """Generate HR/Employee insights"""
        insights = {
            "domain": "Human Resources Analytics",
            "key_metrics": {},
            "trends": {},
            "recommendations": []
        }
        
        # Employee count
        insights["key_metrics"]["total_employees"] = len(df)
        
        # Department analysis
        dept_col = DataProcessor._find_column(columns, ['department', 'team', 'division'])
        if dept_col:
            dept_dist = df[dept_col].value_counts()
            insights["key_metrics"]["department_distribution"] = dept_dist.to_dict()
        
        # Performance analysis
        perf_col = DataProcessor._find_column(columns, ['performance', 'rating', 'score'])
        if perf_col:
            avg_performance = df[perf_col].mean()
            insights["key_metrics"]["average_performance"] = f"{avg_performance:.2f}"
        
        # Salary analysis
        salary_col = DataProcessor._find_column(columns, ['salary', 'compensation', 'pay'])
        if salary_col:
            avg_salary = df[salary_col].mean()
            insights["key_metrics"]["average_salary"] = f"${avg_salary:,.2f}"
        
        insights["recommendations"] = [
            "Focus on employee development programs",
            "Analyze performance trends by department",
            "Review compensation structures for fairness"
        ]
        
        return insights
    
    @staticmethod
    def _generate_general_insights(df: pd.DataFrame, columns: List[str]) -> Dict[str, Any]:
        """Generate general data insights"""
        insights = {
            "domain": "General Data Analytics",
            "key_metrics": {},
            "trends": {},
            "recommendations": []
        }
        
        # Basic statistics
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            insights["key_metrics"]["numeric_columns"] = len(numeric_cols)
            for col in numeric_cols[:3]:  # Top 3 numeric columns
                insights["key_metrics"][f"{col}_average"] = f"{df[col].mean():.2f}"
        
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            insights["key_metrics"]["categorical_columns"] = len(categorical_cols)
        
        insights["recommendations"] = [
            "Explore relationships between numeric variables",
            "Analyze categorical data distributions",
            "Look for patterns and outliers in the data"
        ]
        
        return insights
    
    @staticmethod
    def _find_column(columns: List[str], keywords: List[str]) -> Optional[str]:
        """Find column that matches any of the keywords"""
        columns_lower = [col.lower() for col in columns]
        for keyword in keywords:
            for i, col in enumerate(columns_lower):
                if keyword in col:
                    return columns[i]
        return None
    
    @staticmethod
    def get_suggested_charts(domain: str, columns: List[str]) -> List[Dict[str, Any]]:
        """Get suggested chart configurations based on data domain"""
        suggestions = []
        
        if domain == 'ecommerce':
            # Revenue trends over time
            date_col = DataProcessor._find_column(columns, ['date', 'time'])
            revenue_col = DataProcessor._find_column(columns, ['revenue', 'total', 'amount'])
            if date_col and revenue_col:
                suggestions.append({
                    "title": "Revenue Trends Over Time",
                    "chart_type": "line",
                    "x_axis": date_col,
                    "y_axis": revenue_col,
                    "aggregate": "sum"
                })
            
            # Product category performance
            category_col = DataProcessor._find_column(columns, ['category', 'type'])
            if category_col and revenue_col:
                suggestions.append({
                    "title": "Revenue by Product Category",
                    "chart_type": "bar",
                    "x_axis": category_col,
                    "y_axis": revenue_col,
                    "aggregate": "sum"
                })
            
            # Customer demographics
            location_col = DataProcessor._find_column(columns, ['location', 'city', 'state'])
            if location_col:
                suggestions.append({
                    "title": "Customer Distribution by Location",
                    "chart_type": "pie",
                    "x_axis": location_col
                })
            
            # Payment method preferences
            payment_col = DataProcessor._find_column(columns, ['payment', 'method'])
            if payment_col:
                suggestions.append({
                    "title": "Payment Method Distribution",
                    "chart_type": "pie",
                    "x_axis": payment_col
                })
        
        elif domain == 'financial':
            # Asset allocation
            asset_col = DataProcessor._find_column(columns, ['asset', 'type', 'category'])
            value_col = DataProcessor._find_column(columns, ['value', 'amount'])
            if asset_col and value_col:
                suggestions.append({
                    "title": "Portfolio Asset Allocation",
                    "chart_type": "pie",
                    "x_axis": asset_col,
                    "y_axis": value_col,
                    "aggregate": "sum"
                })
        
        elif domain == 'hr':
            # Department distribution
            dept_col = DataProcessor._find_column(columns, ['department', 'team'])
            if dept_col:
                suggestions.append({
                    "title": "Employee Distribution by Department",
                    "chart_type": "bar",
                    "x_axis": dept_col
                })
        
        return suggestions