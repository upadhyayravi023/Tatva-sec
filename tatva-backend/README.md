# 🎓 Campus Events Backend API

A Node.js + Express + MongoDB backend for managing campus events, with Cloudinary integration for image and PDF uploads.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Run the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## 📁 Project Structure

```
campus-events-backend/
├── server.js                  # Entry point
├── .env.example               # Environment variable template
├── config/
│   ├── db.js                  # MongoDB connection
│   └── cloudinary.js          # Cloudinary config
├── models/
│   ├── User.js                # User schema (name, email, year, rollNumber, profileUrl, role, registeredEvents)
│   ├── Event.js               # Event schema (name, desc, date, time, type, pdfs, posters, registrations, rulebookPdfLink, venue, iconLink, clubName, campus, coordinator, coCoordinator)
│   └── Announcement.js        # Announcement schema (title, body)
├── controllers/
│   ├── authController.js      # Register, login, create admin, get me
│   ├── eventController.js     # Full event CRUD + file uploads + registrations
│   ├── userController.js      # User profile, admin user management
│   └── announceController.js  # Announcement CRUD
├── routes/
│   ├── authRoutes.js          # /api/auth
│   ├── eventRoutes.js         # /api/events
│   ├── userRoutes.js          # /api/users
│   └── announceRoutes.js      # /api/announcements
├── middleware/
│   ├── authMiddleware.js      # JWT protect + adminOnly
│   └── uploadMiddleware.js    # Multer memory storage + Cloudinary streaming
└── utils/
    └── generateToken.js       # JWT token generator
```

---

## 🔐 Authentication

All protected routes require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📡 API Endpoints

### Auth Routes — `/api/auth`

| Method | Endpoint              | Access        | Description                |
|--------|-----------------------|---------------|----------------------------|
| POST   | `/register`           | Public        | Register a new user        |
| POST   | `/login`              | Public        | Login and get token        |
| GET    | `/me`                 | Private       | Get logged-in user profile |
| POST   | `/create-admin`       | Admin only    | Create a new admin user    |

#### Register
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "year": 2,
  "rollNumber": "12345",
  "profileUrl": "https://example.com/profile.jpg"
}
```

#### Login
```json
POST /api/auth/login
{
  "email": "john@example.com"
}
```

---

### Event Routes — `/api/events`

| Method | Endpoint                          | Access     | Description                          |
|--------|-----------------------------------|------------|--------------------------------------|
| GET    | `/sports`                         | Public     | Get all sports events                |
| GET    | `/cultural`                       | Public     | Get all cultural events              |
| GET    | `/:id`                            | Public     | Get event details                    |
| POST   | `/`                               | Admin      | Create event (with file uploads)     |
| PUT    | `/:id`                            | Admin      | Update event (add files too)         |
| DELETE | `/:id`                            | Admin      | Delete event + Cloudinary assets     |
| DELETE | `/:id/images/:publicId`           | Admin      | Remove a specific event image        |
| DELETE | `/:id/pdfs/:publicId`             | Admin      | Remove a specific event PDF          |
| POST   | `/:id/register`                   | Private    | Register for an event                |
| DELETE | `/:id/register`                   | Private    | Unregister from an event             |
| GET    | `/:id/registrations`              | Admin      | Get all registered users for event   |

#### Create Event (multipart/form-data)
```
POST /api/events
Content-Type: multipart/form-data

Fields:
  eventName        (string, required)
  description      (string, required)
  eventDate        (date, required)   e.g. 2024-12-25
  eventTime        (string, required) e.g. 10:00 AM
  type             (string, required) e.g. "Cultural Event" or "Sports Event"
  registrationLink (string, optional)
  venue            (string, optional)
  clubName         (string, optional)
  campus           (string, required) e.g. "Patna", "Bihta", or "both"
  coordinator      (array, optional)  e.g. ["John Doe", "Jane Smith"]
  coCoordinator    (array, optional)  e.g. ["Alice", "Bob"]
  rulebookPdf      (file, optional) — PDF file for rulebook (stored as link)
  icon             (file, optional) — icon image (stored as link)
  images           (file[], optional) — image posters
  pdfs             (file[], optional) — other PDF documents
```

#### Query Parameters for GET /api/events
```
?page=1&limit=10&search=hackathon
```

#### Register for Event
```
POST /api/events/:id/register
Content-Type: application/json

{
  "json": "{\"teamName\":\"Team Alpha\",\"members\":[\"user1\",\"user2\"]}"
}
```

---

## 🏆 Sports Scores API — `/api/sports`

| Method | Endpoint        | Access | Description                        |
|--------|-----------------|--------|------------------------------------|
| GET    | `/`             | Public | Get all sports score cards         |
| POST   | `/`             | Public | Create a new score card            |
| PUT    | `/:id`          | Public | Update an existing score card      |

### Score card format
```json
{
  "event_name": "Valorant Finals",
  "campus": "Patna",
  "is_live": true,
  "winner": null,
  "team_names": ["Team Alpha", "Team Omega"],
  "score": [12, 10]
}
```

> Note: When updating, send only the fields that need changed. For example, to set the winner after the match:
```json
{
  "winner": "Team Alpha",
  "is_live": false
}
```

---

### Announcement Routes — `/api/announcements`

| Method | Endpoint            | Access     | Description                     |
|--------|---------------------|------------|---------------------------------|
| GET    | `/`                 | Public     | Get all announcements           |
| GET    | `/:id`              | Public     | Get announcement by ID          |
| POST   | `/`                 | Admin      | Create a new announcement       |
| PUT    | `/:id`              | Admin      | Update announcement             |
| DELETE | `/:id`              | Admin      | Delete announcement             |

#### Create Announcement
```
POST /api/announcements
Content-Type: application/json

{
  "title": "Important Update",
  "body": "This is the announcement body."
}
```

---

### User Routes — `/api/users`

| Method | Endpoint            | Access     | Description                     |
|--------|---------------------|------------|---------------------------------|
| GET    | `/profile`          | Private    | Get own profile + events        |
| PUT    | `/profile`          | Private    | Update profile                  |
| GET    | `/`                 | Admin      | Get all users (paginated)       |
| GET    | `/:id`              | Admin      | Get user by ID                  |
| DELETE | `/:id`              | Admin      | Delete a user                   |

---

## 🗂️ Cloudinary Folder Structure

```
campus-events/
├── posters/   ← event image posters
└── pdfs/      ← event PDF documents
```

---

## 🛡️ Roles

| Role  | Capabilities                                                   |
|-------|----------------------------------------------------------------|
| user  | Browse events, register/unregister, manage own profile         |
| admin | Everything above + create/edit/delete events, manage all users |

> ⚠️ Self-registration as admin is blocked. Only an existing admin can create another admin via `POST /api/auth/create-admin`.

---

## 🔧 Environment Variables

| Variable                  | Description                        |
|---------------------------|------------------------------------|
| `PORT`                    | Server port (default: 5000)        |
| `MONGO_URI`               | MongoDB connection string          |
| `JWT_SECRET`              | Secret key for JWT signing         |
| `JWT_EXPIRE`              | Token expiry (e.g., `7d`)          |
| `CLOUDINARY_CLOUD_NAME`   | Your Cloudinary cloud name         |
| `CLOUDINARY_API_KEY`      | Cloudinary API key                 |
| `CLOUDINARY_API_SECRET`   | Cloudinary API secret              |
