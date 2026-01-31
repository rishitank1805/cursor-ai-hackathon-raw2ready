import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './PresentationPage.css'

const PresentationPage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    numberOfSlides: '',
    timeRequired: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
    
    // Only validate if value is provided
    if (formData.numberOfSlides.trim() && (isNaN(formData.numberOfSlides) || parseInt(formData.numberOfSlides) <= 0)) {
      newErrors.numberOfSlides = 'Please enter a valid number'
    }

    if (formData.timeRequired.trim() && (isNaN(formData.timeRequired) || parseFloat(formData.timeRequired) <= 0)) {
      newErrors.timeRequired = 'Please enter a valid time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreatePresentation = (e) => {
    e.preventDefault()
    if (validateForm()) {
      console.log('Creating presentation with:', formData)
      // Handle presentation creation here
      // You can navigate to another page or show success message
    }
  }

  const handleBack = () => {
    navigate('/results')
  }

  return (
    <div className="presentation-page">
      <div className="presentation-container">
        <button onClick={handleBack} className="back-button">
          ← Back
        </button>
        <h1 className="presentation-title">Create Your Presentation</h1>
        <p className="presentation-subtitle">Configure your presentation settings</p>

        <form onSubmit={handleCreatePresentation} className="presentation-form">
          <div className="form-group">
            <label htmlFor="numberOfSlides">
              Number of Slides
            </label>
            <input
              type="number"
              id="numberOfSlides"
              name="numberOfSlides"
              value={formData.numberOfSlides}
              onChange={handleChange}
              placeholder="Enter number of slides (e.g., 10)"
              min="1"
              className={`form-input ${errors.numberOfSlides ? 'error' : ''}`}
            />
            {errors.numberOfSlides && (
              <span className="error-message">{errors.numberOfSlides}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="timeRequired">
              Time Required for Presentation (minutes)
            </label>
            <input
              type="number"
              id="timeRequired"
              name="timeRequired"
              value={formData.timeRequired}
              onChange={handleChange}
              placeholder="Enter time in minutes (e.g., 15)"
              min="1"
              step="0.5"
              className={`form-input ${errors.timeRequired ? 'error' : ''}`}
            />
            {errors.timeRequired && (
              <span className="error-message">{errors.timeRequired}</span>
            )}
          </div>

          <button type="submit" className="create-presentation-button">
            Create Presentation
          </button>
        </form>
      </div>
    </div>
  )
}

export default PresentationPage

