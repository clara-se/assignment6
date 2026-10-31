# Recipes REST API

A RESTful API for **recipes**, built with Node.js, Express and MongoDB (through Mongoose). It exposes one resource, `/api/recipes`, with full CRUD, input validation and JSON error messages. All data is stored in a real MongoDB database, so it survives a server restart.

Assignment 6 – Web Development.

## Stack

- Node.js (ES modules)
- Express
- MongoDB Atlas + Mongoose
- dotenv (secrets in `.env`)
- cors (so a React front end on `localhost:5173` can call the API)

## Setup

### 1. Get a MongoDB database (MongoDB Atlas, free)

1. Create a free cluster on MongoDB Atlas.
2. Add a database user and password.
3. Under **Network Access**, allow your IP.
4. Copy the connection string and add the database name `recipes` before the `?`.

### 2. Install

```bash
npm install
```

### 3. Create your `.env` file

Copy `.env.example` to `.env` and fill in your connection string:

```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/recipes
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
```

`.env` is listed in `.gitignore`, so your password is never committed.

### 4. Run

```bash
npm run dev      # restarts on every save
npm start        # plain start
```

You should see:

```
connected to MongoDB
Listening on http://localhost:3000
```

If the connection fails, the server prints `DB connection failed: ...` and stops. The usual causes are a missing `.env` or an IP that is not allowed in Atlas Network Access.

## The recipe resource

| Field         | Type             | Rules                                            | Default  |
| ------------- | ---------------- | ------------------------------------------------ | -------- |
| `title`       | string           | **required**, not empty, max 120 characters      |          |
| `ingredients` | array of strings | **required**, at least one non-empty item        |          |
| `description` | string           | max 1000 characters                              | `""`     |
| `steps`       | array of strings | non-empty items                                  | `[]`     |
| `prepTime`    | number           | minutes, 0 or more                               | `0`      |
| `difficulty`  | string           | one of `easy`, `medium`, `hard`                  | `"easy"` |
| `tags`        | array of strings | non-empty items                                  | `[]`     |
| `_id`         | string           | set by MongoDB, never by the client              |          |
| `createdAt`   | date             | set by the server                                |          |
| `updatedAt`   | date             | set by the server                                |          |

Any other field sent by the client (for example `_id` or `id`) is ignored.

## Routes

Base URL: `http://localhost:3000`

| Method   | Path               | What it does                                | Success | Errors        |
| -------- | ------------------ | ------------------------------------------- | ------- | ------------- |
| `GET`    | `/api/recipes`     | List all recipes (optional filters below)   | 200     | 400, 500      |
| `GET`    | `/api/recipes/:id` | Get one recipe                              | 200     | 400, 404, 500 |
| `POST`   | `/api/recipes`     | Create a recipe                             | 201     | 400, 500      |
| `PUT`    | `/api/recipes/:id` | Replace a recipe (fields not sent are reset)| 200     | 400, 404, 500 |
| `PATCH`  | `/api/recipes/:id` | Change only the fields you send             | 200     | 400, 404, 500 |
| `DELETE` | `/api/recipes/:id` | Delete a recipe                             | 204     | 400, 404, 500 |

`GET /` returns `{ "status": "ok", "resource": "/api/recipes" }` and can be used to check the server is up.

### GET /api/recipes

Returns an array, newest first. Optional query strings:

| Query         | Meaning                                  | Example                    |
| ------------- | ---------------------------------------- | -------------------------- |
| `search`      | title contains this text (any case)      | `?search=tab`              |
| `difficulty`  | `easy`, `medium` or `hard`               | `?difficulty=hard`         |
| `tag`         | recipe has this tag                      | `?tag=lebanese`            |
| `limit`       | maximum number of recipes (whole number) | `?limit=10`                |

They can be combined: `/api/recipes?tag=lebanese&difficulty=easy&limit=5`.

**Request**

```bash
curl -i "http://localhost:3000/api/recipes?search=tab"
```

**Response — 200 OK**

```json
[
  {
    "_id": "6ae63978f9243d090d484e25",
    "title": "Tabbouleh",
    "description": "Fresh parsley salad",
    "ingredients": ["parsley", "tomato", "bulgur", "lemon"],
    "steps": ["Chop", "Mix"],
    "prepTime": 20,
    "difficulty": "easy",
    "tags": ["salad", "lebanese"],
    "createdAt": "2026-10-31T18:54:48.812Z",
    "updatedAt": "2026-10-31T18:54:48.812Z"
  }
]
```

An empty collection (or no match) returns `[]` with status 200.

**Error — 400 Bad Request** (for example `?difficulty=extreme`)

```json
{ "error": "difficulty must be one of: easy, medium, hard" }
```

### GET /api/recipes/:id

**Request**

```bash
curl -i http://localhost:3000/api/recipes/6ae63978f9243d090d484e25
```

