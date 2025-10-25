from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from bson import ObjectId

from config import settings
from database import connect_to_mongo, close_mongo_connection, get_database
from models import *
from auth import *
from data_processor import DataProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="DataViz Pro API",
    description="Advanced Data Visualization Dashboard API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "DataViz Pro API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Favicon endpoint to prevent 500 errors
@app.get("/favicon.ico")
async def favicon():
    return {"message": "No favicon"}

# Clear users endpoint for testing (remove in production)
@app.delete("/clear-users")
async def clear_users():
    db = get_database()
    result = db.users.delete_many({})
    return {"message": f"Cleared {result.deleted_count} users"}

# Authentication endpoints
@app.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Check if user exists
    if db.users.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "hashed_password": get_password_hash(user_data.password),
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create access token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    user_response = UserResponse(
        id=str(result.inserted_id),
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        role=user_dict["role"],
        created_at=user_dict["created_at"]
    )
    
    return Token(access_token=access_token, user=user_response)

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    db = get_database()
    
    user = db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return Token(access_token=access_token, user=user_response)

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

# Dataset endpoints
@app.post("/datasets", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: UserResponse = Depends(get_current_user)
):
    # Validate file type
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process file
        processed_data = DataProcessor.process_file(content, file.filename)
        
        # Detect data domain and generate insights
        domain = DataProcessor.detect_data_domain(processed_data["columns"], processed_data["data"])
        insights = DataProcessor.generate_domain_insights(processed_data["data"], processed_data["columns"], domain)
        suggested_charts = DataProcessor.get_suggested_charts(domain, processed_data["columns"])
        
        # Save to database
        db = get_database()
        dataset_dict = {
            "name": name,
            "description": description,
            "filename": file.filename,
            "file_size": len(content),
            "columns": processed_data["columns"],
            "row_count": processed_data["row_count"],
            "numeric_columns": processed_data["numeric_columns"],
            "categorical_columns": processed_data["categorical_columns"],
            "missing_values": processed_data["missing_values"],
            "data_types": processed_data["data_types"],
            "data": processed_data["data"],
            "domain": domain,
            "insights": insights,
            "suggested_charts": suggested_charts,
            "user_id": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.datasets.insert_one(dataset_dict)
        
        return DatasetResponse(
            id=str(result.inserted_id),
            name=name,
            description=description,
            filename=file.filename,
            file_size=len(content),
            columns=processed_data["columns"],
            row_count=processed_data["row_count"],
            user_id=current_user.id,
            created_at=dataset_dict["created_at"],
            updated_at=dataset_dict["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing file: {str(e)}"
        )

@app.get("/datasets", response_model=List[DatasetResponse])
async def get_datasets(current_user: UserResponse = Depends(get_current_user)):
    db = get_database()
    
    # Admin can see all datasets, members only their own
    query = {} if current_user.role == UserRole.ADMIN else {"user_id": current_user.id}
    
    datasets = list(db.datasets.find(query).sort("created_at", -1))
    
    return [
        DatasetResponse(
            id=str(dataset["_id"]),
            name=dataset["name"],
            description=dataset.get("description"),
            filename=dataset["filename"],
            file_size=dataset["file_size"],
            columns=dataset["columns"],
            row_count=dataset["row_count"],
            user_id=dataset["user_id"],
            created_at=dataset["created_at"],
            updated_at=dataset["updated_at"]
        )
        for dataset in datasets
    ]

@app.get("/datasets/{dataset_id}/stats", response_model=DataStats)
async def get_dataset_stats(
    dataset_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    
    try:
        dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Check permissions
        if current_user.role != UserRole.ADMIN and dataset["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return DataStats(
            total_rows=dataset["row_count"],
            total_columns=len(dataset["columns"]),
            numeric_columns=dataset["numeric_columns"],
            categorical_columns=dataset["categorical_columns"],
            missing_values=dataset["missing_values"],
            data_types=dataset["data_types"]
        )
        
    except Exception as e:
        logger.error(f"Error getting dataset stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/datasets/{dataset_id}/insights")
async def get_dataset_insights(
    dataset_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    
    try:
        dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Check permissions
        if current_user.role != UserRole.ADMIN and dataset["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Return insights and suggested charts
        return {
            "domain": dataset.get("domain", "general"),
            "insights": dataset.get("insights", {}),
            "suggested_charts": dataset.get("suggested_charts", [])
        }
        
    except Exception as e:
        logger.error(f"Error getting dataset insights: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/datasets/{dataset_id}/data")
async def get_dataset_data(
    dataset_id: str,
    query: DataQuery,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    
    try:
        dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Check permissions
        if current_user.role != UserRole.ADMIN and dataset["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        data = dataset["data"]
        
        # Apply filters
        if query.filters:
            filter_dicts = [filter_item.dict() for filter_item in query.filters]
            data = DataProcessor.apply_filters(data, filter_dicts)
        
        # Apply search
        if query.search:
            data = DataProcessor.search_data(data, query.search)
        
        # Apply sorting
        if query.sort_by:
            data = DataProcessor.sort_data(data, query.sort_by, query.sort_order)
        
        # Apply pagination
        result = DataProcessor.paginate_data(data, query.page, query.limit)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting dataset data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/datasets/{dataset_id}/chart")
async def generate_chart_data(
    dataset_id: str,
    config: ChartConfig,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    
    try:
        dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Check permissions
        if current_user.role != UserRole.ADMIN and dataset["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        chart_data = DataProcessor.generate_chart_data(dataset["data"], config.dict())
        
        return chart_data
        
    except Exception as e:
        logger.error(f"Error generating chart data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating chart: {str(e)}")

@app.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    db = get_database()
    
    try:
        dataset = db.datasets.find_one({"_id": ObjectId(dataset_id)})
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Check permissions
        if current_user.role != UserRole.ADMIN and dataset["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        db.datasets.delete_one({"_id": ObjectId(dataset_id)})
        
        return {"message": "Dataset deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting dataset: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)