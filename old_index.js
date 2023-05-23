// Import the database driver
const dbDriver = require('better-sqlite3');

// Connect to the database
const db = dbDriver('bands-and-members.db');

// Import Express (a web server for Node.js)
const express = require('express');

// Create a new Express-based web server
const app = express();

// Serve all files in the frontend folder
app.use(express.static('frontend'));

// Allow express to read request bodies
app.use(express.json());


function setupAllRoutes() {
  // Get all tables and views in the database
  let statement = db.prepare(`
    SELECT name, type FROM sqlite_schema
    WHERE
      type IN ('table', 'view')
      AND name NOT LIKE 'sqlite_%'
  `);
  let tablesAndViews = statement.all();
  // Loop tables and views and setup routes
  for (let { name, type } of tablesAndViews) {
    setUpRoutesForOneDbTable(name, type);
    console.log('Routes created for the', type, name);
  }
}

// Set up all basic REST routes needed for one table
function setUpRoutesForOneDbTable(tableName, type) {

  // Get all
  app.get('/api/' + tableName, (req, res) => {
    let statement = db.prepare(`
    SELECT * FROM ${tableName}
  `);
    let result = statement.all();
    res.json(result);
  });

  // Get one
  app.get('/api/' + tableName + '/:id', (req, res) => {
    let searchId = req.params.id;
    let statement = db.prepare(`
    SELECT * FROM ${tableName} WHERE id = :searchId
  `);
    let result = statement.all({ searchId });
    res.json(result[0] || null);
  });

  // If it's a view rather than a table then do nothing more
  if (type === 'view') { return; }

  // Create one
  app.post('/api/' + tableName, (req, res) => {
    let statement = db.prepare(`
    INSERT INTO ${tableName} (${Object.keys(req.body).join(', ')})
    VALUES (${Object.keys(req.body).map(x => ':' + x).join(', ')})
  `);
    let result;
    try {
      result = statement.run(req.body);
    }
    catch (error) {
      result = { error: error + '' };
    }
    res.json(result);
  });

  // Delete one
  app.delete('/api/' + tableName + '/:id', (req, res) => {
    let statement = db.prepare(`
    DELETE FROM ${tableName}
    WHERE id = :idToDelete
  `);
    let result = statement.run({
      idToDelete: req.params.id
    });
    res.json(result);
  });

  // Change one
  app.put('/api/' + tableName + '/:id', (req, res) => {
    let result;
    try {
      let statement = db.prepare(`
      UPDATE ${tableName}
      SET ${Object.keys(req.body).map(x => x + ' = :' + x).join(', ')}
      WHERE id = :id
    `);
      result = statement.run({ ...req.body, id: req.params.id });
    }
    catch (error) {
      result = { error: error + '' }
    }
    res.json(result);
  });

}

setupAllRoutes();

// Start the web server on port 3000
app.listen(3000, () => {
  console.log('Listening on port 3000');
});
