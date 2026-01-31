import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './PresentationPage.css'

const API_BASE_URL = 'http://localhost:8000'

const PresentationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const businessContext = location.state?.businessContext || {}
  const [formData, setFormData] = useState({
    numberOfSlides: '10',
    timeRequired: '5'
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [presentation, setPresentation] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState(null)

  const handleBack = () => {
    navigate('/results')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validatePptForm = () => {
    const newErrors = {}
    if (!formData.numberOfSlides.trim() || isNaN(formData.numberOfSlides) || parseInt(formData.numberOfSlides) < 5 || parseInt(formData.numberOfSlides) > 15) {
      newErrors.numberOfSlides = 'Please enter a number between 5 and 15'
    }
    if (!formData.timeRequired.trim() || isNaN(formData.timeRequired) || parseFloat(formData.timeRequired) < 3 || parseFloat(formData.timeRequired) > 15) {
      newErrors.timeRequired = 'Please enter a time between 3 and 15 minutes'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePresentation = async (e) => {
    e.preventDefault()
    if (!validatePptForm()) return
    setIsLoading(true)
    setError(null)
    try {
      const requestBody = {
        business_name: businessContext.business_name || 'My Business',
        raw_idea: businessContext.raw_idea || 'A business idea',
        tagline: businessContext.tagline || null,
        problem: businessContext.problem || null,
        target_audience: businessContext.target_audience || null,
        location_city: businessContext.location_city || null,
        country: businessContext.country || null,
        budget: businessContext.budget || null,
        business_type: businessContext.business_type || null,
        competing_players: businessContext.competing_players || null,
        market_cap_or_target_revenue: businessContext.market_cap_or_target_revenue || null,
        undiscovered_addons: businessContext.undiscovered_addons || null,
        num_slides: parseInt(formData.numberOfSlides),
        duration_minutes: parseInt(formData.timeRequired),
      }
      const response = await fetch(`${API_BASE_URL}/api/presentation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate presentation')
      }
      const data = await response.json()
      setPresentation(data)
      setCurrentSlide(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPresentation = async (e) => {
    e.preventDefault()
    if (!editPrompt.trim() || !presentation) return
    setIsEditing(true)
    setError(null)
    try {
      const requestBody = {
        current_presentation: presentation.slides,
        edit_request: editPrompt,
        business_context: businessContext,
      }
      const response = await fetch(`${API_BASE_URL}/api/presentation/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to edit presentation')
      }
      const data = await response.json()
      setPresentation(data)
      setEditPrompt('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDownloadPptx = async () => {
    if (!presentation?.slides?.length) return
    setIsDownloading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/presentation/export-pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation: {
            slides: presentation.slides,
            total_duration_minutes: presentation.total_duration_minutes,
            presentation_title: presentation.presentation_title,
            generated_tagline: presentation.generated_tagline ?? null,
          },
          business_name: businessContext?.business_name ?? null,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to export PPTX')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('Content-Disposition')
      const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/)
      const filename = filenameMatch ? filenameMatch[1] : 'presentation.pptx'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsDownloading(false)
    }
  }

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    if (presentation && currentSlide < presentation.slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  // Render the configuration form
  const renderConfigForm = () => (
    <div className="presentation-config">
      <h1 className="presentation-title">Create Your Presentation</h1>
      <p className="presentation-subtitle">Configure your presentation settings</p>

      <form onSubmit={handleCreatePresentation} className="presentation-form">
        <div className="form-group">
          <label htmlFor="numberOfSlides">
            Number of Slides <span className="required">*</span>
          </label>
          <input
            type="number"
            id="numberOfSlides"
            name="numberOfSlides"
            value={formData.numberOfSlides}
            onChange={handleChange}
            placeholder="Enter number of slides (5-15)"
            min="5"
            max="15"
            className={`form-input ${errors.numberOfSlides ? 'error' : ''}`}
          />
          {errors.numberOfSlides && (
            <span className="error-message">{errors.numberOfSlides}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="timeRequired">
            Presentation Duration (minutes) <span className="required">*</span>
          </label>
          <input
            type="number"
            id="timeRequired"
            name="timeRequired"
            value={formData.timeRequired}
            onChange={handleChange}
            placeholder="Enter time in minutes (3-15)"
            min="3"
            max="15"
            className={`form-input ${errors.timeRequired ? 'error' : ''}`}
          />
          {errors.timeRequired && (
            <span className="error-message">{errors.timeRequired}</span>
          )}
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="create-presentation-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Generating Presentation...
            </>
          ) : (
            'Create Presentation'
          )}
        </button>
      </form>
    </div>
  )

  // Render the presentation viewer
  const renderPresentationViewer = () => {
    if (!presentation || !presentation.slides || presentation.slides.length === 0) {
      return null
    }

    const slide = presentation.slides[currentSlide]

    return (
      <div className="presentation-viewer">
        <div className="viewer-header">
          <h1 className="presentation-main-title">{presentation.presentation_title}</h1>
          {presentation.generated_tagline && (
            <p className="presentation-tagline">{presentation.generated_tagline}</p>
          )}
          <p className="presentation-duration">
            Total Duration: {presentation.total_duration_minutes} minutes
          </p>
          <button
            type="button"
            className="download-pptx-button"
            onClick={handleDownloadPptx}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="spinner"></span>
                Building PPTX...
              </>
            ) : (
              '↓ Download PPTX'
            )}
          </button>
        </div>

        {/* Slide Display */}
        <div className="slide-container">
          <div className="slide">
            <div className="slide-number">Slide {slide.slide_number} of {presentation.slides.length}</div>
            <h2 className="slide-title">{slide.title}</h2>
            {slide.subtitle && (
              <p className="slide-subtitle">{slide.subtitle}</p>
            )}
            <ul className="slide-content">
              {slide.content.map((point, index) => (
                <li key={index} className="slide-point">{point}</li>
              ))}
            </ul>
            {slide.speaker_notes && (
              <div className="speaker-notes">
                <strong>Speaker Notes:</strong> {slide.speaker_notes}
              </div>
            )}
            {slide.duration_seconds && (
              <div className="slide-duration">
                ~{Math.round(slide.duration_seconds / 60 * 10) / 10} min
              </div>
            )}
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="slide-navigation">
          <button 
            className="nav-button prev"
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            ← Previous
          </button>
          
          <div className="slide-indicators">
            {presentation.slides.map((_, index) => (
              <button
                key={index}
                className={`slide-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                title={`Slide ${index + 1}`}
              />
            ))}
          </div>
          
          <button 
            className="nav-button next"
            onClick={nextSlide}
            disabled={currentSlide === presentation.slides.length - 1}
          >
            Next →
          </button>
        </div>

        {/* Slide Thumbnails */}
        <div className="slide-thumbnails">
          {presentation.slides.map((s, index) => (
            <div
              key={index}
              className={`thumbnail ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
            >
              <div className="thumbnail-number">{s.slide_number}</div>
              <div className="thumbnail-title">{s.title}</div>
            </div>
          ))}
        </div>

        {/* Edit Prompt Box */}
        <div className="edit-section">
          <h3 className="edit-title">Make Changes to Your Presentation</h3>
          <form onSubmit={handleEditPresentation} className="edit-form">
            <textarea
              className="edit-input"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe the changes you'd like to make... (e.g., 'Add more details to slide 3', 'Make the tone more formal', 'Add a slide about team experience')"
              rows="3"
            />
            {error && <div className="error-banner">{error}</div>}
            <button 
              type="submit" 
              className="edit-button"
              disabled={isEditing || !editPrompt.trim()}
            >
              {isEditing ? (
                <>
                  <span className="spinner"></span>
                  Updating...
                </>
              ) : (
                'Apply Changes'
              )}
            </button>
          </form>
        </div>

        {/* Actions */}
        <div className="regenerate-section actions-row">
          <button
            type="button"
            className="download-pptx-button secondary"
            onClick={handleDownloadPptx}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="spinner"></span>
                Building PPTX...
              </>
            ) : (
              '↓ Download PowerPoint (.pptx)'
            )}
          </button>
          <button 
            className="regenerate-button"
            onClick={() => setPresentation(null)}
          >
            ← Start Over with New Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="presentation-page">
      <div className="presentation-container">
        <button onClick={handleBack} className="back-button">
          ← Back to Results
        </button>
        {!presentation ? renderConfigForm() : renderPresentationViewer()}
      </div>
    </div>
  )
}

export default PresentationPage
