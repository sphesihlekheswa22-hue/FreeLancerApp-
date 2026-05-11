export type ApiError = { error: string }

const TOKEN_KEY = 'campus_gigs_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY)
  else localStorage.setItem(TOKEN_KEY, token)
}

function apiUrl(path: string): string {
  const base = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
  const baseClean = (base || '').trim().replace(/\/+$/, '')
  if (!baseClean) return path
  const pathClean = path.startsWith('/') ? path : `/${path}`
  return `${baseClean}${pathClean}`
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // Avoid "infinite loading" when the backend is unreachable or slow.
  const controller = new AbortController()
  const timeoutMs = 20000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(apiUrl(path), { ...init, headers, signal: controller.signal })
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw e
  } finally {
    clearTimeout(timeout)
  }

  const json = (await res.json().catch(() => ({}))) as unknown
  if (!res.ok) {
    const msg =
      typeof json === 'object' && json && 'error' in json
        ? String((json as any).error)
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return json as T
}

export type AuthUser = { id: number; name: string; email: string }

export async function register(payload: {
  name: string
  email: string
  password: string
}): Promise<{ access_token: string; user: AuthUser }> {
  return apiFetch('/api/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function login(payload: {
  email: string
  password: string
}): Promise<{ access_token: string; user: AuthUser }> {
  return apiFetch('/api/login', { method: 'POST', body: JSON.stringify(payload) })
}

export async function me(): Promise<any> {
  return apiFetch('/api/me')
}

export type Profile = {
  bio: string
  skills: string
  rating: number
  completed_jobs: number
  profile_picture_url: string | null
  portfolio_url?: string | null
  hourly_rate?: number | null
  pricing_type?: 'fixed' | 'hourly'
}

export async function getProfile(): Promise<{ user: any; profile: Profile }> {
  return apiFetch('/api/profile')
}

export async function updateProfile(payload: {
  bio: string
  skills: string
  profile_picture_url?: string | null
  portfolio_url?: string | null
  hourly_rate?: number | null
  pricing_type?: 'fixed' | 'hourly'
}): Promise<Profile> {
  return apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(payload) })
}

export type Gig = {
  id: number
  title: string
  description: string
  category: string
  price: number
  user_id: number
  created_at: string
}

export async function listGigs(params?: {
  q?: string
  category?: string
}): Promise<Gig[]> {
  const url = new URL('/api/gigs', window.location.origin)
  if (params?.q) url.searchParams.set('q', params.q)
  if (params?.category) url.searchParams.set('category', params.category)
  return apiFetch(url.pathname + url.search)
}