**Response — 200 OK**: the recipe object (same shape as above).

**Error — 400 Bad Request** (the id is not a valid MongoDB id, e.g. `/api/recipes/123`)

```json
{ "error": "Invalid id" }
```

**Error — 404 Not Found** (valid id, no such recipe)

```json
{ "error": "Recipe not found" }
```

### POST /api/recipes

**Request**

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Kibbeh","ingredients":["bulgur","lamb"],"difficulty":"hard","tags":["lebanese"]}'
```

**Response — 201 Created**

```json
{
  "_id": "6ae63978f9243d090d484e26",
  "title": "Kibbeh",
  "description": "",
  "ingredients": ["bulgur", "lamb"],
  "steps": [],
  "prepTime": 0,
  "difficulty": "hard",
  "tags": ["lebanese"],
  "createdAt": "2026-10-31T18:54:48.829Z",
  "updatedAt": "2026-10-31T18:54:48.829Z"
}
```

**Error — 400 Bad Request** (every problem is listed)

Request body: `{"title":"   ","ingredients":[],"prepTime":-3,"difficulty":"wow"}`

```json
{
  "error": "Validation failed",
  "details": [
    "title must be a non-empty string",
    "ingredients must be a non-empty array of non-empty strings",
    "prepTime must be a number of minutes, 0 or more",
    "difficulty must be one of: easy, medium, hard"
  ]
}
```

A body that is not valid JSON returns `400` with `{ "error": "Request body is not valid JSON" }`.

### PUT /api/recipes/:id

Replaces the whole recipe. `title` and `ingredients` are required, and any other field you leave out goes back to its default.

**Request**

```bash
curl -i -X PUT http://localhost:3000/api/recipes/6ae63978f9243d090d484e25 \
  -H "Content-Type: application/json" \
  -d '{"title":"Tabbouleh v2","ingredients":["parsley","mint"]}'
```

**Response — 200 OK** (the new version)

```json
{
  "_id": "6ae63978f9243d090d484e25",
  "title": "Tabbouleh v2",
  "description": "",
  "ingredients": ["parsley", "mint"],
  "steps": [],
  "prepTime": 0,
  "difficulty": "easy",
  "tags": [],
  "createdAt": "2026-10-31T18:54:48.812Z",
  "updatedAt": "2026-10-31T18:54:55.367Z"
}
```

**Errors**

- `400` – `{ "error": "Validation failed", "details": ["ingredients is required"] }` or `{ "error": "Invalid id" }`
- `404` – `{ "error": "Recipe not found" }`

### PATCH /api/recipes/:id

Changes only the fields you send. Send at least one field.

**Request**

```bash
curl -i -X PATCH http://localhost:3000/api/recipes/6ae63978f9243d090d484e25 \
  -H "Content-Type: application/json" \
  -d '{"prepTime":35}'
```

**Response — 200 OK**: the full updated recipe, with `"prepTime": 35` and everything else unchanged.

**Errors**

- `400` – `{ "error": "Validation failed", "details": ["send at least one of: title, description, ingredients, steps, prepTime, difficulty, tags"] }` (empty body) or any rule from the table above, or `{ "error": "Invalid id" }`
- `404` – `{ "error": "Recipe not found" }`

### DELETE /api/recipes/:id

**Request**

```bash
curl -i -X DELETE http://localhost:3000/api/recipes/6ae63978f9243d090d484e25
```

**Response — 204 No Content** (no body)

Deleting the same id again returns `404` with `{ "error": "Recipe not found" }`. A malformed id returns `400` with `{ "error": "Invalid id" }`.

### Any other URL

```json
{ "error": "Not found" }
```
with status `404`.

## Error handling

- Every error response is JSON with an `error` message. Validation errors add a `details` list.
- `400` – bad input: failed validation, malformed JSON, invalid id, invalid query value.
- `404` – the id is valid but no recipe has it, or the URL does not exist.
- `500` – unexpected server or database error. The message sent is only `"Server error"`; the real error is printed in the server terminal.
- The server never crashes on bad input. If the database cannot be reached at start-up it prints why and exits.

## Testing without a front end

`curl-examples.md` contains a curl command for every route and every error case, with example responses. Run them in order in a second terminal while the server is running. Because the data lives in MongoDB, you can also stop the server, start it again, and `GET /api/recipes` still returns your recipes.

## Project structure

```
recipes-api/
├── models/
│   └── Recipe.js        # Mongoose schema and model
├── server.js            # Express app: middleware, routes, DB connection
├── curl-examples.md     # a curl test for every route
├── .env.example         # fake values; copy to .env
├── .gitignore           # node_modules and .env
└── package.json
```

## Connecting a React front end

CORS is enabled for the origin in `CLIENT_ORIGIN` (default `http://localhost:5173`, the Vite dev server). Point your `fetch` calls at `http://localhost:3000/api/recipes`.
