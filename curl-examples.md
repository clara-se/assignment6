# curl examples – every route

Start the server (`npm run dev`), then run these in a second terminal, in order.
`-i` shows the status line so you can check the codes.

> Ids and dates in the example responses will be different on your machine.
> After running them against your own database, paste your real terminal
> output under each command if you want it as test evidence.

Replace `ID` below with the `_id` returned by your first POST.

---

## 1. Server is up

```bash
curl -i http://localhost:3000/
```
```
HTTP/1.1 200 OK
{"status":"ok","resource":"/api/recipes"}
```

## 2. Create (POST) → 201

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Tabbouleh","description":"Fresh parsley salad","ingredients":["parsley","tomato","bulgur","lemon"],"steps":["Chop","Mix"],"prepTime":20,"difficulty":"easy","tags":["salad","lebanese"]}'
```
```
HTTP/1.1 201 Created
{"title":"Tabbouleh","description":"Fresh parsley salad","ingredients":["parsley","tomato","bulgur","lemon"],"steps":["Chop","Mix"],"prepTime":20,"difficulty":"easy","tags":["salad","lebanese"],"_id":"6ae63978f9243d090d484e25","updatedAt":"2026-10-31T18:54:48.812Z","createdAt":"2026-10-31T18:54:48.812Z"}
```

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Kibbeh","ingredients":["bulgur","lamb"],"difficulty":"hard","tags":["lebanese"]}'
```
```
HTTP/1.1 201 Created
{"title":"Kibbeh","description":"","ingredients":["bulgur","lamb"],"steps":[],"prepTime":0,"difficulty":"hard","tags":["lebanese"],"_id":"6ae63978f9243d090d484e26", ...}
```

## 3. List all (GET) → 200

```bash
curl -i http://localhost:3000/api/recipes
```
```
HTTP/1.1 200 OK
[ {Kibbeh ...}, {Tabbouleh ...} ]        (newest first)
```

### With query strings

```bash
curl -i "http://localhost:3000/api/recipes?search=tab&limit=5"     # 200, only Tabbouleh
curl -i "http://localhost:3000/api/recipes?difficulty=hard"        # 200, only Kibbeh
curl -i "http://localhost:3000/api/recipes?tag=lebanese"           # 200, both
```

```bash
curl -i "http://localhost:3000/api/recipes?difficulty=extreme"
```
```
HTTP/1.1 400 Bad Request
{"error":"difficulty must be one of: easy, medium, hard"}
```

```bash
curl -i "http://localhost:3000/api/recipes?limit=abc"
```
```
HTTP/1.1 400 Bad Request
{"error":"limit must be a whole number, 1 or more"}
```

## 4. Get one (GET) → 200 / 400 / 404

```bash
curl -i http://localhost:3000/api/recipes/ID
```
```
HTTP/1.1 200 OK
{"title":"Tabbouleh", ... }
```

```bash
curl -i http://localhost:3000/api/recipes/123
```
```
HTTP/1.1 400 Bad Request
{"error":"Invalid id"}
```

```bash
curl -i http://localhost:3000/api/recipes/6ae63978f9243d090d484eff
```
```
HTTP/1.1 404 Not Found
{"error":"Recipe not found"}
```

## 5. Update one field (PATCH) → 200 / 400 / 404

```bash
curl -i -X PATCH http://localhost:3000/api/recipes/ID \
  -H "Content-Type: application/json" \
  -d '{"prepTime":35}'
```
```
HTTP/1.1 200 OK
{"title":"Tabbouleh", ... "prepTime":35, ... }       (everything else unchanged)
```

```bash
curl -i -X PATCH http://localhost:3000/api/recipes/ID \
  -H "Content-Type: application/json" \
  -d '{}'
```
```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":["send at least one of: title, description, ingredients, steps, prepTime, difficulty, tags"]}
```

```bash
curl -i -X PATCH http://localhost:3000/api/recipes/6ae63978f9243d090d484eff \
  -H "Content-Type: application/json" \
  -d '{"title":"x"}'
```
```
HTTP/1.1 404 Not Found
{"error":"Recipe not found"}
```

