# Data Access Layer (DAL) Architecture

## Overview

The Data Access Layer (DAL) provides a clean separation between the business logic and database operations in the FarmConnect application. It follows the **Repository Pattern** to abstract data access and provide a consistent interface for database operations.

## Architecture Diagram

```
┌─────────────────┐
│   Controllers   │  ← Handle HTTP requests/responses
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Services     │  ← Business logic layer
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Repositories   │  ← Data access layer (DAL)
│  (DAL Layer)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Models        │  ← Mongoose schemas/models
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   MongoDB       │  ← Database
└─────────────────┘
```

## Directory Structure

```
backend/
├── dal/
│   ├── index.js                 # Central export for all repositories
│   ├── base.js                  # Base class with common CRUD operations
│   └── repositories/
│       ├── users.js             # User-specific data access
│       └── [others]             # Future repositories (products, orders, etc.)
├── models/                      # Mongoose models
├── services/                    # Business logic
└── controllers/                 # Request handlers
```

## Components

### 1. base.js

The `base.js` file provides common database operations that all repositories inherit:

**Core Methods:**
- `findById(id, options)` - Find document by ID
- `findOne(criteria, options)` - Find single document
- `find(criteria, options)` - Find multiple documents
- `create(data)` - Create new document
- `updateById(id, updates, options)` - Update by ID
- `updateOne(criteria, updates, options)` - Update single document
- `updateMany(criteria, updates)` - Update multiple documents
- `deleteById(id)` - Delete by ID
- `deleteOne(criteria)` - Delete single document
- `deleteMany(criteria)` - Delete multiple documents
- `count(criteria)` - Count documents
- `exists(criteria)` - Check if document exists
- `paginate(criteria, page, limit, options)` - Paginated queries
- `aggregate(pipeline)` - Aggregation operations

**Benefits:**
- DRY principle - no repeated CRUD code
- Consistent error handling
- Centralized query options (select, populate, sort, etc.)
- Built-in pagination support

### 2. users.js

Extends base repository with user-specific operations:

**Specialized Methods:**
- `findByEmail(email, options)` - Find user by email
- `findByEmailWithPassword(email)` - Find user with password field (for auth)
- `emailExists(email, excludeUserId)` - Check email uniqueness
- `findByRole(role, options)` - Find users by role
- `getAllUsers(filters, page, limit, options)` - Get all users with pagination
- `createUser(userData)` - Create new user
- `updateUser(userId, updates)` - Update user profile
- `deleteUser(userId)` - Delete user
- `getUserStatsByRole()` - Get user statistics by role
- `getRecentUsers(limit)` - Get recently registered users
- `searchUsers(searchTerm, page, limit)` - Search users by name/email
- `countByRole(role)` - Count users by role
- `getUsersByDateRange(startDate, endDate)` - Get users in date range

## Usage Examples

### 1. Import Repository

```javascript
// Import single repository
const { users } = require('../dal');

// Import multiple repositories
const { users, products, orders } = require('../dal');
```

### 2. Basic CRUD Operations

```javascript
// Create
const user = await users.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepass',
  role: 'buyer'
});

// Read
const user = await users.findById(userId);
const userByEmail = await users.findByEmail('john@example.com');

// Update
const updatedUser = await users.updateUser(userId, {
  name: 'John Updated'
});

// Delete
await users.deleteUser(userId);
```

### 3. Querying with Options

```javascript
// Find with specific fields
const user = await users.findById(userId, {
  select: 'name email role'
});

// Find with population
const user = await users.findById(userId, {
  populate: 'orders'
});

// Find with sorting and limiting
const allUsers = await users.find({}, {
  sort: { createdAt: -1 },
  limit: 10,
  select: '-password'
});
```

### 4. Pagination

```javascript
const result = await users.getAllUsers(
  { role: 'seller' },  // filters
  1,                   // page
  20                   // limit
);

console.log(result.data);        // Array of users
console.log(result.pagination);  // Pagination metadata
/*
{
  page: 1,
  limit: 20,
  total: 150,
  pages: 8,
  hasNext: true,
  hasPrev: false
}
*/
```

### 5. Advanced Queries

```javascript
// Check if email exists
const exists = await users.emailExists('test@example.com');

// Search users
const results = await users.searchUsers('john', 1, 10);

// Get statistics
const stats = await users.getUserStatsByRole();
// Returns: [{ role: 'buyer', count: 100 }, { role: 'seller', count: 50 }]

// Date range queries
const usersList = await users.getUsersByDateRange(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

## Creating New Repositories

When adding new entities (e.g., Products, Orders), follow this pattern:

### Step 1: Create Repository Class

```javascript
// backend/dal/repositories/products.js
const BaseRepository = require('../base');
const Product = require('../../models/Product');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // Add product-specific methods
  async findByCategory(category, options = {}) {
    return await this.find({ category }, options);
  }

  async findBySeller(sellerId, options = {}) {
    return await this.find({ seller: sellerId }, options);
  }

  // ... other product-specific methods
}

