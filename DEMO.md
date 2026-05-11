## Demo logins

- `emma@campus.test` / `Password123!` (client / job poster)
- `bob@campus.test` / `Password123!` (developer)
- `alice@campus.test` / `Password123!` (designer)
- `chloe@campus.test` / `Password123!` (writer)
- `dylan@campus.test` / `Password123!` (tutor)
- `admin@campus.test` / `Password123!` (admin)

## Best “real world” demo flow (5–7 minutes)

### 1) Browse (logged out)

- Go to **Gigs** and **Jobs**: you should see multiple categories and realistic listings.
- Open a **Job Detail** page: you can view the job, but applying should require login.

### 2) Client flow (Emma)

- Login as `emma@campus.test`
- Go to **Dashboard**: KPIs should be populated.
- Go to **Applications**: you should see incoming proposals for jobs Emma posted.
- Change an application status (shortlist/accept/reject/complete): the freelancer should get a notification.
- Go to **Messages**: you should see an existing conversation (Emma ↔ Bob / Emma ↔ Dylan).

### 3) Freelancer flow (Bob or Alice)

- Logout, then login as `bob@campus.test` (or `alice@campus.test`)
- Go to **Notifications** (bell): you should see system + message updates.
- Go to **Top Freelancers**: badges + ratings should appear.
- Open **Jobs**, view a job, and submit an application (proposal + price + time).

### 4) Admin flow (Admin)

- Login as `admin@campus.test`
- Go to **Admin Dashboard**: stats should be non-zero.

## If data looks empty

Run these from `backend/`:

```powershell
python manage.py reset-db
python manage.py seed
python run.py
```