## 6. Replace (PUT) → 200 / 400 / 404

```bash
curl -i -X PUT http://localhost:3000/api/recipes/ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Tabbouleh v2","ingredients":["parsley","mint"]}'
```
```
HTTP/1.1 200 OK
{"title":"Tabbouleh v2","description":"","ingredients":["parsley","mint"],"steps":[],"prepTime":0,"difficulty":"easy","tags":[], ... }
```
(description, steps, prepTime, difficulty and tags went back to their defaults)

```bash
curl -i -X PUT http://localhost:3000/api/recipes/ID \
  -H "Content-Type: application/json" \
  -d '{"title":"No ingredients"}'
```
```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":["ingredients is required"]}
```

```bash
curl -i -X PUT http://localhost:3000/api/recipes/6ae63978f9243d090d484eff \
  -H "Content-Type: application/json" \
  -d '{"title":"x","ingredients":["y"]}'
```
```
HTTP/1.1 404 Not Found
{"error":"Recipe not found"}
```

## 7. Validation and malformed input on create → 400

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"   ","ingredients":[],"prepTime":-3,"difficulty":"wow"}'
```
```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":["title must be a non-empty string","ingredients must be a non-empty array of non-empty strings","prepTime must be a number of minutes, 0 or more","difficulty must be one of: easy, medium, hard"]}
```

Broken JSON (the server must not crash):

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '{"title":"Oops",'
```
```
HTTP/1.1 400 Bad Request
{"error":"Request body is not valid JSON"}
```

No JSON at all:

```bash
curl -i -X POST http://localhost:3000/api/recipes -d 'title=Oops'
```
```
HTTP/1.1 400 Bad Request
{"error":"Validation failed","details":["title is required","ingredients is required"]}
```

A JSON array instead of an object:

```bash
curl -i -X POST http://localhost:3000/api/recipes \
  -H "Content-Type: application/json" \
  -d '[1,2]'
```
```
HTTP/1.1 400 Bad Request
{"error":"Request body must be a JSON object"}
```

## 8. Delete (DELETE) → 204 / 404

```bash
curl -i -X DELETE http://localhost:3000/api/recipes/ID
```
```
HTTP/1.1 204 No Content
```

Run it a second time:

```bash
curl -i -X DELETE http://localhost:3000/api/recipes/ID
```
```
HTTP/1.1 404 Not Found
{"error":"Recipe not found"}
```

```bash
curl -i http://localhost:3000/api/recipes/ID
```
```
HTTP/1.1 404 Not Found
{"error":"Recipe not found"}
```

## 9. Unknown URL → 404

```bash
curl -i http://localhost:3000/nope
```
```
HTTP/1.1 404 Not Found
{"error":"Not found"}
```

## 10. Persistence check

1. Create a recipe (step 2).
2. Stop the server with Ctrl+C and start it again with `npm run dev`.
3. `curl -i http://localhost:3000/api/recipes` – the recipe is still there, because it is stored in MongoDB and not in memory.


## My test run (real output).

