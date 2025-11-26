# LMS Platform

A modern, feature-rich Learning Management System (LMS) built with React, Firebase, and Tailwind CSS. This platform enables Instructors to create and manage courses, and Students to enroll, learn, and track their progress in a clean, distraction-free environment.

![Dashboard Preview](https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGVhcm5pbmclMjBtYW5hZ2VtZW50JTIwc3lzdGVtfGVufDB8fDB8fHww)
*(Replace with actual screenshot)*

## 🚀 Features

### 🎓 For Students
*   **Course Enrollment**: Join courses using unique 6-character access codes provided by instructors.
*   **Interactive Player**: Watch video lessons (YouTube integration), read text materials, and take quizzes.
*   **Progress Tracking**: Visual progress bars and module completion status.
*   **Assessments**: Take standalone assessments/exams and view scores immediately.
*   **Dashboard**: Centralized view of all enrolled courses and announcements.

### 👨‍🏫 For Instructors
*   **Course Management**: Create, edit, and delete courses with a rich curriculum editor.
*   **Curriculum Builder**: Organize content into Sections and Modules (Video, Text, Quiz).
*   **Student Management**: View enrolled students, track their progress, and ban/unban access.
*   **Assessments**: Create complex assessments with multiple-choice questions, export questions to PDF, and view student results in a matrix view (exportable to Excel).
*   **Analytics**: View course performance, total enrollments, and average completion rates.
*   **Announcements**: Post updates to all students.

### 🛡️ For Admins
*   **User Management**: View all users, promote students to instructors, suspend/unsuspend accounts.
*   **Platform Analytics**: High-level overview of total users, courses, and enrollments.
*   **Global Settings**: Manage platform-wide configurations.

## 🛠️ Tech Stack

*   **Frontend**: [React](https://react.dev/) (Vite)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) (via shadcn/ui patterns)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Backend / Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
*   **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
*   **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage) & Cloudinary (for optimized image delivery)
*   **Utilities**: `jspdf` (PDF generation), `xlsx` (Excel export)

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/lms-platform.git
    cd lms-platform
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file in the root directory with your Firebase configuration:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🗂️ Project Structure

```
src/
├── components/         # Reusable UI components (Button, Card, Input, etc.)
├── contexts/          # React Contexts (AuthContext)
├── lib/               # Utilities (Firebase config, helper functions)
├── pages/             # Application Pages
│   ├── admin/         # Admin-specific pages (Users, Analytics)
│   ├── instructor/    # Instructor pages (Course Editor, Assessments)
│   ├── student/       # Student pages (Course Player, Dashboard)
│   ├── Login.jsx      # Authentication pages
│   └── Signup.jsx
├── App.jsx            # Main routing and layout structure
└── main.jsx           # Entry point
```

## 🔐 Security & Roles

The platform uses Role-Based Access Control (RBAC) enforced by both client-side routing (`ProtectedRoute.jsx`) and server-side Firestore Security Rules.

*   **Admin**: Full access to all data.
*   **Instructor**: Can only edit their own courses and view students enrolled in them.
*   **Student**: Can only read content for courses they are explicitly enrolled in.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request


