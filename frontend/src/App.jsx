import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import FormPage from './components/FormPage'
import ResultsPage from './components/ResultsPage'
import PresentationPage from './components/PresentationPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/form" element={<FormPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/presentation" element={<PresentationPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

