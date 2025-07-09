# Hestia API Documentation

## Authentication

All API endpoints (except auth endpoints) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Register
`POST /api/auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "tenant" // Options: "broker", "tenant", "landlord", "staff"
}
```

**Response:**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "tenant",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login
`POST /api/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "tenant",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Staff Endpoints

These endpoints require the user to have a "staff" role.

### List Users
`GET /api/staff/users?page=1&limit=10&role=tenant`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role

**Response:**
```json
{
  "users": [
    {
      "id": "clx...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "tenant",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Get User
`GET /api/staff/users/:id`

### Update User
`PUT /api/staff/users/:id`

**Body:**
```json
{
  "email": "newemail@example.com",
  "name": "New Name",
  "role": "broker",
  "password": "newpassword123"
}
```

### Delete User
`DELETE /api/staff/users/:id`

## Policies Endpoints

### List Policies
`GET /api/policies?page=1&limit=10&status=active`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (pending, active, expired, cancelled)

**Note:** The endpoint filters policies based on user role:
- Staff: Can see all policies
- Broker: Can see policies where they are the broker
- Tenant: Can see policies where they are the tenant
- Landlord: Can see policies where they are the landlord

**Response:**
```json
{
  "policies": [
    {
      "id": "clx...",
      "broker": {
        "id": "clx...",
        "name": "John Broker",
        "email": "broker@example.com"
      },
      "tenant": {
        "id": "clx...",
        "name": "Alice Tenant",
        "email": "tenant@example.com"
      },
      "landlord": {
        "id": "clx...",
        "name": "Bob Landlord",
        "email": "landlord@example.com"
      },
      "property": {
        "address": "123 Main St, New York, NY 10001",
        "type": "apartment",
        "data": {
          "sqft": 800,
          "bedrooms": 2,
          "bathrooms": 1,
          "amenities": ["parking", "laundry", "gym"]
        }
      },
      "coverage": {
        "liability": 100000,
        "personalProperty": 25000,
        "additionalLiving": 5000
      },
      "status": "active",
      "premium": 150.00,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T00:00:00.000Z",
      "payer": "tenant",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Create Policy
`POST /api/policies`

**Required Role:** broker or staff

**Body:**
```json
{
  "tenantId": "clx...",
  "landlordId": "clx...", // optional
  "propertyAddress": "123 Main St, New York, NY 10001",
  "propertyType": "apartment",
  "premium": 150.00,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T00:00:00.000Z",
  "payer": "tenant", // Options: "tenant" or "landlord"
  "propertyData": {
    "sqft": 800,
    "bedrooms": 2,
    "bathrooms": 1,
    "amenities": ["parking", "laundry", "gym"]
  },
  "coverageData": {
    "liability": 100000,
    "personalProperty": 25000,
    "additionalLiving": 5000
  }
}
```

### Get Policy
`GET /api/policies/:id`

### Update Policy
`PUT /api/policies/:id`

**Required Role:** broker or staff

**Body:**
```json
{
  "status": "active",
  "premium": 175.00,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T00:00:00.000Z",
  "payer": "landlord",
  "propertyData": {
    "sqft": 900,
    "bedrooms": 2,
    "bathrooms": 1,
    "amenities": ["parking", "laundry", "gym", "pool"]
  },
  "coverageData": {
    "liability": 150000,
    "personalProperty": 30000,
    "additionalLiving": 7500
  }
}
```

### Delete Policy
`DELETE /api/policies/:id`

**Required Role:** staff

## Test Credentials

The following test users are created by the seed script:

- **Staff Admin**
  - Email: admin@hestia.com
  - Password: password123
  - Role: staff

- **Broker**
  - Email: broker@hestia.com
  - Password: password123
  - Role: broker

- **Tenant**
  - Email: tenant@hestia.com
  - Password: password123
  - Role: tenant

- **Landlord**
  - Email: landlord@hestia.com
  - Password: password123
  - Role: landlord

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": [...] // Optional, for validation errors
}
```

Common HTTP status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (e.g., email already exists)
- 500: Internal Server Error