export async function createGig(payload: {
  title: string
  description: string
  category: string
  price: number
}): Promise<Gig> {
  return apiFetch('/api/gigs', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getGig(id: number): Promise<Gig> {
  return apiFetch(`/api/gigs/${id}`)
}

export type Job = {
  id: number
  title: string
  description: string
  budget: number
  deadline: string | null
  category?: string
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled'
  progress?: number
  in_progress_notes?: string
  user_id: number
  created_at: string
}

export async function listJobs(params?: { q?: string }): Promise<Job[]> {
  const url = new URL('/api/jobs', window.location.origin)
  if (params?.q) url.searchParams.set('q', params.q)
  return apiFetch(url.pathname + url.search)
}

export async function listJobsAdvanced(params?: {
  q?: string
  category?: string
  status?: string
  min_budget?: number
  max_budget?: number
  sort?: 'newest' | 'highest_budget' | 'lowest_budget'
}): Promise<Job[]> {
  const url = new URL('/api/jobs', window.location.origin)
  if (params?.q) url.searchParams.set('q', params.q)
  if (params?.category) url.searchParams.set('category', params.category)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.min_budget != null) url.searchParams.set('min_budget', String(params.min_budget))
  if (params?.max_budget != null) url.searchParams.set('max_budget', String(params.max_budget))
  if (params?.sort && params.sort !== 'newest') url.searchParams.set('sort', params.sort)
  return apiFetch(url.pathname + url.search)
}

export async function createJob(payload: {
  title: string
  description: string
  budget: number
  deadline?: string
  category?: string
}): Promise<Job> {
  return apiFetch('/api/jobs', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getJob(id: number): Promise<Job> {
  return apiFetch(`/api/jobs/${id}`)
}

export async function updateJob(
  job_id: number,
  payload: Partial<{
    title: string
    description: string
    budget: number
    deadline: string | null
    category: string
    status: 'open' | 'in_progress' | 'completed' | 'cancelled'
    progress: number
    in_progress_notes: string
  }>,
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/jobs/${job_id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteJob(job_id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/jobs/${job_id}`, { method: 'DELETE' })
}

export type JobUpdate = {
  id: number
  job_id: number
  note: string
  progress: number
  created_at: string
}

export async function listJobUpdates(job_id: number): Promise<JobUpdate[]> {
  return apiFetch(`/api/jobs/${job_id}/updates`)
}

export async function addJobUpdate(
  job_id: number,
  payload: { note: string; progress: number },
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/jobs/${job_id}/updates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type Application = {
  id: number
  job_id?: number
  freelancer_id?: number
  proposal: string
  expected_price: number
  estimated_time: string
  status: string
  created_at: string
  job?: { id: number; title: string; budget: number; deadline: string | null; user_id: number }
  freelancer?: {
    id: number
    name: string
    email: string
    profile: Profile
  }
}

export async function applyToJob(payload: {
  job_id: number
  proposal: string
  expected_price: number
  estimated_time: string
}): Promise<Application> {
  return apiFetch('/api/apply', { method: 'POST', body: JSON.stringify(payload) })
}

export async function proposalAssistant(payload: { job_id: number }): Promise<{
  proposal: string
  expected_price: number
  estimated_time: string
  provider: string
  model?: string
}> {
  return apiFetch('/api/ai/proposal', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listApplicationsToMyJobs(): Promise<Application[]> {
  return apiFetch('/api/applications')
}

export async function listMyApplications(): Promise<
  (Application & { client?: { id: number; name: string; email: string } })[]
> {
  return apiFetch('/api/my-applications')
}

export async function setApplicationStatus(payload: {
  application_id: number
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'completed'
}): Promise<{ id: number; status: string }> {
  return apiFetch(`/api/applications/${payload.application_id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: payload.status }),
  })
}

export type Message = {
  id: number
  sender_id: number
  receiver_id: number
  message_text: string
  timestamp: string
}

export async function sendMessage(payload: {
  receiver_id: number
  message_text: string
}): Promise<Message> {
  return apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(payload) })
}

export async function getThread(with_user_id: number): Promise<Message[]> {
  const url = new URL('/api/messages', window.location.origin)
  url.searchParams.set('with_user_id', String(with_user_id))
  return apiFetch(url.pathname + url.search)
}

export type InboxItem = {
  with_user_id: number
  last_message: Message
}

export async function getInbox(): Promise<InboxItem[]> {
  return apiFetch('/api/inbox')
}

export type Review = {
  id: number
  reviewer_id: number
  reviewed_user_id: number
  rating: number
  comment: string | null
  created_at: string
}

export async function createReview(payload: {
  reviewed_user_id: number
  rating: number
  comment?: string
}): Promise<Review> {
  return apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listReviews(user_id: number): Promise<Review[]> {
  const url = new URL('/api/reviews', window.location.origin)
  url.searchParams.set('user_id', String(user_id))
  return apiFetch(url.pathname + url.search)
}

export async function getUser(user_id: number): Promise<any> {
  return apiFetch(`/api/users/${user_id}`)
}

export type NotificationItem = {
  id: number
  type: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export async function listNotifications(): Promise<NotificationItem[]> {
  return apiFetch('/api/notifications')
}

export async function markNotificationRead(notification_id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/notifications/${notification_id}/read`, { method: 'POST' })
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return apiFetch('/api/notifications/read-all', { method: 'POST' })
}

export async function listTopFreelancers(): Promise<any[]> {
  return apiFetch('/api/top-freelancers')
}

export async function adminStats(): Promise<any> {
  return apiFetch('/api/admin/stats')
}

export async function adminDeleteGig(gig_id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/gigs/${gig_id}`, { method: 'DELETE' })
}

export async function adminDeleteJob(job_id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/admin/jobs/${job_id}`, { method: 'DELETE' })
}

export type AdminUserRow = {
  id: number
  name: string
  email: string
  role: string
  created_at: string
}

export async function adminListUsers(params?: { q?: string }): Promise<AdminUserRow[]> {
  const url = new URL('/api/users', window.location.origin)
  if (params?.q) url.searchParams.set('q', params.q)
  return apiFetch(url.pathname + url.search)
}

