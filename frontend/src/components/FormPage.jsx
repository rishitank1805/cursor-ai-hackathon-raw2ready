import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries } from '../utils/countries'
import { analyzeBusiness } from '../services/api'
import './FormPage.css'

const API_BASE_URL = 'http://localhost:8000'

const FormPage = () => {
  const navigate = useNavigate()
  
  // Load saved form data from localStorage or use defaults
  const loadSavedFormData = () => {
    const saved = localStorage.getItem('raw2ready_formData')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Don't restore file attachments from localStorage
        return { ...parsed, fileAttachments: [] }
      } catch (e) {
        console.error('Error loading saved form data:', e)
      }
    }
    return {
      businessName: '',
      city: '',
      country: '',
      targetAudience: '',
      budget: '',
      businessType: '',
      rawIdea: '',
      problem: '',
      fileAttachments: [],
      model: 'chatgpt-latest',
      timeCommitment: '',
      outputTone: '',
      language: '',
      stageOfIdea: '',
      timeHorizon: ''
    }
  }

  const [formData, setFormData] = useState(loadSavedFormData)

  // Load saved terms acceptance
  const loadSavedTerms = () => {
    const saved = localStorage.getItem('raw2ready_termsAccepted')
    return saved === 'true'
  }

  const [termsAccepted, setTermsAccepted] = useState(loadSavedTerms)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [filteredCountries, setFilteredCountries] = useState(countries)
  const fileInputRef = useRef(null)
  const countryInputRef = useRef(null)

  const handleChange = (e) => {
    const { name, value, files } = e.target
    if (files) {
      const fileArray = Array.from(files)
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: [...prev[name], ...fileArray]
        }
        // Save to localStorage (without files)
        const { fileAttachments, ...dataToSave } = updated
        localStorage.setItem('raw2ready_formData', JSON.stringify(dataToSave))
        return updated
      })
      // Clear the input value so it doesn't show the filename
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else {
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: value
        }
        // Save to localStorage (without files)
        const { fileAttachments, ...dataToSave } = updated
        localStorage.setItem('raw2ready_formData', JSON.stringify(dataToSave))
        return updated
      })
      
      // Handle country autocomplete
      if (name === 'country') {
        const filtered = countries.filter(country =>
          country.toLowerCase().includes(value.toLowerCase())
        )
        setFilteredCountries(filtered)
        setShowCountryDropdown(value.length > 0 && filtered.length > 0)
      }
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleCountrySelect = (country) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        country: country
      }
      // Save to localStorage
      const { fileAttachments, ...dataToSave } = updated
      localStorage.setItem('raw2ready_formData', JSON.stringify(dataToSave))
      return updated
    })
    setShowCountryDropdown(false)
    setFilteredCountries(countries)
  }

  const handleCountryFocus = () => {
    if (formData.country) {
      const filtered = countries.filter(country =>
        country.toLowerCase().includes(formData.country.toLowerCase())
      )
      setFilteredCountries(filtered)
      setShowCountryDropdown(filtered.length > 0)
    } else {
      setFilteredCountries(countries)
      setShowCountryDropdown(true)
    }
  }

  const handleCountryBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      setShowCountryDropdown(false)
    }, 200)
  }

  const handleRemoveFile = (index) => {
    setFormData(prev => ({
      ...prev,
      fileAttachments: prev.fileAttachments.filter((_, i) => i !== index)
    }))
    // Clear the input value when removing files
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.country.trim()) newErrors.country = 'Country is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.rawIdea.trim()) newErrors.rawIdea = 'Raw idea is required'
    if (!formData.timeCommitment) newErrors.timeCommitment = 'Time commitment is required'
    if (!termsAccepted) newErrors.terms = 'You must accept the terms and conditions'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Map form model to backend model ID
  const getModelSelection = () => {
    return formData.model === 'gemini' ? 'google-gemini-flash' : 'chatgpt-latest'
  }

  // Read first text file as file_content (optional)
  const readFileContent = (files) => {
    if (!files?.length) return Promise.resolve(null)
    const textExtensions = ['.txt', '.md', '.csv']
    const textFile = Array.from(files).find(f => {
      const name = (f.name || '').toLowerCase()
      return textExtensions.some(ext => name.endsWith(ext))
    })
    if (!textFile) return Promise.resolve(null)
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsText(textFile)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setApiError(null)

    try {
      const fileContent = await readFileContent(formData.fileAttachments)

      const requestBody = {
        business_name: formData.businessName.trim() || 'My Business',
        location_city: formData.city.trim() || '',
        country: formData.country.trim(),
        target_audience: formData.targetAudience.trim() || null,
        budget: formData.budget.trim() || null,
        business_type: formData.businessType || null,
        raw_idea: formData.rawIdea.trim(),
        problem: formData.problem.trim() || null,
        file_content: fileContent || null,
        photos_description: null,
        model_selection: getModelSelection(),
      }

      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Research failed (${response.status})`)
      }

      const analysisData = await response.json()

      const businessContext = {
        business_name: formData.businessName.trim() || 'My Business',
        raw_idea: formData.rawIdea.trim(),
        problem: formData.problem.trim() || null,
        target_audience: formData.targetAudience.trim() || null,
        location_city: formData.city.trim() || null,
        country: formData.country.trim() || null,
        budget: formData.budget.trim() || null,
        business_type: formData.businessType || null,
      }

      navigate('/results', {
        state: {
          analysisData,
          businessContext,
        },
      })
    } catch (err) {
      setApiError(err.message || 'Research failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="form-page">
      <div className="form-container">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1 className="form-title">Tell Us About Your Business</h1>
        <p className="form-subtitle">Fill in the details to get started</p>

        <form onSubmit={handleSubmit} className="business-form">
          <div className="form-grid">
            {/* Business Name */}
            <div className="form-group">
              <label htmlFor="businessName">Business Name</label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Enter your business name"
                className="form-input"
              />
            </div>

            {/* Location - Country & City */}
            <div className="form-group">
              <label htmlFor="country">Country <span className="required">*</span></label>
              <div className="country-input-wrapper">
                <input
                  ref={countryInputRef}
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  onFocus={handleCountryFocus}
                  onBlur={handleCountryBlur}
                  placeholder="Type to search country..."
                  className={`form-input ${errors.country ? 'error' : ''}`}
                  autoComplete="off"
                />
                {showCountryDropdown && filteredCountries.length > 0 && (
                  <div className="country-dropdown">
                    {filteredCountries.slice(0, 10).map((country, index) => (
                      <div
                        key={index}
                        className="country-dropdown-item"
                        onClick={() => handleCountrySelect(country)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {country}
                      </div>
                    ))}
                    {filteredCountries.length > 10 && (
                      <div className="country-dropdown-more">
                        +{filteredCountries.length - 10} more
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.country && <span className="error-message">{errors.country}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="city">City <span className="required">*</span></label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                className={`form-input ${errors.city ? 'error' : ''}`}
              />
            </div>

            {/* Target Audience */}
            <div className="form-group">
              <label htmlFor="targetAudience">Target Audience</label>
              <input
                type="text"
                id="targetAudience"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder="Who is your target audience?"
                className="form-input"
              />
            </div>

            {/* Budget */}
            <div className="form-group">
              <label htmlFor="budget">Budget</label>
              <input
                type="text"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget range"
                className="form-input"
              />
            </div>

            {/* Business Type */}
            <div className="form-group">
              <label htmlFor="businessType">Business Type</label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select business type</option>
                <option value="b2b">B2B (Business to Business)</option>
                <option value="b2c">B2C (Business to Consumer)</option>
                <option value="b2g">B2G (Business to Government)</option>
                <option value="c2c">C2C (Consumer to Consumer)</option>
                <option value="b2b2c">B2B2C (Business to Business to Consumer)</option>
              </select>
            </div>

            {/* Raw Idea */}
            <div className="form-group full-width">
              <label htmlFor="rawIdea">Raw Idea <span className="required">*</span></label>
              <textarea
                id="rawIdea"
                name="rawIdea"
                value={formData.rawIdea}
                onChange={handleChange}
                placeholder="Describe your raw business idea..."
                rows="5"
                className={`form-input ${errors.rawIdea ? 'error' : ''}`}
              />
              {errors.rawIdea && <span className="error-message">{errors.rawIdea}</span>}
            </div>

            {/* Problem */}
            <div className="form-group full-width">
              <label htmlFor="problem">Problem</label>
              <textarea
                id="problem"
                name="problem"
                value={formData.problem}
                onChange={handleChange}
                placeholder="What problem does your business solve?"
                rows="4"
                className="form-input"
              />
            </div>

            {/* File Attachments */}
            <div className="form-group full-width">
              <label htmlFor="fileAttachments">File Attachments</label>
              <div className="file-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="fileAttachments"
                  name="fileAttachments"
                  onChange={handleChange}
                  className="form-input file-input"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
                  multiple
                />
              </div>
              {formData.fileAttachments.length > 0 && (
                <div className="file-list">
                  {formData.fileAttachments.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="remove-file-btn"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model */}
            <div className="form-group">
              <label htmlFor="model">AI Model</label>
              <select
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="form-input"
              >
                <option value="chatgpt-latest">ChatGPT 5.2 Latest (OpenAI)</option>
                <option value="google-gemini-flash">Gemini 2.5 Flash (Google)</option>
              </select>
            </div>

            {/* Time Commitment */}
            <div className="form-group">
              <label htmlFor="timeCommitment">Time Commitment <span className="required">*</span></label>
              <select
                id="timeCommitment"
                name="timeCommitment"
                value={formData.timeCommitment}
                onChange={handleChange}
                className={`form-input ${errors.timeCommitment ? 'error' : ''}`}
              >
                <option value="">Select time commitment</option>
                <option value="part-time">Part Time</option>
                <option value="full-time">Full Time</option>
              </select>
              {errors.timeCommitment && <span className="error-message">{errors.timeCommitment}</span>}
            </div>

            {/* Output Tone/Style */}
            <div className="form-group">
              <label htmlFor="outputTone">Output Tone/Style</label>
              <select
                id="outputTone"
                name="outputTone"
                value={formData.outputTone}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select tone</option>
                <option value="professional">Professional</option>
                <option value="neutral">Neutral</option>
                <option value="technical">Technical</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            {/* Language */}
            <div className="form-group">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            {/* Stage of Idea */}
            <div className="form-group">
              <label htmlFor="stageOfIdea">Stage of the Idea</label>
              <select
                id="stageOfIdea"
                name="stageOfIdea"
                value={formData.stageOfIdea}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select stage</option>
                <option value="concept">Concept</option>
                <option value="validation">Validation</option>
                <option value="development">Development</option>
                <option value="launch">Launch</option>
                <option value="growth">Growth</option>
              </select>
            </div>

            {/* Time Horizon */}
            <div className="form-group">
              <label htmlFor="timeHorizon">Time Horizon (Vision Related)</label>
              <select
                id="timeHorizon"
                name="timeHorizon"
                value={formData.timeHorizon}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Select time horizon</option>
                <option value="3-4-months">3-4 months</option>
                <option value="6-8-months">6-8 months</option>
                <option value="1-3-years">1-3 years</option>
                <option value="more-than-5-years">More than 5 years</option>
              </select>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="terms-group">
            <label className="terms-label">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  const value = e.target.checked
                  setTermsAccepted(value)
                  localStorage.setItem('raw2ready_termsAccepted', value.toString())
                  if (errors.terms) {
                    setErrors(prev => ({
                      ...prev,
                      terms: ''
                    }))
                  }
                }}
                className="terms-checkbox"
              />
              <span>I accept the terms and conditions <span className="required">*</span></span>
            </label>
            {errors.terms && <span className="error-message">{errors.terms}</span>}
          </div>

          {apiError && (
            <div className="api-error-banner">
              {apiError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Researching...
              </>
            ) : (
              'Submit & Run Research'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default FormPage

