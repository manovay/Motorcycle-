// Importing Required Modules
const express = require('express');
const PouchDB = require('pouchdb');
const dotenv = require('dotenv');
const cors = require('cors');


// Initialize PouchDB
const db = new PouchDB('searches');

// Create Express App
const app = express();
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // Use express.json() for parsing JSON request bodies

let idCounter = 1; // Simple counter for generating unique IDs

// Function to Calculate Rideability Score
const calculateRideabilityScore = (temperature, visibility, isSnow, precipitation, wind) => {
  let score = 10;
  if (isSnow) score -= 8;
  if (precipitation > 0) score -= 3;
  if (visibility < 2) score -= 5;
  if (visibility < 5) score -= 2;
  if (visibility < 10) score -= 1;
  if (temperature < 0 || temperature > 30) score -= 2;
  if (temperature < 5 || temperature > 25) score -= 1;
  if (wind > 5) score -= 1;
  if (wind > 10) score -= 2;
  return score;
};

// Mock data for demonstration
const mockWeatherData = {
  location: "Redmond",
  temperature: 18,
  humidity: 60,
  weather: "clear sky",
  precipitation: 0,
  visibility: 10,
  wind: 3.1,
  rideabilityScore: 9
};

app.get('/api/weather/:zipCode', async (req, res) => {
  const { zipCode } = req.params;
  try {
    console.log(`Received request for zip code: ${zipCode}`);

    // Fetch the document if it exists
    let existingSearch;
    try {
      existingSearch = await db.get(`search-${zipCode}`);
    } catch (error) {
      // If the document doesn't exist, send a code 
      if (error.status === 404) {
        existingSearch = null; // Set existingSearch to null to indicate it's not found
      } else {
        throw error; // Re-throw any other errors
      }
    }

    // Update specific fields if necessary
    if (existingSearch) {
      existingSearch.temperature = mockWeatherData.temperature;
      existingSearch.humidity = mockWeatherData.humidity;

      await db.put(existingSearch);
    } else {
      // If it doesn't exist, create a new document
      const searchEntry = {
        ...mockWeatherData,
        zipCode,
        _id: `search-${zipCode}`
      };
      await db.put(searchEntry);
      existingSearch = searchEntry; // Set existingSearch to the newly created document
    }

    res.json(existingSearch); // Send the updated or newly created document
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});




// CRUD Endpoints

// Create a new search entry
app.post('/api/searches', async (req, res) => {
  const { zipCode, location, temperature, humidity, weather, precipitation, visibility, wind } = req.body;

  const newSearch = {
    _id: idCounter.toString(),
    zipCode,
    location,
    temperature,
    humidity,
    weather,
    precipitation,
    visibility,
    wind,
    rideabilityScore: calculateRideabilityScore(temperature, visibility, false, precipitation, wind)
  };

  try {
    await db.put(newSearch);
    idCounter += 1;
    res.status(201).json(newSearch);
  } catch (error) {
    console.error('Error creating new search entry:', error.message);
    res.status(500).json({ error: 'Failed to create new search entry' });
  }
});

// Get all search entries
app.get('/api/searches', async (req, res) => {
  try {
    const result = await db.allDocs({ include_docs: true, descending: true });
    const searches = result.rows.map(row => row.doc);
    res.json(searches);
  } catch (error) {
    console.error('Error fetching search entries:', error.message);
    res.status(500).json({ error: 'Failed to fetch search entries' });
  }
});

// Get a single search entry by ID
app.get('/api/searches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const search = await db.get(id);
    res.json(search);
  } catch (error) {
    console.error('Error fetching search entry:', error.message);
    res.status(404).json({ error: 'Search entry not found' });
  }
});

// Update a search entry
app.put('/api/searches/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const search = await db.get(id);
    const updatedSearch = { ...search, ...updates };
    await db.put(updatedSearch);
    res.json(updatedSearch);
  } catch (error) {
    console.error('Error updating search entry:', error.message);
    res.status(500).json({ error: 'Failed to update search entry' });
  }
});

// Delete a search entry
app.delete('/api/searches/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const search = await db.get(id);
    await db.remove(search);
    res.json({ message: 'Search entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting search entry:', error.message);
    res.status(500).json({ error: 'Failed to delete search entry' });
  }
});

// Start the Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
