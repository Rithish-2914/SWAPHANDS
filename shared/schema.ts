import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["student", "admin"]);
export const authProviderEnum = pgEnum("auth_provider", ["local", "google"]);
export const itemCategoryEnum = pgEnum("item_category", ["books", "gadgets", "uniforms", "accessories", "sports", "electronics", "stationery", "other"]);
export const itemConditionEnum = pgEnum("item_condition", ["new", "excellent", "good", "fair"]);
export const itemStatusEnum = pgEnum("item_status", ["active", "sold", "draft"]);
export const hostelBlockEnum = pgEnum("hostel_block", ["a-block", "b-block", "c-block", "d-block", "e-block"]);
export const claimStatusEnum = pgEnum("claim_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // Make nullable for Google OAuth users
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  registrationNumber: text("registration_number"),
  branch: text("branch"),
  year: text("year"),
  hostelBlock: hostelBlockEnum("hostel_block"),
  phoneNumber: text("phone_number"),
  bio: text("bio"),
  profilePicture: text("profile_picture"), // For Google OAuth profile pictures
  authProvider: authProviderEnum("auth_provider").default("local").notNull(),
  googleId: text("google_id"), // Google OAuth ID
  role: userRoleEnum("role").default("student").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  resetToken: text("reset_token"), // For password reset
  resetTokenExpiry: timestamp("reset_token_expiry"), // Reset token expiration
  otpCode: text("otp_code"), // For OTP verification
  otpExpiry: timestamp("otp_expiry"), // OTP expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // make these columns nullable by NOT calling .notNull()
  title: text("title"),
  description: text("description"),
  category: itemCategoryEnum("category"),
  condition: itemConditionEnum("condition"),
  price: integer("price"),
  isExchangeable: boolean("is_exchangeable").default(false).notNull(),
  status: itemStatusEnum("status").default("active").notNull(),
  location: hostelBlockEnum("location"),
  photos: text("photos").array().default([]),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  views: integer("views").default(0).notNull(),
  // draft flag (snake/camel mapping depends on your code; server/storage uses isDraft)
  isDraft: boolean("is_draft").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wishlist = pgTable("wishlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").references(() => items.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lostFoundItems = pgTable("lost_found_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: itemCategoryEnum("category").notNull(),
  foundLocation: text("found_location").notNull(), // Where the item was found
  photos: text("photos").array().default([]),
  postedBy: varchar("posted_by").notNull().references(() => users.id, { onDelete: "cascade" }), // Admin who posted
  isClaimed: boolean("is_claimed").default(false).notNull(),
  claimedBy: varchar("claimed_by").references(() => users.id, { onDelete: "set null" }), // Student who claimed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lostFoundClaims = pgTable("lost_found_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lostFoundItemId: varchar("lost_found_item_id").notNull().references(() => lostFoundItems.id, { onDelete: "cascade" }),
  claimantId: varchar("claimant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(), // Why they think it's theirs
  // Enhanced verification fields
  brand: text("brand"), // Brand name of the item
  model: text("model"), // Model number/name
  serialNumber: text("serial_number"), // Serial number if available
  color: text("color"), // Color description
  purchaseDate: timestamp("purchase_date"), // When they bought it
  purchaseLocation: text("purchase_location"), // Where they bought it
  estimatedValue: integer("estimated_value"), // Estimated value in rupees
  additionalIdentifiers: text("additional_identifiers"), // Any other identifying features
  contactPreference: text("contact_preference"), // How they prefer to be contacted
  proofFiles: text("proof_files").array().default([]), // Photos of receipts, bills, etc.
  identificationPhotos: text("identification_photos").array().default([]), // Photos of item details
  status: claimStatusEnum("status").default("pending").notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }), // Admin who reviewed
  reviewNotes: text("review_notes"), // Admin notes about the claim
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  wishlistItems: many(wishlist),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  postedLostFoundItems: many(lostFoundItems, { relationName: "postedBy" }),
  claimedLostFoundItems: many(lostFoundItems, { relationName: "claimedBy" }),
  lostFoundClaims: many(lostFoundClaims, { relationName: "claimant" }),
  reviewedClaims: many(lostFoundClaims, { relationName: "reviewer" }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  seller: one(users, {
    fields: [items.sellerId],
    references: [users.id],
  }),
  wishlistedBy: many(wishlist),
  messages: many(messages),
}));

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [wishlist.itemId],
    references: [items.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  item: one(items, {
    fields: [messages.itemId],
    references: [items.id],
  }),
}));

export const lostFoundItemsRelations = relations(lostFoundItems, ({ one, many }) => ({
  poster: one(users, {
    fields: [lostFoundItems.postedBy],
    references: [users.id],
    relationName: "postedBy",
  }),
  claimedByUser: one(users, {
    fields: [lostFoundItems.claimedBy],
    references: [users.id],
    relationName: "claimedBy",
  }),
  claims: many(lostFoundClaims),
}));

export const lostFoundClaimsRelations = relations(lostFoundClaims, ({ one }) => ({
  lostFoundItem: one(lostFoundItems, {
    fields: [lostFoundClaims.lostFoundItemId],
    references: [lostFoundItems.id],
  }),
  claimant: one(users, {
    fields: [lostFoundClaims.claimantId],
    references: [users.id],
    relationName: "claimant",
  }),
  reviewer: one(users, {
    fields: [lostFoundClaims.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  resetToken: true,
  resetTokenExpiry: true,
  otpCode: true,
  otpExpiry: true,
}).extend({
  email: z.string().email().refine((email) => email.endsWith("@vitstudent.ac.in") || email.includes("@gmail.com"), {
    message: "Please use a valid VIT student email or Gmail account",
  }),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Keep insertItemSchema as-is — use .partial() in routes for drafts
export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  sellerId: true,
  views: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["books", "gadgets", "uniforms", "accessories", "sports", "electronics", "stationery", "other"]),
  condition: z.enum(["new", "excellent", "good", "fair"]),
  price: z.number().min(0, "Price must be 0 or greater"),
  location: z.enum(["a-block", "b-block", "c-block", "d-block", "e-block"]),
});

export const insertWishlistSchema = createInsertSchema(wishlist).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertLostFoundItemSchema = createInsertSchema(lostFoundItems).omit({
  id: true,
  postedBy: true,
  isClaimed: true,
  claimedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["books", "gadgets", "uniforms", "other"]),
  foundLocation: z.string().min(1, "Found location is required"),
});

export const insertLostFoundClaimSchema = createInsertSchema(lostFoundClaims).omit({
  id: true,
  lostFoundItemId: true,
  claimantId: true,
  status: true,
  reviewedBy: true,
  reviewNotes: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  description: z.string().min(1, "Please explain why this item is yours"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  color: z.string().min(1, "Please describe the color").optional(),
  purchaseLocation: z.string().optional(),
  estimatedValue: z.number().min(0, "Value must be 0 or greater").optional(),
  additionalIdentifiers: z.string().optional(),
  contactPreference: z.enum(["email", "phone", "both"]).default("email"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Wishlist = typeof wishlist.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertLostFoundItem = z.infer<typeof insertLostFoundItemSchema>;
export type LostFoundItem = typeof lostFoundItems.$inferSelect;
export type InsertLostFoundClaim = z.infer<typeof insertLostFoundClaimSchema>;
export type LostFoundClaim = typeof lostFoundClaims.$inferSelect;