module.exports = new ProductRepository();
```

### Step 2: Export from DAL Index

```javascript
// backend/dal/index.js
const users = require('./repositories/users');
const products = require('./repositories/products');

module.exports = {
  users,
  products,
};
```

### Step 3: Use in Services

```javascript
// backend/services/productService.js
const { products } = require('../dal');

class ProductService {
  async getProductsByCategory(category, page = 1, limit = 10) {
    return await products.paginate(
      { category },
      page,
      limit,
      { sort: { createdAt: -1 } }
    );
  }
}
```

## Benefits of DAL Architecture

### 1. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Repositories**: Handle data access
- **Models**: Define data structure

### 2. Reusability
- Common operations inherited from BaseRepository
- No duplication of CRUD code
- Consistent API across all repositories

### 3. Testability
- Easy to mock repositories in unit tests
- Business logic can be tested without database
- Repository methods can be tested in isolation

### 4. Maintainability
- Changes to database queries centralized in repositories
- Easy to add new methods or modify existing ones
- Clear contract between layers

### 5. Flexibility
- Easy to switch databases or ORMs
- Can add caching layer in repositories
- Can implement query optimization in one place

### 6. Type Safety & Documentation
- Clear method signatures
- JSDoc comments for IntelliSense
- Consistent error handling

## Best Practices

### 1. Keep Repositories Focused
```javascript
// ✅ Good - Repository handles data access
async findActiveUsers() {
  return await this.find({ isActive: true });
}

