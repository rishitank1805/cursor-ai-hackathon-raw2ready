import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries } from '../utils/countries'
import { analyzeBusiness } from '../services/api'
import './FormPage.css'

// Use relative URL so Vite proxy (dev) or same-origin (prod) forwards to backend
const API_BASE_URL = ''

const FormPage = () => {
  const navigate = useNavigate()
  
  // Load saved form data from localStorage or use defaults
  const loadSavedFormData = () => {
    const saved = localStorage.getItem('raw2ready_formData')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return parsed
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
      model: 'chatgpt-latest',
      timeCommitment: '',
      outputTone: '',
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      // Save to localStorage
      localStorage.setItem('raw2ready_formData', JSON.stringify(updated))
      return updated
    })
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Country must be selected from dropdown (not empty and must be in countries list)
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required'
    } else if (!countries.includes(formData.country)) {
      newErrors.country = 'Please select a country from the dropdown'
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setApiError(null)

    try {
      const requestBody = {
        business_name: formData.businessName.trim() || 'My Business',
        location_city: formData.city.trim() || '',
        country: formData.country.trim(),
        target_audience: formData.targetAudience.trim() || null,
        budget: formData.budget.trim() || null,
        business_type: formData.businessType || null,
        raw_idea: formData.rawIdea.trim(),
        problem: formData.problem.trim() || null,
        file_content: null,
        photos_description: null,
        model_selection: getModelSelection(),
        time_commitment: formData.timeCommitment || null,
        output_tone: formData.outputTone || null,
        language: 'en', // Always English
        stage_of_idea: formData.stageOfIdea || null,
        time_horizon: formData.timeHorizon || null,
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

      // Use AI-suggested business name for presentation title when available
      const businessNameForPresentation = analysisData.suggested_business_name?.trim() || formData.businessName.trim() || 'My Business'

      const businessContext = {
        business_name: businessNameForPresentation,
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
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      const message = isNetworkError
        ? 'Could not reach the server. Make sure the backend is running (e.g. uvicorn on port 8000) and you are using the dev server (npm run dev).'
        : (err.message || 'Research failed. Please try again.')
      setApiError(message)
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
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={`form-input ${errors.country ? 'error' : ''}`}
              >
                <option value="">Select a country</option>
                {countries.map((country, index) => (
                  <option key={index} value={country}>
                    {country}
                  </option>
                ))}
              </select>
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

