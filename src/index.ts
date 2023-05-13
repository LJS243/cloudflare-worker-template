import { Context, Hono } from "hono";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { users } from "./schema";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcryptjs";
import * as jose from "jose";

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

let db: DrizzleD1Database;

const app = new Hono<{ Bindings: Bindings }>().use(async (c, next) => {
    db = drizzle(c.env.DB);
    await next();
});

app.use("/auth/*", async (c: Context, next) => {
    try {
        const [type, token] = c.req.header("Authorization")!.split(" ");
        if (type !== "Bearer") {
            return c.text("Unauthorized", 401);
        }
        const { payload } = await jose.jwtVerify(
            token,
            new TextEncoder().encode(c.env.JWT_SECRET),
        );
        const user = await db
            .select({
                id: users.id,
                email: users.email,
            })
            .from(users)
            .where(eq(users.id, payload.sub!))
            .get();
        if (!user) {
            return c.text("Unauthorized", 401);
        }
        c.set("user", user);
        await next();
    } catch (error) {
        return c.text("Unauthorized", 401);
    }
});

app.get("/", (c) => c.text("Hello Hono!"));

app.post("/register", async (c) => {
    const { email, password } = await c.req.json();
    const userExists = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get();
    if (userExists) {
        return c.text("Email Address Taken", 409);
    }
    const user = await db
        .insert(users)
        .values({
            id: uuidv4(),
            email,
            password: bcrypt.hashSync(password),
        })
        .returning()
        .get();
    return c.json({ id: user.id });
});

app.post("/login", async (c) => {
    try {
        const { email, password } = await c.req.json();
        const user = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .get();
        if (!bcrypt.compareSync(password, user.password)) {
            return c.text("Unauthorized", 401);
        }
        const token = await new jose.SignJWT({
            sub: user.id,
            email: user.email,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(new TextEncoder().encode(c.env.JWT_SECRET));
        return c.json({
            token,
            id: user.id,
            email: user.email,
        });
    } catch (error) {
        return c.text("Unauthorized", 401);
    }
});

app.get("/auth/profile", async (c: Context) => {
    return c.json(c.get("user"));
});

export default app;
