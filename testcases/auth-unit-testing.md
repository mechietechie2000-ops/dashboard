# Step 1: Test Unauthenticated Access (Should Fail)

Try accessing a protected route without logging in first.

```
curl -i -X GET http://localhost:5001/api/routine
```

Expected Result: HTTP/1.1 401 Unauthorized
Response Body: {"error":"Access denied. No token provided."}

# Step 2: Register a New User

Create a fresh user via the register endpoint.

```
curl -i -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected Result: HTTP/1.1 201 Created
Response Body: {"message":"User registered successfully","userId":1}

# Step 3: Log In & Save Cookie

Log in with the created credentials. We use -c cookies.txt in curl to store the HTTP-only cookie sent back by Express.

```
curl -i -X POST http://localhost:5001/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected Result: HTTP/1.1 200 OK
Response Header: Look for Set-Cookie: token=eyJhbG...; Path=/; HttpOnly;
Response Body: {"message":"Login successful","user":{"id":1,"email":"test@example.com"}}

# Step 4: Access Protected Route WITH Cookie (Should Succeed)
Send a request to your protected routine route while attaching the stored cookie using -b cookies.txt.

```
curl -i -X GET http://localhost:5001/api/routine \
  -b cookies.txt
```

Expected Result: HTTP/1.1 200 OK
Response Body: Your array of routine items from SQLite!

# Step 5: Test Logout
Call the logout endpoint to clear the cookie.

```
curl -i -X POST http://localhost:5001/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

Expected Result: HTTP/1.1 200 OK
Response Header: Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970...

# Step 6: Verify Protected Route is Blocked Again
Try hitting the protected route again with the updated cookie file.

```
curl -i -X GET http://localhost:5001/api/routine \
  -b cookies.txt
```
Expected Result: HTTP/1.1 401 Unauthorized