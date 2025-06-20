# TeamFlow - Full-Stack Team Task Manager

TeamFlow is a full-stack web application designed to help teams manage their projects and tasks efficiently. Users can register, create teams, add members, and manage tasks in a collaborative environment. This project was built as a full-stack development assessment.

## Features

- **User Authentication:** Secure user registration and login system with session management.
- **Team Management:** Create teams, add members with specific roles (Admin, Member, Viewer), and view team details.
- **Task Management:** Create, assign, and update tasks within teams.
- **Dashboard:** At-a-glance overview of personal task statistics and team activities.
- **Responsive UI:** Clean and modern user interface built with React and Tailwind CSS, ensuring a great experience on any device.
- **Role-Based Access Control:** Team creators (Admins) have exclusive rights to manage team settings and members.

## Tech Stack

- **Frontend:**
  - [React](https://reactjs.org/)
  - [Vite](https://vitejs.dev/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [React Icons](https://react-icons.github.io/react-icons/)
  - [ECharts for React](https://echarts.apache.org/en/index.html)

- **Backend:**
  - [Node.js](https://nodejs.org/)
  - [Express](https://expressjs.com/)
  - [Passport.js](http://www.passportjs.org/) (for authentication)
  - [Express Session](https://expressjs.com/en/resources/middleware/session.html)
  - [Bcrypt](https://www.npmjs.com/package/bcrypt) (for password hashing)
  - [Joi](https://joi.dev/) (for validation)

- **Database:**
  - [PostgreSQL](https://www.postgresql.org/)
  - [node-postgres (pg)](https://node-postgres.com/)

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/en/download/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/get-npm)
- [PostgreSQL](https://www.postgresql.org/download/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Team-Manager-App.git
cd Team-Manager-App
```

### 2. Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd Backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the `Backend` directory and add the following environment variables. Replace the placeholder values with your own PostgreSQL credentials.
    ```env
    PORT=5000
    SESSION_SECRET=your_strong_session_secret
    
    # Neon db  Connection URL
    ```


4.  **Start the backend server:**
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:5000`.

### 3. Frontend Setup

1.  **Navigate to the frontend directory** from the root of the project:
    ```bash
    cd Frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`. The Vite server is configured to proxy API requests to the backend.

You should now be able to register a new user and use the application.

## SQL Schema

The database schema is defined in the `schema.sql` file in the root directory. It contains all the necessary `CREATE TABLE` statements for the `User`, `Team`, `Task`, and `Membership` tables.

## Deployment

This application is ready to be deployed on platforms like Render or Heroku. Ensure you set up the environment variables and run the production build scripts for both the frontend and backend. 