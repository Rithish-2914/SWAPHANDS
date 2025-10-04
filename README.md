# VIT SwapHands - Student Marketplace

A full-stack web application for VIT (Vellore Institute of Technology) students to buy, sell, and exchange items within the campus community. Built with React, TypeScript, Express.js, and PostgreSQL.

## 📖 Table of Contents
- [How to Run the Website](#-how-to-run-the-website)
- [Quick Start for Local Development](#-quick-start-for-local-development)
- [Deploy to Vercel](#-deploy-to-vercel-recommended)
- [Database Management](#-database-management)
- [Troubleshooting](#-troubleshooting)

## ▶️ How to Run the Website

### For Development (Local Machine or Replit)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up your database**:
   - On Replit: Database is automatically provisioned
   - On local machine: Set up PostgreSQL (see [Database Setup](#choose-your-database-setup))

3. **Configure environment** (if .env doesn't exist):
   ```bash
   # On Replit: DATABASE_URL is already set
   # On local: Create .env file with your DATABASE_URL
   echo "DATABASE_URL=your-database-url" > .env
   echo "SESSION_SECRET=your-secret-key" >> .env
   ```

4. **Initialize database schema**:
   ```bash
   npm run db:push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   - On Replit: Click the webview or open the provided URL
   - On local: Visit `http://localhost:5000`

### For Production (Vercel)

See the [Deploy to Vercel](#-deploy-to-vercel-recommended) section below for complete deployment guide.

## 🚀 Quick Start for Local Development

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Database**: Either local PostgreSQL or Supabase (recommended)

### 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd vit-swaphands
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Choose your database setup** (Pick one option below)

   ### Option A: Supabase (Recommended - Free & Easy Setup)
   
   1. **Create a Supabase project**:
      - Go to [Supabase Dashboard](https://supabase.com/dashboard)
      - Click "New Project"
      - Set your project name and database password
      - Wait for the project to be created (2-3 minutes)

   2. **Get your database credentials**:
      - In your Supabase project, click "Connect" button
      - Copy the "Transaction pooler" connection string
      - Go to Settings → API
      - Copy the Project URL and API keys

   3. **Update your `.env` file**:
      ```env
      # Supabase Database Configuration (Transaction pooler with SSL required)
      DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
      SUPABASE_URL=https://[PROJECT-REF].supabase.co
      SUPABASE_ANON_KEY=your-anon-key-here
      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
      
      # Session Configuration
      SESSION_SECRET=your-super-secret-session-key-change-this
      
      # Development
      NODE_ENV=development
      ```
      
      **Important**: Make sure to use the "Transaction pooler" connection string (includes `.pooler.`) and add `?sslmode=require` for secure connections.

   ### Option B: Local PostgreSQL with Docker
   
   ```bash
   # Start PostgreSQL with Docker
   docker run --name vit-postgres \
     -e POSTGRES_DB=vit_swaphands \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     -d postgres:15
   
   # Update your .env file - remove/comment out Supabase variables
   DATABASE_URL=postgresql://postgres:password@localhost:5432/vit_swaphands
   SESSION_SECRET=your-super-secret-session-key-change-this
   NODE_ENV=development
   
   # Comment out or remove these when using local PostgreSQL:
   # SUPABASE_URL=
   # SUPABASE_ANON_KEY=
   # SUPABASE_SERVICE_ROLE_KEY=
   ```

   ### Option C: Local PostgreSQL Installation
   
   ```bash
   # Install PostgreSQL on your system first
   # Create database
   createdb vit_swaphands
   
   # Update .env file
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/vit_swaphands
   ```

5. **Initialize the database schema**
   ```bash
   npm run db:push
   ```
   
   If you get any conflicts, use:
   ```bash
   npm run db:push --force
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

7. **Test the application**
   - Open `http://localhost:5000` in your browser
   - Try registering with a test email (e.g., `test@vitstudent.ac.in`)
   - Users are auto-verified in development mode

## 📧 Email Configuration (Optional)

The application uses email for user verification and password reset. If email is not configured, users will be automatically verified for local development.

### Gmail Setup (Free Option)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Generate a password for "Mail"
3. **Add to .env file**:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-character-app-password
   ```

### Alternative Email Services

You can modify `server/email.ts` to use other services like:
- SendGrid
- Mailgun
- Amazon SES
- Nodemailer with other SMTP providers

## 🔐 Authentication Features

### Local Authentication
- Email/password registration with verification
- Password reset functionality
- Session-based authentication
- Auto-verification in development mode (when email is not configured)

### Google OAuth (Optional)
1. **Set up Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URLs: `http://localhost:5000/api/auth/google/callback`

2. **Add to .env file**:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## 🗄️ Database Management

### Available Commands

```bash
# Push schema changes to database
npm run db:push

# Force push schema changes (use if conflicts)
npm run db:push --force

# Check TypeScript types
npm run check
```

### Database Schema

The application uses Drizzle ORM with the following main tables:
- **users** - User accounts and profiles
- **items** - Marketplace items for sale/exchange
- **wishlist** - User wishlists
- **messages** - Communication between users
- **lost_found_items** - Lost and found items (admin feature)
- **lost_found_claims** - Claims for lost items

## 🚀 Production Deployment

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

Ensure these are set in production:

```env
NODE_ENV=production

# Database (Supabase recommended for production)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Security
SESSION_SECRET=your-very-secure-session-secret-generate-a-new-one

# Email (Optional - for user verification)
GMAIL_USER=your-production-email@gmail.com
GMAIL_APP_PASSWORD=your-production-gmail-app-password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
```

### Deployment Platforms

The application is configured for deployment on:
- **Vercel** (primary)
- **Railway**
- **Render**
- **DigitalOcean App Platform**
- **Heroku**

## 🚀 Deploy to Vercel (Recommended)

This application is configured and ready for Vercel deployment with `vercel.json` included.

### 📋 Prerequisites

Before deploying to Vercel, ensure you have:
- A GitHub/GitLab account with your project repository
- A Vercel account ([sign up free](https://vercel.com/signup))
- A PostgreSQL database (Neon, Supabase, or Railway recommended)

### 🔧 Step-by-Step Deployment Guide

#### Step 1: Prepare Your Database

1. **Create a Production Database** (Choose one):
   
   **Option A: Neon (Recommended - Free tier)**
   - Go to [Neon Console](https://console.neon.tech)
   - Create a new project
   - Copy the connection string
   
   **Option B: Supabase**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create new project
   - Get "Transaction pooler" connection string from Settings → Database
   
   **Option C: Railway**
   - Go to [Railway](https://railway.app)
   - Create PostgreSQL database
   - Copy the DATABASE_URL from variables

2. **Push Database Schema**:
   ```bash
   # Set your production DATABASE_URL temporarily
   DATABASE_URL="your-production-database-url" npm run db:push
   ```

#### Step 2: Deploy to Vercel

##### Method 1: Using Vercel Dashboard (Easiest)

1. **Import Your Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git repository
   - Click "Import"

2. **Configure Environment Variables**:
   
   In the Vercel import screen, add these environment variables:

   **Required Variables:**
   ```
   DATABASE_URL=your-production-database-connection-string
   SESSION_SECRET=your-secure-random-string-at-least-32-characters
   NODE_ENV=production
   ```

   **Optional Variables (for full functionality):**
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-gmail-app-password
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   ```

3. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at `your-project.vercel.app`

##### Method 2: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # Preview deployment
   vercel
   
   # Production deployment
   vercel --prod
   ```

4. **Set Environment Variables via CLI**:
   ```bash
   vercel env add DATABASE_URL production
   vercel env add SESSION_SECRET production
   # Add other variables as needed
   ```

#### Step 3: Configure Google OAuth (Optional)

If you want Google OAuth login:

1. **Update Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your OAuth project
   - Go to "Credentials"
   - Edit your OAuth 2.0 Client
   - Add Authorized redirect URI: `https://your-project.vercel.app/api/auth/google/callback`

2. **Add to Vercel Environment Variables**:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

#### Step 4: Verify Deployment

1. **Test Your Live Site**:
   - Visit `https://your-project.vercel.app`
   - Try registering a new user
   - Test login functionality
   - Check if database operations work

2. **Check Deployment Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment
   - View "Build Logs" and "Function Logs" for any errors

### 🔄 Redeployment

Any push to your main branch will automatically trigger a new deployment.

To manually redeploy:
- Go to Vercel Dashboard → Your Project → Deployments
- Click "Redeploy" on any previous deployment

### ⚙️ Build Configuration

The project uses these Vercel settings (defined in `vercel.json`):
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **API Routes**: Serverless functions in `api/` directory
- **Framework**: React + Express (Hybrid)

### 🔍 Troubleshooting Vercel Deployment

**Issue: Build Fails**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` dependencies are correct

**Issue: Database Connection Error**
- Verify DATABASE_URL is correct
- Check database allows external connections
- Ensure database is not paused (free tier databases)

**Issue: 500 Internal Server Error**
- Check Function Logs in Vercel dashboard
- Verify environment variables are set in production
- Ensure database schema is pushed (`npm run db:push`)

**Issue: Google OAuth Not Working**
- Verify redirect URI in Google Console matches Vercel URL
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Ensure OAuth consent screen is configured

### 💰 Vercel Pricing

- **Hobby Plan (Free)**: Perfect for personal projects
  - Unlimited deployments
  - 100GB bandwidth/month
  - Serverless functions included
  
- **Pro Plan ($20/month)**: For production apps
  - 1TB bandwidth/month
  - Advanced analytics
  - Team collaboration

### 🌐 Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update Google OAuth redirect URI if using OAuth

## 🧪 Testing the Application

### Manual Testing Checklist

1. **User Registration**
   - Register with @vitstudent.ac.in email
   - Check email verification (or auto-verification in dev)
   - Login with credentials

2. **Item Management**
   - Create new item listing
   - Upload photos
   - Edit item details
   - Delete items

3. **Marketplace Features**
   - Browse items
   - Search and filter
   - Add to wishlist
   - Send messages to sellers

4. **Admin Features** (if you have admin role)
   - Manage lost and found items
   - Review claims
   - User management

### Creating Admin User

To create an admin user, manually update the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@vitstudent.ac.in';
```

## 🛠️ Development

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and config
├── server/                # Express backend
│   ├── auth.ts           # Authentication logic
│   ├── db.ts             # Database connection
│   ├── email.ts          # Email functionality
│   ├── routes.ts         # API routes
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
└── uploads/              # File uploads directory
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Development Notes

- **Hot Module Replacement**: Automatic reload on changes
- **TypeScript**: Full type safety across frontend and backend
- **Session Storage**: Uses PostgreSQL in production, memory in development
- **File Uploads**: Stored locally in `uploads/` directory
- **Email Fallback**: Auto-verification when email service is unavailable

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   
   **For Supabase:**
   ```bash
   # Verify your Supabase connection string
   # Should look like: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   
   # Check if PROJECT-REF and PASSWORD are correct
   # Go to Supabase Dashboard → Settings → Database → Connection string
   ```
   
   **For Local PostgreSQL:**
   ```bash
   # Check if PostgreSQL is running
   pg_isready -h localhost -p 5432
   
   # For Docker:
   docker ps | grep postgres
   ```

2. **Database Schema Issues**
   ```bash
   # If you get relation errors (table doesn't exist)
   npm run db:push --force
   
   # This will safely sync your schema with the database
   ```

3. **Environment Variables Not Loading**
   ```bash
   # Make sure .env file exists in root directory
   ls -la .env
   
   # Check .env format (no spaces around =)
   DATABASE_URL=your-url-here
   # NOT: DATABASE_URL = your-url-here
   ```

4. **Supabase Connection Issues**
   - Make sure you're using the "Transaction pooler" connection string, not Direct connection
   - Verify your database password is correct
   - Check that your project is not paused (free tier pauses after inactivity)
   - Ensure you're using the connection string from "Connect" → "ORMs" → "Transaction pooler"

5. **Email Not Sending**
   - Check Gmail app password is correct
   - Verify 2FA is enabled on Gmail
   - For development, users will be auto-verified (email is optional)

6. **Build Errors**
   ```bash
   # Clear dependencies and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Check Node.js version (need v18+)
   node --version
   ```

7. **TypeScript Errors**
   ```bash
   # Check types
   npm run check
   
   # Restart TypeScript server in your editor
   ```

8. **Session Issues**
   - Clear browser cookies and localStorage
   - Restart the development server
   - Verify SESSION_SECRET is set in .env
   - Check that database is accessible for session storage

9. **Port Already in Use**
   ```bash
   # Kill process using port 5000
   npx kill-port 5000
   
   # Or use a different port
   PORT=3000 npm run dev
   ```

### Getting Help

- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure database is running and accessible
- Check network connectivity for cloud databases

## ✅ Quick Setup Verification

After following the setup steps, verify everything works:

1. **Check database connection**:
   ```bash
   npm run dev
   # Look for: "🗃️  Database: Neon/Serverless" or "🗃️  Database: Local PostgreSQL"
   ```

2. **Test the application**:
   - Open `http://localhost:5000`
   - Click "Sign Up" tab
   - Register with email ending in `@vitstudent.ac.in` or `@gmail.com`
   - You should be automatically logged in (auto-verified in development)

3. **Check API endpoints**:
   ```bash
   # Test user endpoint (should return 401 when not logged in)
   curl http://localhost:5000/api/user
   
   # Test auth providers
   curl http://localhost:5000/api/auth/providers
   ```

4. **Verify database tables**:
   - All tables should be created automatically when you run `npm run db:push`
   - Check your database dashboard (Supabase or local pgAdmin) to see tables: users, items, wishlist, messages, etc.

**If everything works correctly, you should see:**
- ✅ Server running on port 5000
- ✅ Database connection established  
- ✅ Frontend loads without errors
- ✅ User registration works
- ✅ No console errors in browser dev tools

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Happy coding! 🎉**

For questions or support, please check the troubleshooting section above or open an issue in the repository.