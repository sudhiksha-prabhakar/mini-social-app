import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import bcrypt from "bcryptjs";
import { join } from "path";

const file = join(process.cwd(), "data.json");
const adapter = new JSONFile(file);
const db = new Low(adapter, {
  users: [],
  posts: [],
  comments: [],
  follows: [],
  likes: []
});

await db.read();

// ---------- USER ----------
export async function createUser(username, password, bio = "") {
  const existing = db.data.users.find(u => u.username === username);
  if (existing) throw new Error("Username already exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), username, passwordHash, bio };
  db.data.users.push(user);
  await db.write();
  return user;
}

export function getUserByUsername(username) {
  return db.data.users.find(u => u.username === username);
}

export async function validateUser(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

// ---------- POSTS ----------
export async function createPost(userId, content) {
  const post = { id: Date.now(), userId, content, createdAt: new Date() };
  db.data.posts.push(post);
  await db.write();
  return post;
}

export function getAllPosts() {
  return db.data.posts.map(p => ({
    ...p,
    user: db.data.users.find(u => u.id === p.userId)?.username || "Unknown",
    likes: db.data.likes.filter(l => l.postId === p.id).length,
    comments: db.data.comments.filter(c => c.postId === p.id)
  }));
}

// ---------- COMMENTS ----------
export async function addComment(userId, postId, content) {
  const comment = { id: Date.now(), postId, userId, content, createdAt: new Date() };
  db.data.comments.push(comment);
  await db.write();
  return comment;
}

// ---------- LIKES ----------
export async function toggleLike(userId, postId) {
  const existing = db.data.likes.find(l => l.userId === userId && l.postId === postId);
  if (existing) {
    db.data.likes = db.data.likes.filter(l => !(l.userId === userId && l.postId === postId));
    await db.write();
    return { liked: false };
  } else {
    db.data.likes.push({ userId, postId });
    await db.write();
    return { liked: true };
  }
}

// ---------- FOLLOW ----------
export async function toggleFollow(followerId, followingId) {
  // prevent following self
  if (followerId === followingId) {
    return { following: false, error: "You cannot follow yourself" };
  }

  // Ensure we have valid structure in case DB file was empty
  if (!db.data.follows) db.data.follows = [];

  // Check if follow already exists
  const existing = db.data.follows.find(
    (f) => f.followerId === followerId && f.followingId === followingId
  );

  if (existing) {
    // Unfollow
    db.data.follows = db.data.follows.filter(
      (f) => !(f.followerId === followerId && f.followingId === followingId)
    );
    await db.write();
    console.log(`❌ ${followerId} unfollowed ${followingId}`);
    return { following: false };
  } else {
    // Follow
    db.data.follows.push({ followerId, followingId });
    await db.write();
    console.log(`✅ ${followerId} followed ${followingId}`);
    return { following: true };
  }
}
export { db };
