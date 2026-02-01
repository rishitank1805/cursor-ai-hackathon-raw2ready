/**
 * API service for communicating with the Raw2Ready backend
 */

const API_BASE_URL = '/api'

/**
 * Analyze a business idea
 * @param {Object} formData - The form data from the frontend
 * @returns {Promise<Object>} - The analysis results
 */
export async function analyzeBusiness(formData) {
  const payload = {
    business_name: formData.businessName || 'My Business',
    location_city: formData.city,
    country: formData.country,
    target_audience: formData.targetAudience || null,
    budget: formData.budget || null,
    business_type: formData.businessType || null,
    raw_idea: formData.rawIdea,
    problem: formData.problem || null,
    model_selection: formData.model,
    time_commitment: formData.timeCommitment || null,
    output_tone: formData.outputTone || null,
    language: formData.language || null,
    stage_of_idea: formData.stageOfIdea || null,
    time_horizon: formData.timeHorizon || null,
    file_content: formData.file_content || null,
    photos_description: formData.photos_description || null,
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    let message = errorData.detail || errorData.message || response.statusText
    if (Array.isArray(message)) {
      message = message.map(e => e.msg || e.message || JSON.stringify(e)).join('; ')
    } else if (typeof message !== 'string') {
      message = JSON.stringify(message)
    }
    throw new Error(message)
  }

  return await response.json()
}

/**
 * Get available AI models
 * @returns {Promise<Array>} - List of available models
 */
export async function getModels() {
  const response = await fetch(`${API_BASE_URL}/models`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch models')
  }
  
  const data = await response.json()
  return data.models
}