```

C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X POST http://localhost:3000/api/recipes -H "Content-Type: application/json" -d "{\"title\":\"Tabbouleh\",\"ingredients\":[\"parsley\",\"tomato\",\"bulgur\",\"lemon\"],\"tags\":[\"salad\"]}"
HTTP/1.1 201 Created
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 270
ETag: W/"10e-oUSuRaqaz6wWPP7CrpN1sXbAu/c"
Date: Sat, 31 Oct 2026 19:46:40 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"title":"Tabbouleh","description":"","ingredients":["parsley","tomato","bulgur","lemon"],"steps":[],"prepTime":0,"difficulty":"easy","tags":["salad"],"_id":"6ae6459fe087eea18854dcd1","createdAt":"2026-10-31T19:46:39.806Z","updatedAt":"2026-10-31T19:46:39.806Z","__v":0}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i http://localhost:3000/api/recipes/6ae6459fe087eea18854dcd1
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 270
ETag: W/"10e-ghFu4kkZoHv7eAlv+RSh/AB0iOk"
Date: Sat, 31 Oct 2026 19:47:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"_id":"6ae6459fe087eea18854dcd1","title":"Tabbouleh","description":"","ingredients":["parsley","tomato","bulgur","lemon"],"steps":[],"prepTime":0,"difficulty":"easy","tags":["salad"],"createdAt":"2026-10-31T19:46:39.806Z","updatedAt":"2026-10-31T19:46:39.806Z","__v":0}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X PATCH http://localhost:3000/api/recipes/6ae6459fe087eea18854dcd1 -H "Content-Type: application/json" -d "{\"prepTime\":35}"
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 271
ETag: W/"10f-LZ02Bu37xzOzMSGXSOV3OfA9s0U"
Date: Sat, 31 Oct 2026 19:47:09 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"_id":"6ae6459fe087eea18854dcd1","title":"Tabbouleh","description":"","ingredients":["parsley","tomato","bulgur","lemon"],"steps":[],"prepTime":35,"difficulty":"easy","tags":["salad"],"createdAt":"2026-10-31T19:46:39.806Z","updatedAt":"2026-10-31T19:47:08.836Z","__v":0}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X PUT http://localhost:3000/api/recipes/6ae6459fe087eea18854dcd1 -H "Content-Type: application/json" -d "{\"title\":\"Tabbouleh v2\",\"ingredients\":[\"parsley\",\"mint\"]}"
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 247
ETag: W/"f7-KIRiJojY+s4TAn7JDQ11tkFCXMc"
Date: Sat, 31 Oct 2026 19:47:14 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"_id":"6ae6459fe087eea18854dcd1","title":"Tabbouleh v2","description":"","ingredients":["parsley","mint"],"steps":[],"prepTime":0,"difficulty":"easy","tags":[],"createdAt":"2026-10-31T19:46:39.806Z","updatedAt":"2026-10-31T19:47:14.484Z","__v":0}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X POST http://localhost:3000/api/recipes -H "Content-Type: application/json" -d "{\"title\":\"\",\"ingredients\":[]}"
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 137
ETag: W/"89-OVfI/h/bxW+VOU3d8DcHp4NaLyk"
Date: Sat, 31 Oct 2026 19:47:38 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Validation failed","details":["title must be a non-empty string","ingredients must be a non-empty array of non-empty strings"]}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i http://localhost:3000/api/recipes/123
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 22
ETag: W/"16-HvxzzVYLEXteKjq0hMYNikFu544"
Date: Sat, 31 Oct 2026 19:47:43 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Invalid id"}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i http://localhost:3000/api/recipes/6ae63978f9243d090d484eff
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 28
ETag: W/"1c-Jy/vBwhID/lOA6H2//7DtRKe+7k"
Date: Sat, 31 Oct 2026 19:47:49 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Recipe not found"}
C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X DELETE http://localhost:3000/api/recipes/6ae6459fe087eea18854dcd1
HTTP/1.1 204 No Content
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
ETag: W/"a-bAsFyilMr4Ra1hIU5PyoyFRunpI"
Date: Sat, 31 Oct 2026 19:47:56 GMT
Connection: keep-alive
Keep-Alive: timeout=5


C:\Users\domte\OneDrive\Documents\ANNEE UNIVERSITAIRE\4EM ANNEE\semestre 1\assignment 6>curl -i -X DELETE http://localhost:3000/api/recipes/6ae6459fe087eea18854dcd1
HTTP/1.1 404 Not Found
X-Powered-By: Express
Access-Control-Allow-Origin: http://localhost:5173
Vary: Origin
Content-Type: application/json; charset=utf-8
Content-Length: 28
ETag: W/"1c-Jy/vBwhID/lOA6H2//7DtRKe+7k"
Date: Sat, 31 Oct 2026 19:48:01 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Recipe not found"}

```