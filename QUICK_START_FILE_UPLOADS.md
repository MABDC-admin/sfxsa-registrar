# Quick Start Guide: File Upload System

## 🎯 For Teachers

### **Upload Lesson Materials**

1. **Access the Page:**
   ```
   Click "📝 Lessons" in the sidebar
   ```

2. **Add New Material:**
   ```
   Click "+ Add Material" button (top right)
   ```

3. **Fill the Form:**
   - **Title:** "Introduction to Algebra"
   - **Description:** "Basic algebraic concepts and equations"
   - **Subject:** Select from dropdown (Math, Science, etc.)
   - **Grade Level:** Select grade (K-12)
   - **Content Type:** Choose one:
     - 📄 Document (PDF, Word, PowerPoint, Excel)
     - 🎬 Video (Upload file OR paste YouTube link)
     - 🖼️ Image (JPG, PNG, GIF)

4. **Upload Files:**
   
   **Option A - Drag & Drop:**
   - Drag file from computer to the upload zone
   - Watch progress bar fill up
   - See "✓ Uploaded" when complete

   **Option B - Click to Select:**
   - Click on upload zone
   - Choose file from file picker
   - Wait for upload to complete

   **Option C - YouTube (for videos only):**
   - Paste YouTube URL in text box
   - See live preview appear
   - Video ID automatically extracted

5. **Publish Settings:**
   - ✅ Check "Publish immediately" to make visible to students
   - ❌ Uncheck to save as draft

6. **Save:**
   ```
   Click "Add Material" button
   ```

### **Edit Existing Material**
```
1. Find the material card
2. Click "Edit" button
3. Modify fields
4. Click "Update"
```

### **Delete Material**
```
1. Find the material card
2. Click "Delete" button
3. Confirm deletion
```

---

## 🎓 For Students

### **Browse Materials**

1. **Access the Page:**
   ```
   Click "📝 Lessons" in the sidebar
   ```

2. **Filter Content:**
   - **Subject:** Dropdown menu - Choose your subject
   - **Grade Level:** Select your grade
   - **Content Type:** All, Documents, Videos, or Images
   - **View Mode:** Toggle between Grid and List

3. **View Material:**
   - Click on any material card
   - Documents: Click to download
   - Videos: Watch embedded player
   - Images: View inline

---

## 💻 For Developers

### **File Upload Utility**

```typescript
import { uploadFileToDatabase } from '../lib/fileUpload'

// Upload a file
const result = await uploadFileToDatabase(
  file,              // File object from input
  userId,            // Current user ID
  'lessons',         // Folder for organization
  'Course material'  // Optional description
)

if (result.success) {
  console.log('File URL:', result.fileUrl)
  console.log('File ID:', result.fileId)
} else {
  console.error('Error:', result.error)
}
```

### **File Upload Component**

```tsx
import { FileUpload } from '../components/FileUpload'

<FileUpload
  userId={profile.id}
  folder="assignments"
  category="document"  // or "image", "video", "all"
  maxSizeMB={50}
  multiple={true}
  onUploadComplete={(results) => {
    console.log('Uploaded:', results)
  }}
/>
```

### **YouTube Embed**

```tsx
import { YouTubeEmbed, YouTubeInput } from '../components/YouTubeEmbed'

// Display embedded video
<YouTubeEmbed 
  videoId="dQw4w9WgXcQ" 
  autoplay={false}
/>

// URL input with preview
<YouTubeInput
  onVideoSelect={(videoId, url) => {
    console.log('Selected:', videoId)
  }}
/>
```

### **Database Queries**

```typescript
// Get all lesson materials
const { data } = await api
  .from('lesson_materials')
  .select(`
    *,
    subjects(name, icon),
    profiles(full_name)
  `)
  .eq('is_published', true)
  .order('created_at', { ascending: false })

// Insert new material
await api
  .from('lesson_materials')
  .insert({
    title: 'My Lesson',
    subject_id: 'uuid-here',
    grade_level: 'Grade 10',
    teacher_id: profile.id,
    file_url: '/api/files/file-id',
    content_type: 'document',
    is_published: true
  })
```

---

## 🗃️ Database Schema

### **lesson_materials**
```sql
CREATE TABLE lesson_materials (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID → subjects(id),
  grade_level TEXT,
  teacher_id UUID → profiles(id),
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  video_url TEXT,
  youtube_embed_id TEXT,
  content_type TEXT,  -- document, video, image
  is_published BOOLEAN,
  view_count INTEGER,
  school_year TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### **storage_blobs**
```sql
CREATE TABLE storage_blobs (
  id UUID PRIMARY KEY,
  name TEXT,
  mime_type TEXT,
  content TEXT,  -- base64 encoded
  size INTEGER,
  uploaded_by UUID → profiles(id),
  folder TEXT,
  description TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ
);
```

---

## 🔒 Permissions

| Role | Create | Edit Own | Edit All | Delete | View Published | View Drafts |
|------|--------|----------|----------|--------|----------------|-------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Teacher | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ (own) |
| Student | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Principal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registrar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📋 Supported File Types

### **Documents:**
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Text (.txt)

### **Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### **Videos:**
- MP4 (.mp4)
- MOV (.mov)
- AVI (.avi)
- YouTube links

### **Archives:**
- ZIP (.zip)
- RAR (.rar)
- 7Z (.7z)

---

## ⚙️ Configuration

### **Max File Size:**
Default: **50MB**  
Configure in `fileUpload.ts`:
```typescript
export async function uploadFileToDatabase(
  file: File,
  userId: string,
  folder: string = 'general',
  description?: string
): Promise<FileUploadResult> {
  const validationError = validateFile(file, 50) // Change here
  // ...
}
```

### **Allowed File Types:**
Modify arrays in `fileUpload.ts`:
```typescript
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  // Add more types here
]
```

---

## 🐛 Troubleshooting

### **Files not uploading?**
1. Check file size (must be < 50MB)
2. Verify file type is allowed
3. Check browser console for errors
4. Ensure database connection is active

### **YouTube videos not showing?**
1. Verify URL format is correct
2. Check video is not private/restricted
3. Test with a known-working YouTube URL
4. Check browser console for errors

### **Permission denied?**
1. Verify user role has access
2. Check `is_published` status for students
3. Ensure user is authenticated
4. Review role_module_permissions table

### **Database errors?**
1. Run migration: `cd backend && npm run migrate`
2. Check Railway PostgreSQL connection
3. Verify DATABASE_URL environment variable
4. Check foreign key constraints

---

## 📞 Support

For issues or questions:
1. Check `PHASE2_FILE_UPLOADS_IMPLEMENTATION.md` for detailed documentation
2. Review browser console for error messages
3. Check database logs in Railway dashboard
4. Verify migration 004 was applied successfully

---

**Last Updated:** January 12, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
