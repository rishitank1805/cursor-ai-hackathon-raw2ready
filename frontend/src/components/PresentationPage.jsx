import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './PresentationPage.css'

const PresentationPage = () => {
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState(null) // 'ppt' or 'video'
  const [pptData, setPptData] = useState({
    time: '',
    numberOfSlides: ''
  })
  const [videoData, setVideoData] = useState({
    time: '',
    videoType: ''
  })
  const [errors, setErrors] = useState({})

  const handleBack = () => {
    navigate('/results')
  }

  const openModal = (type) => {
    setActiveModal(type)
    setErrors({})
  }

  const closeModal = () => {
    setActiveModal(null)
    setErrors({})
  }

  const handlePptChange = (e) => {
    const { name, value } = e.target
    setPptData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleVideoChange = (e) => {
    const { name, value } = e.target
    setVideoData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validatePptForm = () => {
    const newErrors = {}
    
    if (pptData.time.trim() && (isNaN(pptData.time) || parseFloat(pptData.time) <= 0)) {
      newErrors.pptTime = 'Please enter a valid time'
    }

    if (pptData.numberOfSlides.trim() && (isNaN(pptData.numberOfSlides) || parseInt(pptData.numberOfSlides) <= 0)) {
      newErrors.pptSlides = 'Please enter a valid number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVideoForm = () => {
    const newErrors = {}
    
    if (videoData.time.trim() && (isNaN(videoData.time) || parseFloat(videoData.time) <= 0)) {
      newErrors.videoTime = 'Please enter a valid time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleGeneratePresentation = (e) => {
    e.preventDefault()
    if (validatePptForm()) {
      console.log('Generating presentation with:', pptData)
      // Handle presentation generation here
    }
  }

  const handleGenerateVideo = (e) => {
    e.preventDefault()
    if (validateVideoForm()) {
      console.log('Generating video with:', videoData)
      // Handle video generation here
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }

  return (
    <div 
      className={`presentation-page ${activeModal ? 'has-modal' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="presentation-container">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1 className="presentation-title">Choose Generation Type</h1>
        <p className="presentation-subtitle">Select how you want to generate your content</p>

        <div className="generation-cards">
          {/* PPT Generation Card */}
          <div 
            className="generation-card"
            onClick={() => openModal('ppt')}
          >
            <div className="card-icon">📊</div>
            <h2 className="card-title">PPT Generation</h2>
            <p className="card-description">Create a professional presentation</p>
          </div>

          {/* Video Generation Card */}
          <div 
            className="generation-card"
            onClick={() => openModal('video')}
          >
            <div className="card-icon">🎬</div>
            <h2 className="card-title">Video Generation</h2>
            <p className="card-description">Generate engaging video content</p>
          </div>
        </div>
      </div>

      {/* PPT Generation Modal */}
      {activeModal === 'ppt' && (
        <div className="generation-modal">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={closeModal}>
              ×
            </button>
            <h2 className="modal-title">PPT Generation</h2>
            <form onSubmit={handleGeneratePresentation} className="generation-form">
              <div className="form-group">
                <label htmlFor="pptTime">Time Required (minutes)</label>
                <input
                  type="number"
                  id="pptTime"
                  name="time"
                  value={pptData.time}
                  onChange={handlePptChange}
                  placeholder="Enter time in minutes (e.g., 15)"
                  min="1"
                  step="0.5"
                  className={`form-input ${errors.pptTime ? 'error' : ''}`}
                />
                {errors.pptTime && (
                  <span className="error-message">{errors.pptTime}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="pptSlides">Number of Slides</label>
                <input
                  type="number"
                  id="pptSlides"
                  name="numberOfSlides"
                  value={pptData.numberOfSlides}
                  onChange={handlePptChange}
                  placeholder="Enter number of slides (e.g., 10)"
                  min="1"
                  className={`form-input ${errors.pptSlides ? 'error' : ''}`}
                />
                {errors.pptSlides && (
                  <span className="error-message">{errors.pptSlides}</span>
                )}
              </div>

              <button type="submit" className="generate-button">
                Generate Presentation
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Video Generation Modal */}
      {activeModal === 'video' && (
        <div className="generation-modal">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={closeModal}>
              ×
            </button>
            <h2 className="modal-title">Video Generation</h2>
            <form onSubmit={handleGenerateVideo} className="generation-form">
              <div className="form-group">
                <label htmlFor="videoTime">Time Required (minutes)</label>
                <input
                  type="number"
                  id="videoTime"
                  name="time"
                  value={videoData.time}
                  onChange={handleVideoChange}
                  placeholder="Enter time in minutes (e.g., 5)"
                  min="1"
                  step="0.5"
                  className={`form-input ${errors.videoTime ? 'error' : ''}`}
                />
                {errors.videoTime && (
                  <span className="error-message">{errors.videoTime}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="videoType">Type of Video</label>
                <select
                  id="videoType"
                  name="videoType"
                  value={videoData.videoType}
                  onChange={handleVideoChange}
                  className="form-input"
                >
                  <option value="">Select video type</option>
                  <option value="animation">Animation</option>
                  <option value="real">Real</option>
                  <option value="virtual-reality">Virtual Reality</option>
                </select>
              </div>

              <button type="submit" className="generate-button">
                Generate Video
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PresentationPage
