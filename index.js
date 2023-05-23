const driver = require("better-sqlite3");
const db = driver("bands-albums-and-members.sqlite3");
const express = require("express");
const app = express();
const dotenv = require('dotenv');
dotenv.config();


app.use(express.json());

// Auth token
const auth_token = process.env.AUTH_TOKEN;

// Add a middleware that checks if the request contains a valid authentication token
app.use((req, res, next) => {
  // Check if the request contains a valid authentication token
  // You can implement your own authentication logic here
  const authToken = req.headers.authorization;
  if (!authToken || !isValidAuthToken(authToken)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Authentication successful, proceed to the next middleware/route handler
  next();
});

// Add a middleware to check for empty request bodies and empty strings in request bodies but exclude GET requests
  app.use((req, res, next) => {
    // Check if the request method is GET
    if (req.method === 'GET' || req.method === 'DELETE') {
      // Proceed to the next middleware/route handler
      return next();
    }
    // Check if the request body is empty
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is empty" });
    }
    // Check if the request body contains empty strings
    if (hasEmptyStrings(req.body)) {
      return res.status(400).json({ error: "Request body contains empty strings" });
    }
    // Request body is not empty and does not contain empty strings, proceed to the next middleware/route handler
    next();
  });


// Check if the request body contains empty strings
function hasEmptyStrings(obj) {
  // Check if the current object is a string
  if (typeof obj === 'string') {
    // Check if the string is empty
    if (obj.trim().length === 0) {
      return true;
    }
  }
  // Check if the current object is an array
  if (Array.isArray(obj)) {
    // Loop through the array and check if the current element is a string
    for (let element of obj) {
      // Check if the string is empty
      if (element.trim().length === 0) {
        return true;
      }
    }
  }
  // Check if the current object is an object
  if (typeof obj === 'object') {
    // Loop through the object and check if the current property is a string
    for (let property in obj) {
      // Check if the string is empty
      if (obj[property].trim().length === 0) {
        return true;
      }
    }
  }
  // The request body does not contain empty strings
  return false;
}

// Mock implementation of a function that checks if the request contains a valid authentication token
function isValidAuthToken(token) {
  // Mock implementation: Check if the token is equal to 'mockAuthToken'
  return token === 'Bearer ' + auth_token;
}



(() => {
  let statement = db.prepare(`
    SELECT name, type FROM sqlite_schema
    WHERE
      type IN ('table', 'view')
      AND name NOT LIKE 'sqlite_%'
  `);
  let tablesAndViews = statement.all();
  for (let { name, type } of tablesAndViews) {
    setupRoute(name, type);
    console.log("Routes created for the", type, name);
  }
})();

function setupRoute(table, type) {
  // Get all
  app.get("/api/" + table, (req, res) => {
    let statement = db.prepare(`
      SELECT * FROM ${table}
    `);
    let result = statement.all();
    res.json(result);
  });

  // Get one
  app.get("/api/" + table + "/:id", (req, res) => {
    let searchId = req.params.id;
    let statement = db.prepare(`
      SELECT * FROM ${table} WHERE id = :searchId
    `);
    let result = statement.all({ searchId });
    res.json(result[0] || null);
  });

  // Only get routes for the views
  if (type === "view") { return; }

  // Create one
  app.post("/api/" + table, (req, res) => {
    let statement = db.prepare(`
      INSERT INTO ${table} (${Object.keys(req.body).join(", ")})
      VALUES (${Object.keys(req.body)
        .map((x) => ":" + x)
        .join(", ")})
    `);
    let result;
    try {
      result = statement.run(req.body);
      res.status(201).json(result);
    } catch (error) {
      result = { error: error + "" };
      res.status(400).json(result);
    }
  });

  // Delete one
  app.delete("/api/" + table + "/:id", (req, res) => {
    let statement = db.prepare(`
      DELETE FROM ${table}
      WHERE id = :idToDelete
    `);
    let result = statement.run({
      idToDelete: req.params.id,
    });
    res.json(result);
  });

  // Delete all
  app.delete("/api/" + table, (req, res) => {
    let statement = db.prepare(`
      DELETE FROM ${table}
    `);
    let result = statement.run();
    res.json(result);
  });

  // Change one put
  app.put("/api/" + table + "/:id", (req, res) => {
    let result;
    try {
      let statement = db.prepare(`
        UPDATE ${table}
        SET ${Object.keys(req.body)
          .map((x) => x + " = :" + x)
          .join(", ")}
        WHERE id = :id
      `);
      result = statement.run({ ...req.body, id: req.params.id });
    } catch (error) {
      result = { error: error + "" };
    }
    res.json(result);
  });

  // Change one patch
  app.patch("/api/" + table + "/:id", (req, res) => {
    let result;
    try {
      let statement = db.prepare(`
        UPDATE ${table}
        SET ${Object.keys(req.body)
          .map((x) => x + " = :" + x)
          .join(", ")}
        WHERE id = :id
      `);
      result = statement.run({ ...req.body, id: req.params.id });
    } catch (error) {
      result = { error: error + "" };
    }
    res.json(result);
  });
}

app.listen(3000, () => {
  console.log('Listening on port 3000');
});