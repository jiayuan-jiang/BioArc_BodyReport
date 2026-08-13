import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import Step3Environment from './Step3Environment'
import { LangContext } from '../i18n'
import { fetchEnvironmentData } from '../utils/environmentApi'

vi.mock('../utils/environmentApi', () => ({
  fetchEnvironmentData: vi.fn(),
}))

// Mirrors real usage: OfflineProvider's `online` state is itself seeded from
// navigator.onLine, so keep the mock in sync with whatever a test sets there
// rather than hardcoding true (a mismatch here would test the mock, not the
// component's actual online/offline branching).
vi.mock('../offline/OfflineContext', () => ({
  useOffline: () => ({ online: navigator.onLine }),
}))

const baseForm = {
  latitude: 38.510733,
  longitude: -108.537297,
  collectionDate: '2026-08-12',
  elevation: null,
  landCover: null,
  landCoverSource: null,
  temperature: null,
  humidity: null,
  precipitation: null,
  windSpeed: null,
  weatherCode: null,
  soilTemperature: null,
  soilMoisture: null,
  temperatureDaily: null,
  humidityDaily: null,
  precipitationDaily: null,
  windSpeedDaily: null,
  weatherCodeDaily: null,
  soilTemperatureDaily: null,
  soilMoistureDaily: null,
  distanceToRoad: null,
  distanceToWater: null,
  weatherSource: null,
  manualEnvFields: [],
  envFetchedSnapshot: null,
  envFetchPending: false,
}

const FULL_SUCCESS = {
  fetched: {
    elevation: 1450,
    temperature: 24.9,
    humidity: 30,
    precipitation: 0,
    windSpeed: 12,
    weatherCode: 1,
    soilTemperature: 28,
    soilMoisture: 0.1,
    temperatureDaily: null, humidityDaily: null, precipitationDaily: null,
    windSpeedDaily: null, weatherCodeDaily: null, soilTemperatureDaily: null, soilMoistureDaily: null,
    landCover: 'Shrubland',
    distanceToRoad: 0,
    distanceToWater: 921,
  },
  weatherSource: 'current',
  landCoverSource: 'esa_worldcover',
}

// Harness mirrors how App.jsx actually wires `form`/`update` into Step3 —
// a bare mock `update` fn wouldn't re-render the component with the new
// values the way real usage does, which is exactly the kind of gap that
// would hide a real bug in the merge/status logic.
function Harness({ initial = baseForm }) {
  const [form, setForm] = useState(initial)
  const update = (patch) => setForm(f => ({ ...f, ...patch }))
  return (
    <LangContext.Provider value={{ lang: 'en', setLang: () => {}, t: (k) => k }}>
      <Step3Environment form={form} update={update} onNext={() => {}} onBack={() => {}} />
    </LangContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('Step3Environment auto-fetch', () => {
  it('fetches once on mount and shows the success banner when core fields land', async () => {
    fetchEnvironmentData.mockResolvedValue(FULL_SUCCESS)
    render(<Harness />)

    await waitFor(() => expect(screen.getByText('s3_success')).toBeInTheDocument())
    expect(fetchEnvironmentData).toHaveBeenCalledTimes(1)
    expect(fetchEnvironmentData).toHaveBeenCalledWith(38.510733, -108.537297, '2026-08-12')
    expect(screen.getByText('1450 m')).toBeInTheDocument()
    expect(screen.getByText('0 m')).toBeInTheDocument()
    expect(screen.getByText('921 m')).toBeInTheDocument()
  })

  it('still shows success (not deferred) when only distanceToRoad/distanceToWater fail, core fields present', async () => {
    fetchEnvironmentData.mockResolvedValue({
      ...FULL_SUCCESS,
      fetched: { ...FULL_SUCCESS.fetched, distanceToRoad: null, distanceToWater: null },
    })
    render(<Harness />)

    await waitFor(() => expect(screen.getByText('s3_success')).toBeInTheDocument())
    // Only totalFailure (elevation/temperature/landCover all null) should defer;
    // partial proximity-field failure must not block the rest of the record.
    expect(screen.queryByText('s3_deferred_online')).not.toBeInTheDocument()
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('defers to the offline queue when elevation/temperature/landCover all come back null', async () => {
    fetchEnvironmentData.mockResolvedValue({
      fetched: { ...FULL_SUCCESS.fetched, elevation: null, temperature: null, landCover: null },
      weatherSource: null,
      landCoverSource: null,
    })
    render(<Harness />)

    await waitFor(() => expect(screen.getByText('s3_deferred_online')).toBeInTheDocument())
  })

  it('does not call the network at all when navigator.onLine is false', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<Harness />)

    await waitFor(() => expect(screen.getByText('s3_deferred_offline')).toBeInTheDocument())
    expect(fetchEnvironmentData).not.toHaveBeenCalled()
  })

  it('skips the auto-fetch entirely if elevation is already set (remount-with-cached-data case)', () => {
    render(<Harness initial={{ ...baseForm, elevation: 1450 }} />)
    expect(screen.getByText('s3_success')).toBeInTheDocument()
    expect(fetchEnvironmentData).not.toHaveBeenCalled()
  })

  it('does not fetch at all when latitude/longitude are missing', () => {
    render(<Harness initial={{ ...baseForm, latitude: '', longitude: '' }} />)
    expect(fetchEnvironmentData).not.toHaveBeenCalled()
    expect(screen.getByText('s3_no_location')).toBeInTheDocument()
  })

  it('manual refetch preserves a manually-edited field instead of overwriting it with the new fetch result', async () => {
    fetchEnvironmentData.mockResolvedValue(FULL_SUCCESS)
    render(<Harness initial={{
      ...baseForm,
      elevation: 1450, temperature: 24.9, landCover: 'Shrubland',
      distanceToRoad: 500, // researcher's own manual reading
      manualEnvFields: ['distanceToRoad'],
    }} />)

    // mount effect short-circuits (elevation already set) -> status 'done' immediately
    expect(screen.getByText('500 m')).toBeInTheDocument()

    const user = (await import('@testing-library/user-event')).default.setup()
    await user.click(screen.getByRole('button', { name: 's3_refetch' }))

    await waitFor(() => expect(fetchEnvironmentData).toHaveBeenCalledTimes(1))
    // Mapbox/Overpass would have returned distanceToRoad: 0 in FULL_SUCCESS —
    // the manual 500m reading must survive the refetch, not get clobbered.
    await waitFor(() => expect(screen.getByText('500 m')).toBeInTheDocument())
  })
})
