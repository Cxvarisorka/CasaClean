# Setup — Get Ready Before Testing

Do these steps once before you start testing.

## 1. Start the database

The API needs MongoDB running. Make sure MongoDB is started on your computer
(default address `mongodb://127.0.0.1:27017/casaclean`).

## 2. Set up the server settings

Inside the `server/` folder, copy `.env.example` to a new file named `.env`,
then fill in the values. The important ones for testing:

- `PORT=3000` — the port the API runs on.
- `NODE_ENV=dev` — keep this as `dev` while testing (errors show more detail).
- `MONGO_URI` — your database address.
- `JWT_SECRET` — any long random text (needed for login to work).
- `MAIL_*` — email settings (use a free Mailtrap inbox to see verification emails).

## 3. Start the server

Open a terminal in the `server/` folder and run:

```
npm install
npm start
```

You should see:

```
Server is running on port 3000
```

## 4. Quick check it is alive

Open this address in your browser or with curl:

```
http://localhost:3000/api/v1/anything-here
```

**Expected:** status `404` and a message like
`Can't find /api/v1/anything-here on this server!`
This is good — it means the server is answering.

## 5. Make an admin user (needed for city & service tests)

Some endpoints only work for an **admin**. New users are always normal users.
To test admin endpoints you must make one user an admin:

1. Sign up a user (see [auth tests](auth/auth-tests.md)).
2. Verify the email (click the link from the Mailtrap inbox).
3. Open the database and change that user's `role` field from `"user"` to `"admin"`.
4. Sign in again with that user to get a fresh admin cookie.

Now you are ready. Go to [auth/auth-tests.md](auth/auth-tests.md).
