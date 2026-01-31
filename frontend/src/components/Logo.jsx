import React from 'react'
import logoImage from '../assets/Raw2Ready_Logo.png'
import './Logo.css'

const Logo = () => {
  return (
    <div className="logo-container">
      <img 
        src={logoImage} 
        alt="Raw2Ready Logo" 
        className="logo-image"
      />
    </div>
  )
}

export default Logo

