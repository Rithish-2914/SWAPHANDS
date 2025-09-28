#!/bin/bash

# Save the session cookie to a temporary file
COOKIE_FILE=$(mktemp)

# Log in and save the cookie to the file
curl -s -X POST https://swaphands-production-c5a6.up.railway.app/api/login \
-H "Content-Type: application/json" \
-c "$COOKIE_FILE" \
-d '{"email": "bajjuri.rithish2025@vitstudent.ac.in", "password": "MyNewPassword123"}'

# Use the saved cookie to access a protected route
curl -s -X GET https://swaphands-production-c5a6.up.railway.app/api/user \
-b "$COOKIE_FILE"

# Clean up the temporary file
rm "$COOKIE_FILE"