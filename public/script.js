// ---------- Utilities ----------
function timeAgo(isoDate) {
  if (!isoDate) return "";
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec} sec${sec===1?"":"s"} ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min===1?"":"s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr${hr===1?"":"s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day===1?"":"s"} ago`;
  // fallback to date
  const d = new Date(isoDate);
  return d.toLocaleString();
}
function avatarHTML(username) {
  const initials = username ? username.split(' ').map(s=>s[0]).join('').slice(0,2) : '?';
  return `<div class="avatar">${initials}</div>`;
}


async function isFollowing(username) {
  const res = await fetch(`/api/isFollowing/${username}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.following;
}



// ---------- AUTH ----------
async function signup() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const bio = document.getElementById("bio").value.trim();

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, bio }),
  });

  const data = await res.json();
  alert(data.message || data.error);
  if (res.ok) showApp();
}

async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  alert(data.message || data.error);
  if (res.ok) showApp();
}

async function logout() {
  const res = await fetch("/api/logout", { method: "POST" });
  const data = await res.json();
  alert(data.message || data.error);

  // Hide everything and show login again
  document.getElementById("app").style.display = "none";
  document.getElementById("auth").style.display = "block";
}

// ---------- POSTS ----------
async function createPost() {
  const content = document.getElementById("content").value.trim();
  if (!content) return alert("Please write something!");

  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  const data = await res.json();
  alert(data.message || data.error);
  if (res.ok) {
    document.getElementById("content").value = "";
    loadPosts();
  }
}

async function likePost(id) {
  const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
  const data = await res.json();
  alert(data.liked ? "❤️ Liked!" : "💔 Unliked!");
  loadPosts();
}

async function commentPost(id) {
  const comment = prompt("Enter your comment:");
  if (!comment) return;
  const res = await fetch(`/api/posts/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: comment }),
  });
  const data = await res.json();
  alert(data.message || data.error);
  loadPosts();
}

async function loadPosts() {
  console.log("🔄 Refreshing feed...");
  const res = await fetch("/api/posts");
  const posts = await res.json();
  const div = document.getElementById("posts");
  div.innerHTML = "";

  for (const p of posts) {
    const el = document.createElement("div");
    el.className = "post";
    const commentsHTML = p.comments.map(c => `<p>💬 ${c.content}</p>`).join("");

    // Build post structure
    el.innerHTML = `
      <div class="post-head">
        ${avatarHTML(p.user)} 
        <div class="meta">
          <strong>${p.user}</strong> 
          <small class="post-time">· ${timeAgo(p.createdAt)}</small>
        </div>
      </div>
      <p class="post-content">${p.content}</p>
      <p class="post-meta">❤️ ${p.likes} | 💬 ${p.comments.length}</p>
      <div class="post-actions">
        <button onclick="likePost(${p.id})">❤️ Like</button>
        <button onclick="commentPost(${p.id})">💬 Comment</button>
        <button class="follow-btn" data-username="${p.user}">➕ Follow</button>
      </div>
      <div class="comments">
        ${commentsHTML}
        <div class="add-comment">
          <input class="comment-input" placeholder="Write a comment..." />
          <button class="comment-send">Send</button>
        </div>
      </div>
    `;

    // Append post
    div.appendChild(el);

    // Setup comment functionality
    const commentInput = el.querySelector(".comment-input");
    const commentSend = el.querySelector(".comment-send");
    commentSend.onclick = async () => {
      const text = commentInput.value.trim();
      if (!text) return;
      await fetch(`/api/posts/${p.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      commentInput.value = "";
      loadPosts();
    };

    // ✅ Setup follow button (only one)
    const followBtn = el.querySelector(".follow-btn");
    isFollowing(p.user).then(following => {
        followBtn.innerText = following ? "❌ Unfollow" : "➕ Follow";
});

    followBtn.onclick = async () => {
        await toggleFollow(p.user);
        const following = await isFollowing(p.user);
        followBtn.innerText = following ? "❌ Unfollow" : "➕ Follow";
    };

  }
}


// ---------- PROFILE ----------
async function showProfile() {
  document.getElementById("feedSection").style.display = "none";
  document.getElementById("profileSection").style.display = "block";

  // 🧠 Get currently logged-in user from session
  const userRes = await fetch("/api/posts");
  const postsData = await userRes.json();
  if (!postsData.length) {
    alert("Please make a post first!");
    return;
  }

  // Take the first post’s username (since it’s yours)
  const loggedInUsername = postsData.find(p => p.user)?.user;
  if (!loggedInUsername) {
    alert("Couldn't find your username.");
    return;
  }

  // Fetch profile data
  const res = await fetch(`/api/profile/${loggedInUsername}`);
  const profile = await res.json();
  console.log("🧩 Profile data received:", profile);

  // Fill in user data
  document.getElementById("profileUsername").innerText = profile.username;
  document.getElementById("profileBio").innerText = profile.bio || "No bio";
  document.getElementById("followersCount").innerText = profile.followers;
  document.getElementById("followingCount").innerText = profile.following;

  // Show user posts
  const userPosts = document.getElementById("userPosts");
  userPosts.innerHTML = "";

  if (profile.posts.length === 0) {
    userPosts.innerHTML = "<p>No posts yet.</p>";
  } else {
    profile.posts.forEach((p) => {
      const div = document.createElement("div");
      div.className = "post";
      const commentsHTML = p.comments.map((c) => `<p>💬 ${c.content}</p>`).join("");
      div.innerHTML = `
  <div class="post-head">
    <strong>${profile.username}</strong> <small class="post-time">· ${timeAgo(p.createdAt)}</small>
  </div>
  <p class="post-content">${p.content}</p>
  <small>❤️ ${p.likes} | 💬 ${p.comments.length}</small>
  <div class="comments">${commentsHTML}</div>
`;

      userPosts.appendChild(div);
    });
  }
}

function showFeed() {
  document.getElementById("feedSection").style.display = "block";
  document.getElementById("profileSection").style.display = "none";
  loadPosts();
}

function showApp() {
  document.getElementById("auth").style.display = "none";
  document.getElementById("app").style.display = "block";
  showFeed();
}

// ---------- FOLLOW / UNFOLLOW ----------
async function toggleFollow(username) {
  const res = await fetch(`/api/follow/${username}`, { method: "POST" });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  if (data.following) {
    alert(`✅ You are now following ${username}`);
  } else {
    alert(`❌ You unfollowed ${username}`);
  }

  // refresh posts after follow/unfollow
  loadPosts();
}
