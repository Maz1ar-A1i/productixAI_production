# Supabase + Render Setup Guide for ProductixAI

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or login with: `rahmat@irp.edu.pk`
3. Click **"New Project"**
4. Fill in:
   - **Project name**: `productix-ai`
   - **Database password**: `Pakistan786` (or secure password)
   - **Region**: Choose closest to your users (e.g., Asia)
   - Click **Create new project**

5. Wait for project to initialize (5-10 minutes)

## Step 2: Get Database Credentials

Once project is created:
1. Go to **Settings** → **Database**
2. Copy the **Connection String** (URI):
   ```
   postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require
   ```
3. Or use the simpler format from **Connection Pooling**:
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]
   ```

## Step 3: Update Local Database URL

In [productix_fastapi/app/database.py](productix_fastapi/app/database.py), replace:

```python
DATABASE_URL = "postgresql://[user]:[password]@[host]:5432/postgres?sslmode=require"
```

## Step 4: Deploy on Render

### 4a. Push code to GitHub

```powershell
cd e:\ProductixAI
git add .
git commit -m "Initial commit with SQLite fallback"
git push origin main
```

### 4b. Connect to Render

1. Go to [https://render.com](https://render.com)
2. Sign up and connect your GitHub account
3. Click **"New+"** → **"Web Service"**
4. Select your ProductixAI repository
5. Configure:
   - **Name**: `productix-ai-backend`
   - **Environment**: `Python 3.10`
   - **Build Command**: 
     ```
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```
     uvicorn productix_fastapi.app.main1:app --host 0.0.0.0 --port 8000
     ```

### 4c. Set Environment Variables

In Render Dashboard, go to **Environment** and add:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/postgres?sslmode=require
```

### 4d. Deploy

Click **"Create Web Service"** and wait for deployment ✅

---

## Step 5: Update Frontend API URL

In [project/.env](project/.env):

```
VITE_API_BASE_URL=https://your-render-app.onrender.com
```

Replace `your-render-app` with your actual Render service URL.

---

## Quick Checklist

- [ ] Supabase project created
- [ ] Database credentials copied
- [ ] Local database.py updated
- [ ] Code pushed to GitHub
- [ ] Render service created
- [ ] Environment variables set
- [ ] Frontend .env updated
- [ ] Backend API accessible

---

## Troubleshooting

### Connection Refused
- Check Supabase IP whitelist allows all IPs (0.0.0.0/0)
- Verify `sslmode=require` is in connection string

### Tenant or User Not Found
- Double-check password and username in connection string
- Reset database password in Supabase Settings

### Migration Issues
Run in Render terminal:
```bash
alembic upgrade head
```

Need help? Let me know!
