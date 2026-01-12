import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface SchoolInfo {
  id: number
  name: string
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  phone: string
  fax: string
  email: string
  website: string
  principal_name: string
  principal_email: string
  founded_year: string
  mission_statement: string
  vision_statement: string
  motto: string
  logo_url: string
  crest_url: string
  banner_url: string
  accreditation: string
  curriculum_type: string
  school_colors: string
  is_active: boolean
}

export function SchoolInfoPage() {
  const navigate = useNavigate()
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<SchoolInfo>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [crestFile, setCrestFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [crestPreview, setCrestPreview] = useState<string>('')
  const [bannerPreview, setBannerPreview] = useState<string>('')

  useEffect(() => {
    loadSchoolInfo()
  }, [])

  async function loadSchoolInfo() {
    setLoading(true)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    
    try {
      const response = await fetch(`${apiUrl}/api/school-info/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        setSchoolInfo(result.data)
        setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading school info:', error)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    
    try {
      // Save school information
      const response = await fetch(`${apiUrl}/api/school-info/info`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save school information')
      }
      
      // Upload logo if selected
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        
        await fetch(`${apiUrl}/api/school-info/logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: logoFormData
        })
      }
      
      // Upload crest if selected
      if (crestFile) {
        const crestFormData = new FormData()
        crestFormData.append('crest', crestFile)
        
        await fetch(`${apiUrl}/api/school-info/crest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: crestFormData
        })
      }
      
      // Upload banner if selected
      if (bannerFile) {
        const bannerFormData = new FormData()
        bannerFormData.append('banner', bannerFile)
        
        await fetch(`${apiUrl}/api/school-info/banner`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: bannerFormData
        })
      }
      
      setEditMode(false)
      setLogoFile(null)
      setCrestFile(null)
      setBannerFile(null)
      setLogoPreview('')
      setCrestPreview('')
      setBannerPreview('')
      await loadSchoolInfo()
    } catch (error) {
      console.error('Error saving school info:', error)
      alert('Failed to save school information')
    }
    setSaving(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'crest' | 'banner') {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      const preview = reader.result as string
      if (type === 'logo') {
        setLogoFile(file)
        setLogoPreview(preview)
      } else if (type === 'crest') {
        setCrestFile(file)
        setCrestPreview(preview)
      } else {
        setBannerFile(file)
        setBannerPreview(preview)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleDeleteImage(type: 'logo' | 'crest' | 'banner') {
    if (!confirm(`Are you sure you want to delete the ${type}?`)) return
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = localStorage.getItem('access_token')
    
    try {
      await fetch(`${apiUrl}/api/school-info/${type}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      await loadSchoolInfo()
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
      alert(`Failed to delete ${type}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading school information...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">School Information</h1>
            <p className="text-gray-600 mt-1">Manage school details and branding</p>
          </div>
          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData(schoolInfo || {})
                    setLogoFile(null)
                    setCrestFile(null)
                    setBannerFile(null)
                    setLogoPreview('')
                    setCrestPreview('')
                    setBannerPreview('')
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: '#5B8C51' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Edit Information
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branding Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Logo */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">School Logo</h2>
              <div className="space-y-4">
                {(logoPreview || schoolInfo?.logo_url) && (
                  <div className="relative">
                    <img
                      src={logoPreview || `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${schoolInfo?.logo_url}`}
                      alt="Logo"
                      className="w-full h-48 object-contain bg-gray-50 rounded-lg"
                    />
                    {editMode && (
                      <button
                        onClick={() => handleDeleteImage('logo')}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                {editMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Crest */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">School Crest</h2>
              <div className="space-y-4">
                {(crestPreview || schoolInfo?.crest_url) && (
                  <div className="relative">
                    <img
                      src={crestPreview || `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${schoolInfo?.crest_url}`}
                      alt="Crest"
                      className="w-full h-48 object-contain bg-gray-50 rounded-lg"
                    />
                    {editMode && (
                      <button
                        onClick={() => handleDeleteImage('crest')}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                {editMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'crest')}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Banner */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">School Banner</h2>
              <div className="space-y-4">
                {(bannerPreview || schoolInfo?.banner_url) && (
                  <div className="relative">
                    <img
                      src={bannerPreview || `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${schoolInfo?.banner_url}`}
                      alt="Banner"
                      className="w-full h-32 object-cover bg-gray-50 rounded-lg"
                    />
                    {editMode && (
                      <button
                        onClick={() => handleDeleteImage('banner')}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                {editMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'banner')}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">School Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Founded Year</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.founded_year || ''}
                      onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.founded_year}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.address}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State/Province</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.state}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.country}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Postal Code</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.postal_code || ''}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.postal_code}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fax</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.fax || ''}
                      onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.fax}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.website}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Principal Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Principal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Principal Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.principal_name || ''}
                      onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.principal_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Principal Email</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.principal_email || ''}
                      onChange={(e) => setFormData({ ...formData, principal_email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.principal_email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* School Identity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">School Identity</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Motto</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.motto || ''}
                      onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.motto}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mission Statement</label>
                  {editMode ? (
                    <textarea
                      value={formData.mission_statement || ''}
                      onChange={(e) => setFormData({ ...formData, mission_statement: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg h-24"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.mission_statement}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vision Statement</label>
                  {editMode ? (
                    <textarea
                      value={formData.vision_statement || ''}
                      onChange={(e) => setFormData({ ...formData, vision_statement: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg h-24"
                    />
                  ) : (
                    <p className="text-gray-700">{schoolInfo?.vision_statement}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Accreditation</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.accreditation || ''}
                        onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-700">{schoolInfo?.accreditation}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Curriculum Type</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.curriculum_type || ''}
                        onChange={(e) => setFormData({ ...formData, curriculum_type: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-700">{schoolInfo?.curriculum_type}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">School Colors</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.school_colors || ''}
                        onChange={(e) => setFormData({ ...formData, school_colors: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-700">{schoolInfo?.school_colors}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