// ❌ Bad - Business logic in repository
async sendWelcomeEmail(userId) {
  const user = await this.findById(userId);
  await emailService.send(user.email, 'Welcome!');
}
```

### 2. Use Services for Business Logic
```javascript
// ✅ Good - Service orchestrates repositories and logic
class UserService {
  async registerUser(userData) {
    const exists = await users.emailExists(userData.email);
    if (exists) throw new Error('Email exists');
    
    const user = await users.createUser(userData);
    await emailService.sendWelcome(user.email);
    
    return user;
  }
}
```

### 3. Handle Errors Appropriately
```javascript
// Repositories throw errors
async findUserOrFail(userId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// Services catch and transform errors
async getUser(userId) {
  try {
    return await users.findUserOrFail(userId);
  } catch (error) {
    throw new AppError(error.message, 404);
  }
}
```

### 4. Use Transactions for Multiple Operations
```javascript
// For operations affecting multiple collections
async transferOwnership(productId, newOwnerId, session) {
  await products.updateById(
    productId,
    { owner: newOwnerId },
    { session }
  );
  
  await users.updateById(
    newOwnerId,
    { $inc: { productCount: 1 } },
    { session }
  );
}
```

## Migration Guide

### Before (Direct Model Access)
```javascript
// services/authService.js
const User = require('../models/User');

async loginUser(email, password) {
  const user = await User.findOne({ email }).select('+password');
  // ...
}
```

### After (Using DAL)
```javascript
// services/authService.js
const { users } = require('../dal');

async loginUser(email, password) {
  const user = await users.findByEmailWithPassword(email);
  // ...
}
```

## Performance Considerations

### 1. Use Projections
```javascript
// Only select needed fields
const allUsers = await users.find({}, {
  select: 'name email'  // Don't fetch unnecessary fields
});
```

### 2. Use Pagination
```javascript
// Don't fetch all records at once
const result = await users.paginate({}, 1, 20);
```

### 3. Use Aggregation for Complex Queries
```javascript
// Better than multiple queries
const stats = await users.aggregate([
  { $group: { _id: '$role', count: { $sum: 1 } } }
]);
```

## Future Enhancements

1. **Caching Layer**: Add Redis caching in repositories
2. **Query Builder**: Fluent API for complex queries
3. **Soft Deletes**: Implement soft delete pattern
4. **Audit Trail**: Track who created/modified records
5. **Database Sharding**: Support for horizontal scaling
6. **Read Replicas**: Direct read queries to replicas

## Conclusion

The DAL provides a solid foundation for scalable, maintainable data access. By following the repository pattern and keeping concerns separated, the codebase remains clean and easy to extend as the application grows.

For questions or suggestions, refer to the inline documentation in the code or contact the development team.

# Data Access Layer (DAL) Architecture

## Overview

The Data Access Layer (DAL) provides a clean separation between the business logic and database operations in the FarmConnect application. It follows the **Repository Pattern** to abstract data access and provide a consistent interface for database operations.

## Architecture Diagram

```
┌─────────────────┐
│   Controllers   │  ← Handle HTTP requests/responses
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Services     │  ← Business logic layer
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Repositories   │  ← Data access layer (DAL)
│  (DAL Layer)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Models        │  ← Mongoose schemas/models
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   MongoDB       │  ← Database
└─────────────────┘
```

## Directory Structure

```
backend/
├── dal/
│   ├── index.js                 # Central export for all repositories
│   ├── base.js                  # Base class with common CRUD operations
│   └── repositories/
│       ├── users.js             # User-specific data access
│       └── [others]             # Future repositories (products, orders, etc.)
├── models/                      # Mongoose models
├── services/                    # Business logic
└── controllers/                 # Request handlers
```

## Components

### 1. base.js

The `base.js` file provides common database operations that all repositories inherit:

**Core Methods:**
- `findById(id, options)` - Find document by ID
- `findOne(criteria, options)` - Find single document
- `find(criteria, options)` - Find multiple documents
- `create(data)` - Create new document
- `updateById(id, updates, options)` - Update by ID
- `updateOne(criteria, updates, options)` - Update single document
- `updateMany(criteria, updates)` - Update multiple documents
- `deleteById(id)` - Delete by ID
- `deleteOne(criteria)` - Delete single document
- `deleteMany(criteria)` - Delete multiple documents
- `count(criteria)` - Count documents
- `exists(criteria)` - Check if document exists
- `paginate(criteria, page, limit, options)` - Paginated queries
- `aggregate(pipeline)` - Aggregation operations

**Benefits:**
- DRY principle - no repeated CRUD code
- Consistent error handling
- Centralized query options (select, populate, sort, etc.)
- Built-in pagination support

### 2. users.js

Extends base repository with user-specific operations:

**Specialized Methods:**
- `findByEmail(email, options)` - Find user by email
- `findByEmailWithPassword(email)` - Find user with password field (for auth)
- `emailExists(email, excludeUserId)` - Check email uniqueness
- `findByRole(role, options)` - Find users by role
- `getAllUsers(filters, page, limit, options)` - Get all users with pagination
- `createUser(userData)` - Create new user
- `updateUser(userId, updates)` - Update user profile
- `deleteUser(userId)` - Delete user
- `getUserStatsByRole()` - Get user statistics by role
- `getRecentUsers(limit)` - Get recently registered users
- `searchUsers(searchTerm, page, limit)` - Search users by name/email
- `countByRole(role)` - Count users by role
- `getUsersByDateRange(startDate, endDate)` - Get users in date range

## Usage Examples

### 1. Import Repository

```javascript
// Import single repository
const { users } = require('../dal');

// Import multiple repositories
const { users, products, orders } = require('../dal');
```

### 2. Basic CRUD Operations

```javascript
// Create
const user = await users.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepass',
  role: 'buyer'
});

// Read
const user = await users.findById(userId);
const userByEmail = await users.findByEmail('john@example.com');

// Update
const updatedUser = await users.updateUser(userId, {
  name: 'John Updated'
});

// Delete
await users.deleteUser(userId);
```

### 3. Querying with Options

```javascript
// Find with specific fields
const user = await users.findById(userId, {
  select: 'name email role'
});

// Find with population
const user = await users.findById(userId, {
  populate: 'orders'
});

// Find with sorting and limiting
const allUsers = await users.find({}, {
  sort: { createdAt: -1 },
  limit: 10,
  select: '-password'
});
```

### 4. Pagination

```javascript
const result = await users.getAllUsers(
  { role: 'seller' },  // filters
  1,                   // page
  20                   // limit
);

console.log(result.data);        // Array of users
console.log(result.pagination);  // Pagination metadata
/*
{
  page: 1,
  limit: 20,
  total: 150,
  pages: 8,
  hasNext: true,
  hasPrev: false
}
*/
```

### 5. Advanced Queries

```javascript
// Check if email exists
const exists = await users.emailExists('test@example.com');

// Search users
const results = await users.searchUsers('john', 1, 10);

// Get statistics
const stats = await users.getUserStatsByRole();
// Returns: [{ role: 'buyer', count: 100 }, { role: 'seller', count: 50 }]

