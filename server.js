import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import {
  db, // 🧠 ← this was missing!
  createUser,
  validateUser,
  createPost,
  getAllPosts,
  addComment,
  toggleLike,
  toggleFollow,
  getUserByUsername
} from "./db.js";

const app = express();
app.use(express.static("public"));

const PORT = 3000;

app.use(bodyParser.json());
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

// 🟢 Route: Home (test)
app.get("/", (req, res) => {
  res.send("Welcome to the Mini Social Media App 🚀");
});

// 🟢 Route: Register
app.post("/api/register", async (req, res) => {
  const { username, password, bio } = req.body;
  try {
    const user = await createUser(username, password, bio);
    req.session.user = user;
    res.json({ message: "User registered successfully!", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🟢 Route: Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await validateUser(username, password);
  if (user) {
    req.session.user = user;
    res.json({ message: "Login successful!", user });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// 🟢 Route: Create Post (only if logged in)
app.post("/api/posts", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Login required" });
  const { content } = req.body;
  const post = await createPost(req.session.user.id, content);
  res.json({ message: "Post created!", post });
});

// 🟢 Route: Get All Posts
app.get("/api/posts", (req, res) => {
  res.json(getAllPosts());
});

// 🟢 Add Comment
app.post("/api/posts/:id/comment", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Login required" });
  const postId = parseInt(req.params.id);
  const { content } = req.body;
  const comment = addComment(req.session.user.id, postId, content);
  res.json({ message: "Comment added!", comment });
});

// 🟢 Like / Unlike Post
app.post("/api/posts/:id/like", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Login required" });
  const postId = parseInt(req.params.id);
  const result = toggleLike(req.session.user.id, postId);
  res.json(result);
});

// 🟢 Follow / Unfollow User
app.post("/api/follow/:username", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Login required" });
  const target = getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: "User not found" });

  const result = await toggleFollow(req.session.user.id, target.id);
  res.json(result);
});

// 🟢 Profile Route (Fixed & Working)
app.get("/api/profile/:username", async (req, res) => {
  const username = req.params.username;
  await db.read(); // ✅ ensures latest data is loaded
  const user = getUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const followers = db.data.follows.filter((f) => f.followingId === user.id);
  const following = db.data.follows.filter((f) => f.followerId === user.id);
  const posts = db.data.posts.filter((p) => p.userId === user.id);

  console.log("🧠 PROFILE DEBUG →", {
    username: user.username,
    followers: followers.length,
    following: following.length,
    posts: posts.length,
  });

  res.json({
    username: user.username,
    bio: user.bio,
    followers: followers.length,
    following: following.length,
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      createdAt: p.createdAt,
      likes: db.data.likes.filter((l) => l.postId === p.id).length,
      comments: db.data.comments.filter((c) => c.postId === p.id),
    })),
  });
});

// 🟢 Logout Route (Fixed)
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});


app.get("/api/isFollowing/:username", async (req, res) => {
  if (!req.session.user) return res.json({ following: false });
  const target = getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ following: false });
  await db.read();
  const found = db.data.follows.some(f => f.followerId === req.session.user.id && f.followingId === target.id);
  res.json({ following: !!found });
});

// 🟢 Check if the logged-in user is following someone
app.get("/api/isFollowing/:username", (req, res) => {
  if (!req.session.user) return res.json({ following: false });

  const target = getUserByUsername(req.params.username);
  if (!target) return res.json({ following: false });

  const following = db.data.follows.some(
    f => f.followerId === req.session.user.id && f.followingId === target.id
  );
  res.json({ following });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
