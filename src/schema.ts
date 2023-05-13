import { InferModel } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
    "users",
    {
        id: text("id").primaryKey(),
        email: text("email").notNull(),
        password: text("password").notNull(),
    },
    (users) => ({
        emailIdx: uniqueIndex("emailIdx").on(users.email),
    }),
);

export type User = InferModel<typeof users>;
