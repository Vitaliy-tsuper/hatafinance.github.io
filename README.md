
# HataFinance

This is a Next.js personal finance tracker application, built with Firebase Studio.

## Features

*   User authentication (Sign up, Login, Change Password)
*   Transaction management (Add, View, Delete) - Stored in Firebase Firestore
    *   Separate views for income and expenses
    *   Balance calculation
*   Spending report (Pie chart visualization of expenses by category)
*   AI-powered transaction categorization suggestion (Optional, requires Genkit setup)
*   Firestore integration for data persistence
*   Responsive design with ShadCN UI components and Tailwind CSS

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Firebase project with:
    *   Authentication enabled (Email/Password)
    *   Firestore database created

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd hatafinance
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Firebase Environment Variables:**
    Create a `.env.local` file in the root of your project and add your Firebase project configuration:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # Optional: For Genkit AI features
    GOOGLE_GENAI_API_KEY=your_google_genai_api_key
    ```
    Replace `your_...` with your actual Firebase project credentials. You can find these in your Firebase project settings.

4.  **Set up Firestore Security Rules:**
    In your Firebase console, go to Firestore Database > Rules. Paste the following rules and publish them:
    ```firestore
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /transactions/{transactionId} {
          // Allow create if user is authenticated and email matches request.resource.data
          allow create: if request.auth != null && request.auth.token.email == request.resource.data.userEmail;
          // Allow read, update, delete if user is authenticated and owns the document
          allow read, update, delete: if request.auth != null && request.auth.token.email == resource.data.userEmail;
        }
      }
    }
    ```

5.  **Create Firestore Composite Index (CRITICAL for functionality):**
    Your application queries transactions by `userEmail` and orders them by `date`. Firestore requires a composite index for this.
    *   Go to your Firebase Console -> Firestore Database -> Indexes.
    *   Click "Add composite index".
    *   **Collection ID:** `transactions`
    *   **Fields to index:**
        1.  `userEmail` - `Ascending`
        2.  `date` - `Descending`
    *   **Query scope:** `Collection`
    *   Click "Create".
    Index creation might take a few minutes. The application might show errors or no data until the index is built and active.

6.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

7.  **(Optional) Run Genkit development server (for AI features):**
    If you are working with Genkit flows, you might need to run its development server:
    ```bash
    npm run genkit:dev
    ```

### Available Scripts

*   `npm run dev`: Starts the Next.js development server.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts a Next.js production server.
*   `npm run lint`: Lints the codebase.
*   `npm run typecheck`: Runs TypeScript type checking.
*   `npm run genkit:dev`: Starts the Genkit development server.
*   `npm run genkit:watch`: Starts the Genkit development server with watch mode.

## Deployment

### Vercel (Recommended)

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).
2.  **Sign up or Log in to Vercel.**
3.  **Import your Git repository** into Vercel.
4.  **Configure Project Settings:**
    *   Vercel should automatically detect it as a Next.js project.
    *   **Add Environment Variables:** In your Vercel project settings, add all the environment variables defined in your `.env.local` file (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `GOOGLE_GENAI_API_KEY`).
5.  **Deploy.** Vercel will build and deploy your application. Subsequent pushes to the connected Git branch will trigger automatic redeployments.

### GitHub Pages

This project can also be deployed to GitHub Pages as a static site.
Client-side Firebase SDK for Firestore operations will work, meaning data will be read from and written to Firestore directly from the user's browser. Ensure your Firestore Security Rules and Indexes are correctly set up.

1.  **Update `next.config.ts` for GitHub Pages (if deploying to a subpath):**
    If your GitHub Pages site will be at `https://<USERNAME>.github.io/<REPO_NAME>/`, you need to set `basePath` and enable `output: 'export'`:
    ```javascript
    // next.config.ts
    const nextConfig = {
      // ... other configs
      // basePath: '/<REPO_NAME>', // Replace <REPO_NAME> with your repository name
      // assetPrefix: '/<REPO_NAME>/', // Optional, for assets
      // images: {
      //   unoptimized: true, // Required for static export with next/image
      // },
      // output: 'export', // Enable static export for GitHub Pages
    };
    ```
    **Note:** If you uncomment `output: 'export'`, AI features relying on Genkit server-side flows might not work as expected in a purely static export. For Vercel, keep `output: 'export'` commented out or removed.

2.  **Add Firebase configuration as GitHub Secrets:**
    In your GitHub repository, go to Settings > Secrets and variables > Actions > New repository secret. Add the following secrets (without the `NEXT_PUBLIC_` prefix for Firebase keys, as the workflow will add it):
    *   `FIREBASE_API_KEY`
    *   `FIREBASE_AUTH_DOMAIN`
    *   `FIREBASE_PROJECT_ID`
    *   `FIREBASE_STORAGE_BUCKET`
    *   `FIREBASE_MESSAGING_SENDER_ID`
    *   `FIREBASE_APP_ID`
    *   `GOOGLE_GENAI_API_KEY` (if using Genkit features)
    *   `BASE_PATH` (e.g., `/<REPO_NAME>` or an empty string if deploying to root, corresponds to `basePath` in `next.config.ts`)

3.  **Enable GitHub Pages:**
    In your GitHub repository settings, go to Pages. Under "Build and deployment", select "GitHub Actions" as the source.

4.  The `.github/workflows/deploy.yml` file in this repository is configured to build and deploy your Next.js app to GitHub Pages. It will run on pushes to the main branch.

**Note on Data Persistence:**
This project uses client-side Firebase SDK for Firestore operations, so data will be read from and written to Firestore directly from the user's browser. Ensure your Firestore Security Rules and Indexes are robust.

## Tech Stack

*   Next.js (React framework)
*   TypeScript
*   Firebase (Authentication, Firestore)
*   ShadCN UI (Component library)
*   Tailwind CSS (Styling)
*   Genkit (AI integration, optional)
*   React Hook Form (Form handling)
*   Zod (Schema validation)
*   Recharts (Charting library)
*   Lucide React (Icons)

