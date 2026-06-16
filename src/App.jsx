import { useState } from 'react'
import ProgressBar from './components/ProgressBar'
import Step1Specimen from './steps/Step1Specimen'
import Step2Location from './steps/Step2Location'
import Step3Environment from './steps/Step3Environment'
import Step4Collection from './steps/Step4Collection'
import Step5Review from './steps/Step5Review'

const STEPS = [
  { id: 1, label: 'Specimen' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Environment' },
  { id: 4, label: 'Collection' },
  { id: 5, label: 'Review' },
]

const initialForm = {
  species: '',
  speciesDisplay: '',
  preservation: '',
  photos: [],
  latitude: '',
  longitude: '',
  altitude: '',
  accuracy: '',
  locality: '',
  elevation: null,
  landCover: null,
  temperature: null,
  precipitation: null,
  windSpeed: null,
  weatherCode: null,
  collectionDate: new Date().toISOString().split('T')[0],
  collectorName: '',
  institution: '',
  projectName: 'BioARC',
  habitatDescription: '',
  notes: '',
}

export default function App() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [submissionId, setSubmissionId] = useState(null)

  const update = (fields) => setForm(f => ({ ...f, ...fields }))

  const next = () => setStep(s => Math.min(s + 1, 5))
  const back = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmitSuccess = (id) => {
    setSubmissionId(id)
    setSubmitted(true)
  }

  const handleReset = () => {
    setForm(initialForm)
    setStep(1)
    setSubmitted(false)
    setSubmissionId(null)
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="app-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" />
            <path d="M12 6v6l4 2" />
            <circle cx="19" cy="5" r="3" />
          </svg>
        </div>
        <span className="app-title">BioARC</span>
        <span className="app-subtitle">Specimen Collection Survey</span>
      </header>

      <main className="app-main">
        {!submitted && (
          <ProgressBar steps={STEPS} current={step} />
        )}

        {submitted ? (
          <div className="card" style={{ maxWidth: 640 }}>
            <div className="success-card">
              <div className="success-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2>Submission Complete</h2>
              <p>Your specimen record has been archived successfully in KoboToolbox.</p>
              {submissionId && (
                <span className="success-id">ID: {submissionId}</span>
              )}
              <button className="btn btn-primary" onClick={handleReset} style={{ marginTop: 8 }}>
                Submit Another Record
              </button>
            </div>
          </div>
        ) : step === 1 ? (
          <Step1Specimen form={form} update={update} onNext={next} />
        ) : step === 2 ? (
          <Step2Location form={form} update={update} onNext={next} onBack={back} />
        ) : step === 3 ? (
          <Step3Environment form={form} update={update} onNext={next} onBack={back} />
        ) : step === 4 ? (
          <Step4Collection form={form} update={update} onNext={next} onBack={back} />
        ) : (
          <Step5Review form={form} onBack={back} onSuccess={handleSubmitSuccess} />
        )}
      </main>
    </div>
  )
}
