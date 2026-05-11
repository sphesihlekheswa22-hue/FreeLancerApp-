import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import {
  getProfile,
  PROFILE_REFRESH_EVENT,
  Profile,
  resolveMediaUrl,
  updateProfile,
  uploadProfilePhoto,
} from '../lib/api'

function parseSkills(skills: string): string[] {
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ProfilePage({ isAuthed }: { isAuthed: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)

  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [hourlyRate, setHourlyRate] = useState<string>('')
  const [pricingType, setPricingType] = useState<'fixed' | 'hourly'>('fixed')
  const [photoUploading, setPhotoUploading] = useState(false)
  /** When true, next Save sends `profile_picture_url: null`. */
  const [removePhotoOnSave, setRemovePhotoOnSave] = useState(false)

  const skillChips = useMemo(() => parseSkills(skills), [skills])
  const photoSrc = removePhotoOnSave
    ? undefined
    : resolveMediaUrl(profile?.profile_picture_url)

  async function refresh() {
    if (!isAuthed) return
    setError(null)
    setLoading(true)
    try {
      const res = await getProfile()
      setUser(res.user)
      setProfile(res.profile)
      setRemovePhotoOnSave(false)
      setBio(res.profile.bio ?? '')
      setSkills(res.profile.skills ?? '')
      setPortfolioUrl(res.profile.portfolio_url ?? '')
      setHourlyRate(res.profile.hourly_rate != null ? String(res.profile.hourly_rate) : '')
      setPricingType(res.profile.pricing_type ?? 'fixed')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const rate = hourlyRate.trim()
      const parsedRate =
        rate === '' ? null : Number.isFinite(Number(rate)) ? Number(rate) : NaN
      if (parsedRate !== null && !Number.isFinite(parsedRate)) {
        setError('Hourly rate must be a number.')
        return
      }
      const res = await updateProfile({
        bio,
        skills,
        portfolio_url: portfolioUrl.trim() || null,
        hourly_rate: parsedRate as number | null,
        pricing_type: pricingType,
        ...(removePhotoOnSave ? { profile_picture_url: null } : {}),
      })
      setProfile(res)
      if (removePhotoOnSave) {
        setRemovePhotoOnSave(false)
        window.dispatchEvent(new Event(PROFILE_REFRESH_EVENT))
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save profile')
    }
  }

  async function onPhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoUploading(true)
    setError(null)
    try {
      const { profile_picture_url } = await uploadProfilePhoto(file)
      setRemovePhotoOnSave(false)
      setProfile((p) => (p ? { ...p, profile_picture_url } : p))
      window.dispatchEvent(new Event(PROFILE_REFRESH_EVENT))
    } catch (err: any) {
      setError(err?.message ?? 'Photo upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  if (!isAuthed) {
    return (
      <div className="card">
        <h1>Profile</h1>
        <p className="muted">Login to view and edit your profile.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="row">
        <h1>My Profile</h1>
        {loading ? <span className="muted">Loading…</span> : null}
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="grid2">
        <div className="card left">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>
                Account
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.name ?? '—'}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {user?.email ?? '—'}
              </div>
            </div>
            <div className="pill strong">{user?.role ?? 'student'}</div>
          </div>

          <div
            className="profile-photo-row"
            style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <div
              className="profile-photo-preview"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 28,
                flexShrink: 0,
              }}
            >
              {photoSrc ? (
                <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (user?.name?.charAt(0) ?? '?').toUpperCase()
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Profile photo</div>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                JPG, PNG, GIF, or WebP, up to 3MB. Shown in the header when set.
              </p>
              {removePhotoOnSave ? (
                <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
                  Photo will be removed when you click <strong>Save</strong> on your profile form.
                </p>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <label className="btn-secondary" style={{ cursor: photoUploading ? 'wait' : 'pointer' }}>
                  {photoUploading ? 'Uploading…' : 'Upload photo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    disabled={photoUploading}
                    onChange={onPhotoPick}
                  />
                </label>
                {profile?.profile_picture_url && !removePhotoOnSave ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setRemovePhotoOnSave(true)}
                  >
                    Remove photo
                  </button>
                ) : null}
                {removePhotoOnSave ? (
                  <button type="button" className="btn-secondary" onClick={() => setRemovePhotoOnSave(false)}>
                    Keep photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="statsRow" style={{ marginTop: 16 }}>
            <div className="statTile">
              <div className="statValue">{profile?.rating ?? 0}</div>
              <div className="statLabel">Rating</div>
            </div>
            <div className="statTile">
              <div className="statValue">{profile?.completed_jobs ?? 0}</div>
              <div className="statLabel">Completed</div>
            </div>
          </div>
        </div>

        <div className="card left">
          <h2>Edit profile</h2>
          <form className="form" onSubmit={onSave}>
            <label>
              Bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
            </label>
            <label>
              Skills (comma separated)
              <input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. JavaScript, Design, Writing"
              />
            </label>
            <label>
              Portfolio URL
              <input
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <div className="grid2">
              <label>
                Pricing type
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as 'fixed' | 'hourly')}
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                </select>
              </label>
              <label>
                Hourly rate (optional)
                <input
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 25"
                />
              </label>
            </div>
            <div className="chips">
              {skillChips.slice(0, 12).map((s) => (
                <span key={s} className="pill">
                  {s}
                </span>
              ))}
            </div>
            <button type="submit">Save</button>
          </form>
        </div>
      </div>
    </div>
  )
}

