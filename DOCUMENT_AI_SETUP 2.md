# Google Cloud Document AI Setup Guide

This guide will help you set up Google Cloud Document AI for advanced PDF parsing in your application.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **Google Cloud Project**: Create a new project or use an existing one
3. **Document AI API**: Enable the Document AI API in your project

## Step 1: Enable Document AI API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Document AI API"
5. Click "Enable"

## Step 2: Create a Document AI Processor

1. Go to [Document AI](https://console.cloud.google.com/ai/document-ai)
2. Click "Create Processor"
3. Choose "Form Parser" (recommended for general document processing)
4. Give your processor a name (e.g., "supplier-documents")
5. Choose your region (e.g., "us-central1")
6. Click "Create"

## Step 3: Get Your Configuration Values

After creating the processor, you'll need these values:

1. **Project ID**: Found in your Google Cloud Console dashboard
2. **Location**: The region you chose (e.g., "us", "us-central1")
3. **Processor ID**: Found in the processor details page

## Step 4: Set Up Authentication

### Option A: Service Account (Recommended for Production)

1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Give it a name and description
4. Grant the "Document AI API User" role
5. Create and download the JSON key file
6. Set the environment variable: `GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json`

### Option B: Application Default Credentials (Development)

1. Install Google Cloud CLI: `gcloud auth application-default login`
2. This will automatically use your user credentials

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
# Google Cloud Document AI Configuration
VITE_GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
VITE_GOOGLE_CLOUD_LOCATION=us
VITE_DOCUMENT_AI_PROCESSOR_ID=your_processor_id_here
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Upload a PDF file with tables
3. Check the browser console for Document AI processing logs
4. The system will automatically fall back to basic parsing if Document AI is not configured

## Features

With Document AI enabled, you get:

- **High Accuracy**: 95%+ accuracy for table extraction
- **Multi-Table Support**: Extract multiple tables from complex documents
- **Entity Recognition**: Automatically identify names, addresses, prices, etc.
- **Layout Understanding**: Preserves document structure and formatting
- **Confidence Scores**: Know how confident the AI is about each extraction

## Troubleshooting

### Common Issues

1. **"Document AI not configured"**: Check your environment variables
2. **Authentication errors**: Verify your service account has the correct permissions
3. **Processor not found**: Ensure the processor ID is correct and the processor is active
4. **Quota exceeded**: Check your Google Cloud billing and quotas

### Fallback Behavior

If Document AI is not configured or fails, the system automatically falls back to:
- Basic PDF text extraction
- Pattern-based table detection
- Manual column mapping

## Pricing

Document AI pricing is based on:
- Number of pages processed
- API calls made
- Storage used

Check the [Document AI pricing page](https://cloud.google.com/document-ai/pricing) for current rates.

## Support

- [Document AI Documentation](https://cloud.google.com/document-ai/docs)
- [Google Cloud Support](https://cloud.google.com/support)
- [Document AI Community](https://cloud.google.com/document-ai/community)