// Date range queries
const usersList = await users.getUsersByDateRange(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

## Creating New Repositories

When adding new entities (e.g., Products, Orders), follow this pattern:

### Step 1: Create Repository Class

```javascript
// backend/dal/repositories/products.js
const BaseRepository = require('../base');
const Product = require('../../models/Product');

class ProductRepository extends BaseRepository {
  constructor() {
    super(Product);
  }

  // Add product-specific methods
  async findByCategory(category, options = {}) {
    return await this.find({ category }, options);
  }

  async findBySeller(sellerId, options = {}) {
    return await this.find({ seller: sellerId }, options);
  }

  // ... other product-specific methods
}

module.exports = new ProductRepository();
```

### Step 2: Export from DAL Index

```javascript
// backend/dal/index.js
const users = require('./repositories/users');
const products = require('./repositories/products');

module.exports = {
  users,
  products,
};
```

### Step 3: Use in Services

```javascript
// backend/services/productService.js
const { products } = require('../dal');

class ProductService {
  async getProductsByCategory(category, page = 1, limit = 10) {
    return await products.paginate(
      { category },
      page,
      limit,
      { sort: { createdAt: -1 } }
    );
  }
}
```

## Benefits of DAL Architecture

### 1. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Repositories**: Handle data access
- **Models**: Define data structure

### 2. Reusability
- Common operations inherited from BaseRepository
- No duplication of CRUD code
- Consistent API across all repositories

### 3. Testability
- Easy to mock repositories in unit tests
- Business logic can be tested without database
- Repository methods can be tested in isolation

### 4. Maintainability
- Changes to database queries centralized in repositories
- Easy to add new methods or modify existing ones
- Clear contract between layers

### 5. Flexibility
- Easy to switch databases or ORMs
- Can add caching layer in repositories
- Can implement query optimization in one place

### 6. Type Safety & Documentation
- Clear method signatures
- JSDoc comments for IntelliSense
- Consistent error handling

## Best Practices

### 1. Keep Repositories Focused
```javascript
// ✅ Good - Repository handles data access
async findActiveUsers() {
  return await this.find({ isActive: true });
}

// ❌ Bad - Business logic in repository
async sendWelcomeEmail(userId) {
  const user = await this.findById(userId);
  await emailService.send(user.email, 'Welcome!');
}
```

### 2. Use Services for Business Logic
```javascript
// ✅ Good - Service orchestrates repositories and logic
class UserService {
  async registerUser(userData) {
    const exists = await users.emailExists(userData.email);
    if (exists) throw new Error('Email exists');
    
    const user = await users.createUser(userData);
    await emailService.sendWelcome(user.email);
    
    return user;
  }
}
```

### 3. Handle Errors Appropriately
```javascript
// Repositories throw errors
async findUserOrFail(userId) {
  const user = await this.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// Services catch and transform errors
async getUser(userId) {
  try {
    return await users.findUserOrFail(userId);
  } catch (error) {
    throw new AppError(error.message, 404);
  }
}
```

### 4. Use Transactions for Multiple Operations
```javascript
// For operations affecting multiple collections
async transferOwnership(productId, newOwnerId, session) {
  await products.updateById(
    productId,
    { owner: newOwnerId },
    { session }
  );
  
  await users.updateById(
    newOwnerId,
    { $inc: { productCount: 1 } },
    { session }
  );
}
```

## Migration Guide

### Before (Direct Model Access)
```javascript
// services/authService.js
const User = require('../models/User');

async loginUser(email, password) {
  const user = await User.findOne({ email }).select('+password');
  // ...
}
```

### After (Using DAL)
```javascript
// services/authService.js
const { users } = require('../dal');

async loginUser(email, password) {
  const user = await users.findByEmailWithPassword(email);
  // ...
}
```

## Performance Considerations

### 1. Use Projections
```javascript
// Only select needed fields
const allUsers = await users.find({}, {
  select: 'name email'  // Don't fetch unnecessary fields
});
```

### 2. Use Pagination
```javascript
// Don't fetch all records at once
const result = await users.paginate({}, 1, 20);
```

### 3. Use Aggregation for Complex Queries
```javascript
// Better than multiple queries
const stats = await users.aggregate([
  { $group: { _id: '$role', count: { $sum: 1 } } }
]);
```

## Future Enhancements

1. **Caching Layer**: Add Redis caching in repositories
2. **Query Builder**: Fluent API for complex queries
3. **Soft Deletes**: Implement soft delete pattern
4. **Audit Trail**: Track who created/modified records
5. **Database Sharding**: Support for horizontal scaling
6. **Read Replicas**: Direct read queries to replicas

## Conclusion

The DAL provides a solid foundation for scalable, maintainable data access. By following the repository pattern and keeping concerns separated, the codebase remains clean and easy to extend as the application grows.

For questions or suggestions, refer to the inline documentation in the code or contact the development team.
