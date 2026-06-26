import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDatabase } from "../config/db.js";
import { JWT_SECRET } from "../config/env.js";
import { authSchema } from "../validators/schemas.js";

export async function register(req, res, next) {
  try {
    const { email, password } = authSchema.parse(req.body);
    const db = getDatabase();

    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.collection("users").insertOne({
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date(),
    });

    const token = jwt.sign({ id: result.insertedId.toString(), email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = authSchema.parse(req.body);
    const db = getDatabase();

    const user = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id.toString(), email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email });
  } catch (error) {
    next(error);
  }
}
