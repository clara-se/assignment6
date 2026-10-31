import 'dotenv/config'; // first line, before anything reads process.env
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Recipe } from './models/Recipe.js';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();

// ---------- middleware (order matters) ----------

function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next();
}

app.use(logger);
app.use(cors({ origin: clientOrigin })); // before the routes
app.use(express.json());

// A request with a body that is not valid JSON would otherwise get an HTML
// error page. This turns it into a JSON 400 so the server answers clearly.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  next(err);
});

// ---------- validation (middleware: check, then next()) ----------

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isTextList = (v) => Array.isArray(v) && v.every(isText);

// Returns a list of readable problems. `requireAll` is true for POST/PUT,
// where title and ingredients must be sent. PATCH only checks what was sent.
function findProblems(body, requireAll) {
  const problems = [];
  const { title, description, ingredients, steps, prepTime, difficulty, tags } = body;

  if (title === undefined) {
    if (requireAll) problems.push('title is required');
  } else if (!isText(title)) {
    problems.push('title must be a non-empty string');
  } else if (title.trim().length > 120) {
    problems.push('title must be 120 characters or fewer');
  }

  if (ingredients === undefined) {
    if (requireAll) problems.push('ingredients is required');
  } else if (!isTextList(ingredients) || ingredients.length === 0) {
    problems.push('ingredients must be a non-empty array of non-empty strings');
  }

  if (description !== undefined) {
    if (typeof description !== 'string') problems.push('description must be a string');
    else if (description.length > 1000) problems.push('description must be 1000 characters or fewer');
  }

  if (steps !== undefined && !isTextList(steps)) {
    problems.push('steps must be an array of non-empty strings');
  }

  if (tags !== undefined && !isTextList(tags)) {
    problems.push('tags must be an array of non-empty strings');
  }

  if (prepTime !== undefined && (typeof prepTime !== 'number' || !(prepTime >= 0))) {
    problems.push('prepTime must be a number of minutes, 0 or more');
  }

  if (difficulty !== undefined && !DIFFICULTIES.includes(difficulty)) {
    problems.push(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  return problems;
}

function validateRecipe(req, res, next) {
  const body = req.body ?? {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  const problems = findProblems(body, true);
  if (problems.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: problems });
  }
  next();
}

function validateRecipePatch(req, res, next) {
  const body = req.body ?? {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }
  const problems = findProblems(body, false);
  const fields = ['title', 'description', 'ingredients', 'steps', 'prepTime', 'difficulty', 'tags'];
  if (!fields.some((f) => body[f] !== undefined)) {
    problems.push(`send at least one of: ${fields.join(', ')}`);
  }
  if (problems.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: problems });
  }
  next();
}

// Only these fields are ever saved. The server sets id and timestamps,
// never the client.
function pickFields(body) {
  const data = {};
  for (const f of ['title', 'description', 'ingredients', 'steps', 'prepTime', 'difficulty', 'tags']) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  return data;
}

// Used inside every catch block.
function sendError(err, res) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
}

// ---------- routes ----------

app.get('/', (req, res) => {
  res.json({ status: 'ok', resource: '/api/recipes' });
});

// READ ALL  (optional ?search=  ?difficulty=  ?tag=  ?limit=)
app.get('/api/recipes', async (req, res) => {
  try {
    const { search = '', difficulty, tag, limit } = req.query;
    const filter = {};

    if (search) {
      // escape special characters so "(" in the search text can't break the regex
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: safe, $options: 'i' };
    }
    if (difficulty !== undefined) {
      if (!DIFFICULTIES.includes(difficulty)) {
        return res
          .status(400)
          .json({ error: `difficulty must be one of: ${DIFFICULTIES.join(', ')}` });
      }
      filter.difficulty = difficulty;
    }
    if (tag) filter.tags = String(tag);

    let query = Recipe.find(filter).sort({ createdAt: -1 });
    if (limit !== undefined) {
      const n = Number(limit);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ error: 'limit must be a whole number, 1 or more' });
      }
      query = query.limit(n);
    }

    res.json(await query);
  } catch (err) {
    sendError(err, res);
  }
});

// READ ONE
app.get('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const recipe = await Recipe.findById(id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    sendError(err, res);
  }
});

// CREATE
app.post('/api/recipes', validateRecipe, async (req, res) => {
  try {
    const recipe = await Recipe.create(pickFields(req.body));
    res.status(201).json(recipe);
  } catch (err) {
    sendError(err, res);
  }
});

// REPLACE  (PUT: the whole recipe is replaced, so fields not sent go back to their defaults)
app.put('/api/recipes/:id', validateRecipe, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const b = req.body;
    const replacement = {
      title: b.title,
      description: b.description ?? '',
      ingredients: b.ingredients,
      steps: b.steps ?? [],
      prepTime: b.prepTime ?? 0,
      difficulty: b.difficulty ?? 'easy',
      tags: b.tags ?? [],
    };
    const recipe = await Recipe.findByIdAndUpdate(id, replacement, {
      new: true, // return the new version
      runValidators: true,
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    sendError(err, res);
  }
});

// UPDATE  (PATCH: only the fields you send change)
app.patch('/api/recipes/:id', validateRecipePatch, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const recipe = await Recipe.findByIdAndUpdate(id, pickFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    sendError(err, res);
  }
});

// DELETE  (204 means it worked and there is no body)
app.delete('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const recipe = await Recipe.findByIdAndDelete(id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.sendStatus(204);
  } catch (err) {
    sendError(err, res);
  }
});

// after all routes: nothing matched
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- connect first, then listen ----------

try {
  if (!dbUri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
