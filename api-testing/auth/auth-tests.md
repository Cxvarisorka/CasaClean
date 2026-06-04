# Auth Endpoints — Test Plan

These endpoints handle signing up, logging in, logging out, email verification,
and getting your own profile.

Base address: `http://localhost:3000/api/v1/auth`

| Method | Endpoint                      | Who can use it      | What it does                       |
|--------|-------------------------------|---------------------|------------------------------------|
| POST   | `/signup`                     | Anyone              | Make a new account                 |
| POST   | `/signin`                     | Anyone              | Log in and get a cookie            |
| GET    | `/verify-email/:token`        | Anyone (email link) | Confirm your email                 |
| POST   | `/resend-verification`        | Anyone              | Send the verify email again        |
| GET    | `/google`                     | Anyone              | Start Google login                 |
| GET    | `/google/callback`            | Google              | Google sends user back here        |
| POST   | `/logout`                     | Logged-in users     | Log out (clears cookie)            |
| GET    | `/me`                         | Logged-in users     | Get your own profile               |

---

## 1. POST `/signup` — Make a new account

**What to send (body, JSON):**
```json
{
  "fullname": "Maria Rossi",
  "email": "maria@example.com",
  "phone": "+39 333 1112233",
  "password": "secret123"
}
```

**curl:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"fullname\":\"Maria Rossi\",\"email\":\"maria@example.com\",\"phone\":\"+39 333 1112233\",\"password\":\"secret123\"}"
```

### Tests

| # | What you do                                  | Expected status | Expected answer                                                                 |
|---|----------------------------------------------|-----------------|---------------------------------------------------------------------------------|
| 1 | Send all 4 fields correctly                  | **201**         | message: "Account created! Please check your email to verify your account."     |
| 2 | A verification email should arrive           | —               | Check the Mailtrap inbox — there should be an email with a verify link          |
| 3 | Use an email that already exists             | **409**         | message says the email is already in use                                        |
| 4 | Leave out `password` (or make it < 8 chars)  | **400**         | message about invalid input / password too short                                |
| 5 | Leave out `email`                            | **400**         | message about email required                                                     |
| 6 | Leave out `fullname`                         | **400**         | message about fullname required                                                  |

> **Note:** After signup the account is **not active yet**. The user cannot log in
> until the email is verified.

---

## 2. POST `/signin` — Log in

**What to send (body, JSON):**
```json
{
  "email": "maria@example.com",
  "password": "secret123"
}
```

**curl (save the cookie to a file):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signin ^
  -H "Content-Type: application/json" ^
  -c cookie.txt ^
  -d "{\"email\":\"maria@example.com\",\"password\":\"secret123\"}"
```

### Tests

| # | What you do                                       | Expected status | Expected answer                                            |
|---|---------------------------------------------------|-----------------|-----------------------------------------------------------|
| 1 | Correct email + password, email **verified**      | **200**         | message: "Successfully signed in!" + a cookie named `lt`  |
| 2 | The answer should include the user (no password)  | —               | `data.user` is present, and `password` is NOT shown       |
| 3 | Correct email but **wrong password**              | **401**         | message: "Credentials are incorrect!"                     |
| 4 | Email that does not exist                          | **401**         | message: "Credentials are incorrect!" (same on purpose)   |
| 5 | Correct details but email **not verified yet**    | **403**         | message: "Please verify your email before signing in."    |
| 6 | Leave out email or password                        | **400**         | message: "Please provide email and password!"            |

> **Why is #3 and #4 the same message?** On purpose — so a stranger cannot find out
> which emails are registered.

---

## 3. GET `/verify-email/:token` — Confirm your email

This link is inside the verification email. You normally click it in the browser.
Replace `:token` with the real token from the email link.

**Example:**
```
http://localhost:3000/api/v1/auth/verify-email/PASTE_THE_TOKEN_HERE
```

### Tests

| # | What you do                                  | Expected result                                                            |
|---|----------------------------------------------|---------------------------------------------------------------------------|
| 1 | Open the real link from the email            | Browser is **redirected** to `CLIENT_URL/signin?verified=success`         |
| 2 | After this, try to sign in                   | Now sign in works (**200**)                                              |
| 3 | Open a made-up / wrong token                  | Redirected to `CLIENT_URL/signin?verified=failed`                        |
| 4 | Open the same valid link a second time        | Redirected to `...verified=failed` (the token was already used)         |
| 5 | Open the link after 24 hours (expired)        | Redirected to `...verified=failed`                                       |

> **Note:** This endpoint **redirects** (it does not return JSON), because a normal
> person opens it in a browser.

---

## 4. POST `/resend-verification` — Send the verify email again

**What to send (body, JSON):**
```json
{
  "email": "maria@example.com"
}
```

### Tests

| # | What you do                                          | Expected status | Expected answer                                                                                    |
|---|------------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------|
| 1 | Send an email of a real, **unverified** user         | **200**         | message: "If an unverified account exists for that email, a new verification link has been sent."  |
| 2 | A new verification email should arrive               | —               | Check Mailtrap inbox                                                                                |
| 3 | Send an email that does not exist                    | **200**         | Same generic message (no new email is sent)                                                         |
| 4 | Send an email of an **already verified** user        | **200**         | Same generic message (no new email is sent)                                                         |
| 5 | Leave out `email`                                    | **400**         | message: "Please provide an email address."                                                        |

> **Why always 200?** On purpose — so nobody can use this to find out which emails exist.

---

## 5. GET `/google` and GET `/google/callback` — Google login

These are tested by hand in a browser (they need real Google sign-in).

### Tests

| # | What you do                                   | Expected result                                                  |
|---|-----------------------------------------------|------------------------------------------------------------------|
| 1 | Open `/google` in a browser                   | You are sent to Google's sign-in page                            |
| 2 | Finish Google sign-in                         | Google sends you back, you get the `lt` cookie, and a user record|
| 3 | A Google user is already verified             | They can use `/me` and logout right away (no email step needed)  |

---

## 6. POST `/logout` — Log out

You must be logged in (cookie must be sent).

**curl (send the saved cookie):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                          |
|---|--------------------------------------|-----------------|------------------------------------------|
| 1 | Call it while logged in              | **200**         | message: "Successfully logged out!"      |
| 2 | The `lt` cookie should be cleared    | —               | Cookie value becomes empty / expired     |
| 3 | Call it with no cookie               | **401**         | message: "Authorization is required!"    |

---

## 7. GET `/me` — Get your own profile

You must be logged in (cookie must be sent).

**curl:**
```bash
curl http://localhost:3000/api/v1/auth/me -b cookie.txt
```

### Tests

| # | What you do                          | Expected status | Expected answer                                  |
|---|--------------------------------------|-----------------|--------------------------------------------------|
| 1 | Call it while logged in              | **200**         | `data.user` with your info (no password)         |
| 2 | Call it with no cookie               | **401**         | message: "Authorization is required!"            |
| 3 | Call it with a fake/broken cookie    | **401**         | message: "Invalid token. Please log in again!"   |
| 4 | Call it with an expired cookie       | **401**         | message: "Your session has expired..."           |
