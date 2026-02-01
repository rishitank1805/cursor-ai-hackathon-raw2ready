import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './PresentationPage.css'

// Use relative URLs - Vite proxy will handle routing to backend
const API_BASE_URL = ''

const PresentationPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const businessContext = location.state?.businessContext || {}
  
  // State for which card is clicked
  const [activeCard, setActiveCard] = useState(null) // 'ppt' or 'video'
  
  // Load saved PPT form data from localStorage
  const loadSavedPptData = () => {
    const saved = localStorage.getItem('raw2ready_pptFormData')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading saved PPT form data:', e)
      }
    }
    return {
      numberOfSlides: '10',
      timeRequired: '5'
    }
  }

  // Load saved presentation from localStorage
  const loadSavedPresentation = () => {
    const saved = localStorage.getItem('raw2ready_presentation')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading saved presentation:', e)
      }
    }
    return null
  }

  // PPT Generation State
  const [pptFormData, setPptFormData] = useState(loadSavedPptData)
  const [pptErrors, setPptErrors] = useState({})
  const [isPptLoading, setIsPptLoading] = useState(false)
  const [presentation, setPresentation] = useState(loadSavedPresentation)
  const [currentSlide, setCurrentSlide] = useState(() => {
    const saved = localStorage.getItem('raw2ready_currentSlide')
    return saved ? parseInt(saved, 10) : 0
  })
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [pptError, setPptError] = useState(null)

  // Load saved Video form data from localStorage
  const loadSavedVideoData = () => {
    const saved = localStorage.getItem('raw2ready_videoFormData')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading saved video form data:', e)
      }
    }
    return {
      timeRequired: '',
      prompt: ''
    }
  }

  // Load saved generated video from localStorage
  const loadSavedVideo = () => {
    const saved = localStorage.getItem('raw2ready_generatedVideo')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading saved video:', e)
      }
    }
    return null
  }

  // Video Generation State
  const [videoFormData, setVideoFormData] = useState(loadSavedVideoData)
  const [videoErrors, setVideoErrors] = useState({})
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState(loadSavedVideo)
  const [videoError, setVideoError] = useState(null)

  const handleBack = () => {
    navigate('/results', {
      state: {
        analysisData: location.state?.analysisData,
        businessContext: location.state?.businessContext || businessContext,
      },
    })
  }

  const handleBackToCardSelection = () => {
    setPresentation(null)
    setCurrentSlide(0)
    setActiveCard(null)
    localStorage.removeItem('raw2ready_presentation')
    localStorage.removeItem('raw2ready_currentSlide')
  }

  const openCard = (cardType) => {
    // Reload form data from localStorage when opening card to ensure latest values are shown
    if (cardType === 'ppt') {
      try {
        const saved = localStorage.getItem('raw2ready_pptFormData')
        if (saved) {
          const savedPptData = JSON.parse(saved)
          setPptFormData(savedPptData)
        }
      } catch (e) {
        console.error('Error loading PPT form data:', e)
      }
    } else if (cardType === 'video') {
      try {
        const savedVideoData = localStorage.getItem('raw2ready_videoFormData')
        if (savedVideoData) {
          setVideoFormData(JSON.parse(savedVideoData))
        }
        const savedVideo = localStorage.getItem('raw2ready_generatedVideo')
        if (savedVideo) {
          setGeneratedVideo(JSON.parse(savedVideo))
        }
      } catch (e) {
        console.error('Error loading video form data:', e)
      }
    }
    setActiveCard(cardType)
    setPptError(null)
    setVideoError(null)
  }

  const closeCard = () => {
    // Don't clear form data when closing - preserve state
    setActiveCard(null)
    setPptError(null)
    setVideoError(null)
    // Form data is already saved to localStorage in handlePptChange and handleVideoChange
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeCard()
    }
  }

  // PPT Form Handlers
  const handlePptChange = (e) => {
    const { name, value } = e.target
    setPptFormData(prev => {
      const updated = { ...prev, [name]: value }
      // Save to localStorage
      localStorage.setItem('raw2ready_pptFormData', JSON.stringify(updated))
      return updated
    })
    if (pptErrors[name]) setPptErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validatePptForm = () => {
    const newErrors = {}
    if (!pptFormData.numberOfSlides.trim() || isNaN(pptFormData.numberOfSlides) || parseInt(pptFormData.numberOfSlides) < 5 || parseInt(pptFormData.numberOfSlides) > 15) {
      newErrors.numberOfSlides = 'Please enter a number between 5 and 15'
    }
    if (!pptFormData.timeRequired.trim() || isNaN(pptFormData.timeRequired) || parseFloat(pptFormData.timeRequired) < 3 || parseFloat(pptFormData.timeRequired) > 15) {
      newErrors.timeRequired = 'Please enter a time between 3 and 15 minutes'
    }
    setPptErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePresentation = async (e) => {
    e.preventDefault()
    if (!validatePptForm()) return
    setIsPptLoading(true)
    setPptError(null)
    // Don't clear form data - keep it for potential regeneration
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
        num_slides: parseInt(pptFormData.numberOfSlides),
        duration_minutes: parseInt(pptFormData.timeRequired),
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
      // Save presentation to localStorage
      localStorage.setItem('raw2ready_presentation', JSON.stringify(data))
      localStorage.setItem('raw2ready_currentSlide', '0')
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      setPptError(isNetworkError
        ? 'Could not reach the server. Make sure the backend is running (port 8000) and you are using the dev server (npm run dev).'
        : err.message)
    } finally {
      setIsPptLoading(false)
    }
  }

  const handleEditPresentation = async (e) => {
    e.preventDefault()
    if (!editPrompt.trim() || !presentation) return
    setIsEditing(true)
    setPptError(null)
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
      // Save updated presentation to localStorage
      localStorage.setItem('raw2ready_presentation', JSON.stringify(data))
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      setPptError(isNetworkError
        ? 'Could not reach the server. Make sure the backend is running (port 8000).'
        : err.message)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDownloadPptx = async () => {
    if (!presentation?.slides?.length) return
    setIsDownloading(true)
    setPptError(null)
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
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      setPptError(isNetworkError
        ? 'Could not reach the server. Make sure the backend is running (port 8000).'
        : err.message)
    } finally {
      setIsDownloading(false)
    }
  }

  // Video Form Handlers
  const handleVideoChange = (e) => {
    const { name, value } = e.target
    setVideoFormData(prev => {
      const updated = { ...prev, [name]: value }
      // Save to localStorage
      localStorage.setItem('raw2ready_videoFormData', JSON.stringify(updated))
      return updated
    })
    if (videoErrors[name]) setVideoErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateVideoForm = () => {
    const newErrors = {}
    if (!videoFormData.timeRequired.trim()) {
      newErrors.timeRequired = 'Time required is mandatory'
    } else if (isNaN(videoFormData.timeRequired) || parseFloat(videoFormData.timeRequired) < 6 || parseFloat(videoFormData.timeRequired) > 10) {
      newErrors.timeRequired = 'Please enter a valid time in seconds (6–10)'
    }
    if (!videoFormData.prompt.trim()) {
      newErrors.prompt = 'Video prompt is required'
    }
    setVideoErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGenerateVideo = async (e) => {
    e.preventDefault()
    if (!validateVideoForm()) return
    setIsVideoLoading(true)
    setVideoError(null)
    // Don't clear generatedVideo immediately - keep previous if exists
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: parseFloat(videoFormData.timeRequired) / 60,
          prompt: videoFormData.prompt.trim(),
          business_name: businessContext?.business_name?.trim() || null,
          raw_idea: businessContext?.raw_idea?.trim() || null,
          problem: businessContext?.problem?.trim() || null,
          target_audience: businessContext?.target_audience?.trim() || null,
          location_city: businessContext?.location_city?.trim() || null,
          country: businessContext?.country?.trim() || null,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate video')
      }
      const data = await response.json()
      setGeneratedVideo(data)
      // Save generated video info to localStorage
      localStorage.setItem('raw2ready_generatedVideo', JSON.stringify(data))
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError'
      setVideoError(isNetworkError
        ? 'Could not reach the server. Make sure the backend is running (port 8000) and you are using the dev server (npm run dev).'
        : err.message)
    } finally {
      setIsVideoLoading(false)
    }
  }

  const handleDownloadVideo = async () => {
    if (generatedVideo?.video_url) {
      try {
        const response = await fetch(generatedVideo.video_url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `video_${Date.now()}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error downloading video:', error)
        alert('Failed to download video. Please try opening the video URL directly.')
      }
    }
  }

  // Slide Navigation
  const goToSlide = (index) => {
    setCurrentSlide(index)
    // Save current slide to localStorage
    localStorage.setItem('raw2ready_currentSlide', index.toString())
  }

  const nextSlide = () => {
    if (presentation && currentSlide < presentation.slides.length - 1) {
      const newSlide = currentSlide + 1
      setCurrentSlide(newSlide)
      localStorage.setItem('raw2ready_currentSlide', newSlide.toString())
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      const newSlide = currentSlide - 1
      setCurrentSlide(newSlide)
      localStorage.setItem('raw2ready_currentSlide', newSlide.toString())
    }
  }

  // Render Main Page with 2 Cards
  const renderMainPage = () => (
    <div className="presentation-container">
      <button onClick={handleBack} className="back-button">
        ← Back
      </button>
      <h1 className="presentation-title">Choose Generation Type</h1>
      <p className="presentation-subtitle">Select how you want to generate your content</p>

      <div className="results-grid">
        {/* Presentation Generation Card */}
        <div 
          className="result-card"
          onClick={() => openCard('ppt')}
        >
          <div className="card-header">
            <div className="card-icon">📊</div>
            <h3 className="card-title">Presentation Generation</h3>
            <p className="card-description">Create a professional presentation with customizable slides</p>
          </div>
        </div>

        {/* Video Generation Card */}
        <div 
          className="result-card"
          onClick={() => openCard('video')}
        >
          <div className="card-header">
            <div className="card-icon">🎬</div>
            <h3 className="card-title">Video Generation</h3>
            <p className="card-description">Generate engaging video content for your business</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render PPT Configuration Card/Modal
  const renderPptCard = () => {
    return (
      <div className="generation-modal" onClick={handleOverlayClick}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal-btn" onClick={closeCard}>×</button>
          <h2 className="modal-title">Presentation Generation</h2>
              
              <form onSubmit={handleCreatePresentation} className="generation-form">
                <div className="form-group">
                  <label htmlFor="numberOfSlides">
                    Number of Slides <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="numberOfSlides"
                    name="numberOfSlides"
                    value={pptFormData.numberOfSlides}
                    onChange={handlePptChange}
                    placeholder="Enter number of slides (5-15)"
                    min="5"
                    max="15"
                    className={`form-input ${pptErrors.numberOfSlides ? 'error' : ''}`}
                  />
                  {pptErrors.numberOfSlides && (
                    <span className="error-message">{pptErrors.numberOfSlides}</span>
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
                    value={pptFormData.timeRequired}
                    onChange={handlePptChange}
                    placeholder="Enter time in minutes (3-15)"
                    min="3"
                    max="15"
                    className={`form-input ${pptErrors.timeRequired ? 'error' : ''}`}
                  />
                  {pptErrors.timeRequired && (
                    <span className="error-message">{pptErrors.timeRequired}</span>
                  )}
                </div>

                {pptError && (
                  <div className="error-banner">{pptError}</div>
                )}

                <button 
                  type="submit" 
                  className="generate-button"
                  disabled={isPptLoading}
                >
                  {isPptLoading ? (
                    <>
                      <span className="spinner"></span>
                      Generating Presentation...
                    </>
                  ) : (
                    'Generate Presentation'
                  )}
                </button>
              </form>
        </div>
      </div>
    )
  }

  // Render Video Generation Card/Modal
  const renderVideoCard = () => (
    <div className="generation-modal" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={closeCard}>×</button>
        <h2 className="modal-title">Video Generation</h2>
            
            <form onSubmit={handleGenerateVideo} className="generation-form">
              <div className="form-group">
                <label htmlFor="videoTimeRequired">
                  Duration (seconds) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="videoTimeRequired"
                  name="timeRequired"
                  value={videoFormData.timeRequired}
                  onChange={handleVideoChange}
                  placeholder="Enter duration in seconds (6–10)"
                  min="6"
                  max="10"
                  step="1"
                  className={`form-input ${videoErrors.timeRequired ? 'error' : ''}`}
                />
                {videoErrors.timeRequired && (
                  <span className="error-message">{videoErrors.timeRequired}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="videoPrompt">
                  Video prompt <span className="required">*</span>
                </label>
                <textarea
                  id="videoPrompt"
                  name="prompt"
                  value={videoFormData.prompt}
                  onChange={handleVideoChange}
                  placeholder="Describe what you want in the video (e.g. team in office, product demo, customer testimonial, animated explainer)"
                  rows={3}
                  className={`form-input ${videoErrors.prompt ? 'error' : ''}`}
                />
                {videoErrors.prompt && (
                  <span className="error-message">{videoErrors.prompt}</span>
                )}
              </div>

              {videoError && (
                <div className="error-banner">{videoError}</div>
              )}

              <button 
                type="submit" 
                className="generate-button"
                disabled={isVideoLoading}
              >
                {isVideoLoading ? (
                  <>
                    <span className="spinner"></span>
                    Generating Video...
                  </>
                ) : (
                  'Generate Video'
                )}
              </button>
            </form>

            {/* Generated Video Display */}
            {isVideoLoading && (
              <div className="video-loading">
                <div className="loading-spinner"></div>
                <p>Generating your video...</p>
              </div>
            )}

            {generatedVideo && !isVideoLoading && generatedVideo.video_url && (
              <div className="generated-video-container">
                <h3 className="video-title">Generated Video</h3>
                <div className="video-wrapper">
                  <video 
                    controls 
                    className="generated-video"
                    src={generatedVideo.video_url}
                    onError={(e) => {
                      console.error('Video load error:', e)
                      const videoElement = e.target
                      videoElement.style.display = 'none'
                      const errorMsg = document.createElement('div')
                      errorMsg.className = 'video-error'
                      errorMsg.textContent = 'Video failed to load. Please try generating again.'
                      videoElement.parentElement.appendChild(errorMsg)
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <button 
                  onClick={handleDownloadVideo}
                  className="download-video-button"
                >
                  ⬇ Download Video
                </button>
              </div>
            )}
      </div>
    </div>
  )

  // Render Presentation Viewer (after PPT is generated)
  const renderPresentationViewer = () => {
    if (!presentation || !presentation.slides || presentation.slides.length === 0) {
      return null
    }

    const slide = presentation.slides[currentSlide]

    return (
      <div className="presentation-page">
        <div className="presentation-container">
          <button onClick={handleBackToCardSelection} className="back-button">
            ← Back to Presentation or Video
          </button>
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
                {pptError && <div className="error-banner">{pptError}</div>}
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
                onClick={() => {
                  setPresentation(null)
                  setCurrentSlide(0)
                  localStorage.removeItem('raw2ready_presentation')
                  localStorage.removeItem('raw2ready_currentSlide')
                  setActiveCard('ppt')
                }}
              >
                ← Start Over with New Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main render logic
  if (presentation && presentation.slides) {
    return renderPresentationViewer()
  }

  // Show main page with cards, and modals when cards are clicked
  return (
    <div className={`presentation-page ${activeCard ? 'has-modal' : ''}`}>
      {renderMainPage()}
      {activeCard === 'ppt' && renderPptCard()}
      {activeCard === 'video' && renderVideoCard()}
    </div>
  )
}

export default PresentationPage
