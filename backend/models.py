from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: UserRole = UserRole.MEMBER

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DatasetCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None

class DatasetResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    filename: str
    file_size: int
    columns: List[str]
    row_count: int
    user_id: str
    created_at: datetime
    updated_at: datetime

class DataFilter(BaseModel):
    column: str
    operator: str  # eq, ne, gt, lt, gte, lte, contains, in
    value: Any

class DataQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")
    search: Optional[str] = None
    filters: List[DataFilter] = []

class ChartConfig(BaseModel):
    chart_type: str  # bar, line, pie, scatter
    x_axis: str
    y_axis: Optional[str] = None
    group_by: Optional[str] = None
    aggregate: str = "count"  # count, sum, avg, min, max

class DataStats(BaseModel):
    total_rows: int
    total_columns: int
    numeric_columns: List[str]
    categorical_columns: List[str]
    missing_values: Dict[str, int]
    data_types: Dict[str, str]