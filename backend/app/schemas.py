from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1, max_length=200)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    email: str
    display_name: str
    role: str


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=1)
    department_id: UUID | None = None
    position_id: UUID | None = None
    is_dismissed: bool = False


class EmployeeUpdate(EmployeeCreate):
    pass


class DirectoryItem(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    url: str | None = None
    version: str | None = None


class AccessCardUpdate(BaseModel):
    has_abs1_access: bool = False
    has_abs2_access: bool = False
    resource_ids: list[UUID] = []
    internet_resource_ids: list[UUID] = []
    software_ids: list[UUID] = []
    abs_access_ids: list[UUID] = []


class RegisterEmployeeRequest(BaseModel):
    full_name: str = Field(min_length=1)
    department_id: UUID | None = None
    position_id: UUID | None = None
    has_abs1_access: bool = False
    has_abs2_access: bool = False
    resource_ids: list[UUID] = []
    internet_resource_ids: list[UUID] = []
    software_ids: list[UUID] = []
    abs_access_ids: list[UUID] = []


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = Field(min_length=1)
    role: str = Field(pattern="^(admin|user)$")


class NotificationSettingsUpdate(BaseModel):
    enabled: bool = False
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_login: str = ""
    smtp_password: str = ""
    sender_email: str = ""
    sender_name: str = ""
    use_tls: bool = True
    recipients: list[str] = []


class TestEmailRequest(BaseModel):
    to_email: EmailStr | None = None
