import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './ResultsPage.css'
import sampleOutput from '../assets/sample_output.json'

const ResultsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState(null)
  const [expandedCard, setExpandedCard] = useState(null)
  
  // Get business context from location state (passed from FormPage)
  const businessContext = location.state?.businessContext || {
    business_name: 'My Business',
    raw_idea: 'A great business idea',
    problem: '',
    target_audience: '',
    location_city: '',
    country: '',
    budget: '',
    business_type: '',
  }

  useEffect(() => {
    if (location.state?.analysisData) {
      setData(location.state.analysisData)
    } else {
      setData(sampleOutput)
    }
  }, [location.state])

  const openCard = (cardId) => {
    setExpandedCard(cardId)
  }

  const closeCard = () => {
    setExpandedCard(null)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeCard()
    }
  }

  if (!data) {
    return (
      <div className="results-page">
        <div className="results-container">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`results-page ${expandedCard ? 'has-expanded' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="results-container">
        <h1 className="results-title">Your Business Analysis</h1>
        <p className="results-subtitle">Here's your comprehensive business proposal breakdown</p>

        {/* Disclaimer if present */}
        {data.disclaimer && (
          <div className="disclaimer-banner">
            <span className="disclaimer-icon">⚠️</span>
            <p className="disclaimer-text">{data.disclaimer}</p>
          </div>
        )}

        {/* Your Idea/Pitch Section */}
        <div className="section-container">
          <h2 className="section-title">Your Idea/Pitch</h2>
          <div className="results-grid">
            {/* Revenue Estimated */}
            <div 
              className="result-card"
              onClick={() => openCard('revenue')}
            >
              <div className="card-header">
                <h3 className="card-title">Revenue Estimated</h3>
              </div>
            </div>

            {/* Vicinity Locations */}
            <div 
              className="result-card"
              onClick={() => openCard('locations')}
            >
              <div className="card-header">
                <h3 className="card-title">Vicinity Locations</h3>
              </div>
            </div>

            {/* Target Audience */}
            <div 
              className="result-card"
              onClick={() => openCard('audience')}
            >
              <div className="card-header">
                <h3 className="card-title">Target Audience</h3>
              </div>
            </div>

            {/* Undiscovered Addons */}
            <div 
              className="result-card"
              onClick={() => openCard('addons')}
            >
              <div className="card-header">
                <h3 className="card-title">Undiscovered Addons</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Competitors Section */}
        <div className="section-container">
          <h2 className="section-title">Competitors</h2>
          <div className="competitors-container">
            {data.competing_players.map((competitor, index) => (
              <div 
                key={index} 
                className="result-card competitor-card"
                onClick={() => openCard(`competitor-${index}`)}
              >
                <div className="card-header">
                  <h3 className="card-title">{competitor.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Presentation Button */}
        <div className="next-button-container">
          <button 
            className="next-button create-presentation-btn" 
            onClick={() => navigate('/presentation', { 
              state: { 
                businessContext: {
                  ...businessContext,
                  competing_players: data?.competing_players || [],
                  market_cap_or_target_revenue: data?.market_cap_or_target_revenue || '',
                  undiscovered_addons: data?.undiscovered_addons || [],
                }
              } 
            })}
          >
            Create Presentation →
          </button>
        </div>
      </div>

      {/* Modal for expanded card */}
      {expandedCard && (
        <div className="card-modal">
          <div className="card-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-card-btn" onClick={closeCard}>
              ×
            </button>
            
            {expandedCard === 'revenue' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">Revenue Estimated</h2>
                </div>
                <div className="card-content">
                  <p className="card-text">{data.market_cap_or_target_revenue}</p>
                </div>
              </>
            )}

            {expandedCard === 'locations' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">Vicinity Locations</h2>
                </div>
                <div className="card-content">
                  <ul className="card-list">
                    {data.major_vicinity_locations.map((location, index) => (
                      <li key={index} className="card-list-item">{location}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {expandedCard === 'audience' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">Target Audience</h2>
                </div>
                <div className="card-content">
                  <ul className="card-list">
                    {data.target_audience.map((audience, index) => (
                      <li key={index} className="card-list-item">{audience}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {expandedCard === 'addons' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">Undiscovered Addons</h2>
                </div>
                <div className="card-content">
                  <ul className="card-list">
                    {data.undiscovered_addons.map((addon, index) => (
                      <li key={index} className="card-list-item">{addon}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {expandedCard?.startsWith('competitor-') && (() => {
              const competitor = data.competing_players[parseInt(expandedCard.split('-')[1])]
              return (
                <>
                  <div className="card-header">
                    <h2 className="card-title">{competitor.name}</h2>
                  </div>
                  <div className="card-content">
                    {competitor.location && (
                      <p className="competitor-info">
                        <strong>📍 Location:</strong> {competitor.location}
                      </p>
                    )}
                    {competitor.url && (
                      <p className="competitor-info">
                        <strong>🌐 Website:</strong>{' '}
                        <a href={competitor.url} target="_blank" rel="noopener noreferrer">
                          {competitor.url}
                        </a>
                      </p>
                    )}
                    {competitor.annual_revenue && (
                      <p className="competitor-info">
                        <strong>💰 Annual Revenue:</strong> {competitor.annual_revenue}
                      </p>
                    )}
                    {competitor.year_established && (
                      <p className="competitor-info">
                        <strong>📅 Established:</strong> {competitor.year_established}
                      </p>
                    )}
                    {competitor.description && (
                      <p className="competitor-description">{competitor.description}</p>
                    )}
                    {competitor.strengths && competitor.strengths.length > 0 && (
                      <div className="competitor-strengths">
                        <span className="strengths-label">Strengths:</span>
                        <div className="strengths-tags">
                          {competitor.strengths.map((strength, sIndex) => (
                            <span key={sIndex} className="strength-tag">{strength}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsPage
