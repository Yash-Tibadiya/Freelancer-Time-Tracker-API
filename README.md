
# Freelancer Time Tracker API

The Freelancer Time Tracker API is designed for managing freelancer projects and tasks. This API allows users to create, update, and manage their projects, tasks, and account information, as well as track their work progress. It also includes endpoints for user authentication and project/task summaries.

## Documentation

For comprehensive API documentation, including detailed examples, endpoint specifications, and interactive features, visit: [Freelancer Time Tracker API Documentation](https://freelancer-time-tracker.apidocumentation.com)

This documentation was created using [Scalar](https://scalar.com)

## Features

- **User Management**: Register, login, and manage user accounts.
- **Project Management**: Create, update, delete, and manage freelancer projects.
- **Task Management**: Create, update, delete, and manage tasks associated with projects.
- **Project Summary**: Get summaries and reports for individual projects or all projects.
- **Authentication**: Secure JWT-based authentication for access to endpoints.

## API Endpoints

### 1. User Endpoints

- **POST `/users/register`**: Register a new user.
- **POST `/users/login`**: User login (using username/email and password).
- **POST `/users/refresh-token`**: Refresh access token (JWT).
- **POST `/users/logout`**: User logout.
- **POST `/users/change-password`**: Change user password.
- **GET `/users/current-user`**: Get the current logged-in user's details.
- **PATCH `/users/update-account`**: Update user account details (email, full name).
- **DELETE `/users/delete-account`**: Delete the user account.
- **GET `/users/get-user-projects`**: Get all projects associated with the logged-in user.

### 2. Project Endpoints

- **POST `/projects`**: Create a new project.
- **GET `/projects`**: Get all projects for the logged-in user.
- **PATCH `/projects/{projectId}`**: Update a project (name, description).
- **DELETE `/projects/{projectId}`**: Delete a project.
- **PATCH `/projects/{projectId}/status`**: Change project status (active, completed, archived).
- **GET `/projects/get-summary`**: Get summary of all projects.
- **GET `/projects/get-summary/{projectId}`**: Get summary for a specific project.

### 3. Task Endpoints

- **POST `/projects/{projectId}/tasks`**: Create a new task within a project.
- **GET `/projects/{projectId}/tasks`**: Get all tasks for a specific project.
- **PATCH `/projects/{projectId}/tasks/{taskId}`**: Update a task (name, description, start/end time, completion status).
- **DELETE `/projects/{projectId}/tasks/{taskId}`**: Delete a task.

## Installation

To run the API locally, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/freelancer-time-tracker-api.git
   cd freelancer-time-tracker-api
   ```

2. Install dependencies:

   For Python-based environments (assuming this is a Python backend):

   ```bash
   pip install -r requirements.txt
   ```

3. Start the server:

   ```bash
   python manage.py runserver
   ```

   The API should now be available at `http://localhost:8000`.

## Usage

- Use Postman, Insomnia, or cURL to make API requests.
- Ensure that JWT tokens are included in the `Authorization` header for requests requiring authentication.

## License

This project is licensed under the MIT License.