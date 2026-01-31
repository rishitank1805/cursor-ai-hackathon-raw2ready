import React from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from './Logo'
import './LandingPage.css'

const LandingPage = () => {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate('/form')
  }

  return (
    <div className="landing-page">
      <div className="landing-content">
        <Logo />
        <div className="description">
          <p className="description-text">
            Transform your raw business idea into a perfect pitch with professional presentation and interactive demo.
          </p>
        </div>
        <button className="start-button" onClick={handleStart}>
          Start
        </button>
      </div>
    </div>
  )
}

export default LandingPage

