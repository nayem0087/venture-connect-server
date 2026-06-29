# Hi there! 👋 I'm Nayem Ahmmed

### 🚀 Full-Stack Web Developer | Next.js Enthusiast

This is the backend server for VentureConnect, a startup team-building platform. This API handles authentication, startup management, opportunity posting, application processing, and payment integration.

🚀 Features
Role-Based Access Control (RBAC): Distinct permissions for Admins, Founders, and Collaborators.

Authentication: Secure user authentication using Better Auth with JWT support.

Payment Integration: Stripe Checkout for premium founder features.

Advanced Data Queries: Search and filter startup opportunities using MongoDB $regex and $in operators.

Pagination: Server-side pagination for efficient data management.

Security: Environment variable protection for sensitive credentials.

🛠 Tech Stack
Runtime: Node.js

Framework: Express.js

Database: MongoDB

Authentication: Better Auth & JWT

Payments: Stripe API

📦 API Endpoints
Authentication
POST /api/auth/register - Create a new account

POST /api/auth/login - User authentication

GET /api/users - Fetch users (Admin only)

Startups & Opportunities
POST /api/startups - Create a startup profile

GET /api/startups - Retrieve all startups

POST /api/opportunities - Create a new opportunity

GET /api/opportunities - Get opportunities (with pagination & search)

PUT /api/opportunities/:id - Update opportunity

DELETE /api/opportunities/:id - Delete opportunity

Applications
POST /api/applications - Submit an application

GET /api/applications - Fetch applications

PUT /api/jobs-applications/:id - Update application status (Accept/Reject)

Payments
POST /api/create-payment-intent - Initialize Stripe payment

POST /api/payments - Record transaction details