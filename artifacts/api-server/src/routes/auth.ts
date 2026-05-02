import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const authRouter = Router();

authRouter.post("/auth/signup", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }
  if (username.trim().length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username.trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Username is already taken." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ username: username.trim(), passwordHash })
      .returning({ id: usersTable.id, username: usersTable.username });

    res.status(201).json({ message: "Account created successfully.", user: { id: user.id, username: user.username } });
  } catch (err) {
    req.log.error(err, "signup error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: "Logged in.", user: { id: user.id, username: user.username } });
  } catch (err) {
    req.log.error(err, "login error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

authRouter.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
});

authRouter.get("/auth/me", (req, res) => {
  if (req.session.userId) {
    res.json({ user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.status(401).json({ user: null });
  }
});

export default authRouter;
