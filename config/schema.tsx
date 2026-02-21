import { pgTable, timestamp, text } from "drizzle-orm/pg-core";
import { integer, pgSchema, varchar, json } from "drizzle-orm/pg-core";

const appSchema = pgSchema("app");

export const usersTable = appSchema.table("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  credits: integer().default(2)
});

const coursesSchema = pgSchema("courses");

export const coursesTable = coursesSchema.table("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(),
  courseId: varchar({ length: 255 }).notNull().unique(),
  courseName: varchar({ length: 255 }).notNull(),
  userInput: varchar({ length: 1024 }).notNull(),
  type: varchar({ length: 255 }).notNull(),
  courseLayout: json(),
  createdAT: timestamp().defaultNow()
});

export const chapterContentSlides = pgTable("chapter_content_slides", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: varchar({ length: 255 }).notNull(),
  chapterId: varchar({ length: 255 }).notNull(),
  slideId: varchar({ length: 255 }).notNull(),
  slideIndex: integer().notNull(),
  audioFileName: varchar({ length: 255 }).notNull(),
  narration: json().notNull(),
  html: text().notNull(),
  revelData: json().notNull(),
});


