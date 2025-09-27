import {
  users,
  items,
  wishlist,
  messages,
  lostFoundItems,
  lostFoundClaims,
  type User,
  type InsertUser,
  type Item,
  type InsertItem,
  type Wishlist,
  type InsertWishlist,
  type Message,
  type InsertMessage,
  type LostFoundItem,
  type InsertLostFoundItem,
  type LostFoundClaim,
  type InsertLostFoundClaim,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);
const createMemoryStore = MemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserGoogleAuth(id: string, updates: { googleId: string; authProvider: string; profilePicture?: string }): Promise<User | undefined>;
  updateUserOTP(id: string, otpCode: string, otpExpiry: Date): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  verifyUser(id: string): Promise<User | undefined>;
  clearUserOTP(id: string): Promise<User | undefined>;

  // Item methods
  getItem(id: string): Promise<Item | undefined>;
  getItems(filters?: {
    category?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sellerId?: string;
    status?: string;
    includeDrafts?: boolean;
  }): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  createDraft(
    data: Partial<InsertItem & { sellerId: string; isDraft?: boolean }>
  ): Promise<Item>;
  updateItem(id: string, updates: Partial<Item>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  incrementItemViews(id: string): Promise<void>;

  // Wishlist methods
  getWishlistByUser(userId: string): Promise<(Wishlist & { item: Item })[]>;
  addToWishlist(wishlistItem: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: string, itemId: string): Promise<boolean>;
  isInWishlist(userId: string, itemId: string): Promise<boolean>;

  // Message methods
  getMessages(
    userId: string,
    itemId?: string
  ): Promise<(Message & { sender: User; receiver: User; item?: Item })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<void>;

  // Lost and Found methods
  getLostFoundItems(filters?: {
    category?: string;
    search?: string;
    isClaimed?: boolean;
  }): Promise<LostFoundItem[]>;
  getLostFoundItem(id: string): Promise<LostFoundItem | undefined>;
  createLostFoundItem(item: InsertLostFoundItem & { postedBy: string; photos?: string[] }): Promise<LostFoundItem>;
  updateLostFoundItem(id: string, updates: Partial<LostFoundItem>): Promise<LostFoundItem | undefined>;
  deleteLostFoundItem(id: string): Promise<boolean>;
  
  // Lost and Found Claims methods
  getLostFoundClaims(filters?: {
    lostFoundItemId?: string;
    claimantId?: string;
    status?: string;
  }): Promise<(LostFoundClaim & { lostFoundItem: LostFoundItem; claimant: User })[]>;
  createLostFoundClaim(claim: InsertLostFoundClaim & { 
    lostFoundItemId: string; 
    claimantId: string; 
    proofFiles?: string[] 
  }): Promise<LostFoundClaim>;
  updateLostFoundClaim(id: string, updates: Partial<LostFoundClaim>): Promise<LostFoundClaim | undefined>;
  approveLostFoundClaim(claimId: string, reviewedBy: string, notes?: string): Promise<boolean>;
  rejectLostFoundClaim(claimId: string, reviewedBy: string, notes?: string): Promise<boolean>;

  // Admin methods
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeItems: number;
    totalMessages: number;
    totalLostFoundItems: number;
    totalClaims: number;
  }>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    try {
      // Try to use PostgreSQL session store if database is available
      // Cast pool to any to handle both NeonPool and PgPool types
      this.sessionStore = new PostgresSessionStore({
        pool: pool as any,
        createTableIfMissing: true,
      });
      console.log('🗄️  Using PostgreSQL session store');
    } catch (error) {
      // Fallback to memory store for local development
      console.warn('⚠️  Database not available, using memory session store for local development');
      this.sessionStore = new createMemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }

  // ---------- User Methods ----------
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserGoogleAuth(
    id: string, 
    updates: { googleId: string; authProvider: "google"; profilePicture?: string }
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserOTP(
    id: string, 
    otpCode: string, 
    otpExpiry: Date
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ otpCode, otpExpiry })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserPassword(
    id: string, 
    hashedPassword: string
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        otpCode: null, 
        otpExpiry: null 
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async verifyUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        isVerified: true,
        otpCode: null,
        otpExpiry: null 
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async clearUserOTP(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        otpCode: null,
        otpExpiry: null 
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // ---------- Item Methods ----------
  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async getItems(filters?: {
    category?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sellerId?: string;
    status?: string;
    includeDrafts?: boolean;
  }): Promise<Item[]> {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(items.category, filters.category as any));
    }

    if (filters?.location) {
      conditions.push(eq(items.location, filters.location as any));
    }

    if (filters?.minPrice !== undefined) {
      conditions.push(gte(items.price, filters.minPrice));
    }

    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(items.price, filters.maxPrice));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(items.title, `%${filters.search}%`),
          ilike(items.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.sellerId) {
      conditions.push(eq(items.sellerId, filters.sellerId));
    }

    if (filters?.status) {
      conditions.push(eq(items.status, filters.status as any));
    } else {
      conditions.push(eq(items.status, "active"));
    }

    // Hide drafts unless explicitly included
    if (!filters?.includeDrafts) {
      conditions.push(eq(items.isDraft, false));
    }

    if (conditions.length > 0) {
      return await db.select().from(items).where(and(...conditions)).orderBy(desc(items.createdAt));
    }

    return await db.select().from(items).orderBy(desc(items.createdAt));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values([item] as any).returning();
    return newItem;
  }

  async createDraft(
    data: Partial<InsertItem & { sellerId: string; isDraft?: boolean }>
  ): Promise<Item> {
    const insertObj: Record<string, any> = {};

    if (data.title !== undefined) insertObj.title = data.title;
    if (data.description !== undefined) insertObj.description = data.description;
    if (data.category !== undefined) insertObj.category = data.category;
    if (data.condition !== undefined) insertObj.condition = data.condition;
    if (data.price !== undefined) insertObj.price = data.price;
    if (data.location !== undefined) insertObj.location = data.location;
    if (data.photos !== undefined) insertObj.photos = data.photos;
    if (data.isExchangeable !== undefined)
      insertObj.isExchangeable = data.isExchangeable;

    insertObj.sellerId = data.sellerId;
    insertObj.isDraft = data.isDraft ?? true;
    insertObj.createdAt = new Date();
    insertObj.updatedAt = new Date();

    // Remove undefined keys
    Object.keys(insertObj).forEach((k) => {
      if (insertObj[k] === undefined) delete insertObj[k];
    });

    const [row] = await db.insert(items).values(insertObj as any).returning();
    return row;
  }

  async updateItem(
    id: string,
    updates: Partial<Item>
  ): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return item || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id));
    return (result.rowCount || 0) > 0;
  }

  async incrementItemViews(id: string): Promise<void> {
    await db
      .update(items)
      .set({ views: sql`${items.views} + 1` })
      .where(eq(items.id, id));
  }

  // ---------- Wishlist Methods ----------
  async getWishlistByUser(
    userId: string
  ): Promise<(Wishlist & { item: Item })[]> {
    return await db
      .select({
        id: wishlist.id,
        userId: wishlist.userId,
        itemId: wishlist.itemId,
        createdAt: wishlist.createdAt,
        item: items,
      })
      .from(wishlist)
      .innerJoin(items, eq(wishlist.itemId, items.id))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt));
  }

  async addToWishlist(wishlistItem: InsertWishlist): Promise<Wishlist> {
    const [newWishlistItem] = await db
      .insert(wishlist)
      .values(wishlistItem)
      .returning();
    return newWishlistItem;
  }

  async removeFromWishlist(
    userId: string,
    itemId: string
  ): Promise<boolean> {
    const result = await db
      .delete(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.itemId, itemId)));
    return (result.rowCount || 0) > 0;
  }

  async isInWishlist(userId: string, itemId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(wishlist)
      .where(and(eq(wishlist.userId, userId), eq(wishlist.itemId, itemId)));
    return !!existing;
  }

  // ---------- Message Methods ----------
  async getMessages(
    userId: string,
    itemId?: string
  ): Promise<(Message & { sender: User; receiver: User; item?: Item })[]> {
    // Create aliases for users table to differentiate sender and receiver
    const senderUsers = users;
    const receiverUsers = users;

    const conditions = [or(eq(messages.senderId, userId), eq(messages.receiverId, userId))];
    
    if (itemId) {
      conditions.push(eq(messages.itemId, itemId));
    }

    return await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        itemId: messages.itemId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        sender: senderUsers,
        receiver: receiverUsers,
        item: items,
      })
      .from(messages)
      .innerJoin(senderUsers, eq(messages.senderId, senderUsers.id))
      .innerJoin(receiverUsers, eq(messages.receiverId, receiverUsers.id))
      .leftJoin(items, eq(messages.itemId, items.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt)) as any;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  // ---------- Lost and Found Methods ----------
  async getLostFoundItems(filters?: {
    category?: string;
    search?: string;
    isClaimed?: boolean;
  }): Promise<LostFoundItem[]> {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(lostFoundItems.category, filters.category as any));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(lostFoundItems.title, `%${filters.search}%`),
          ilike(lostFoundItems.description, `%${filters.search}%`)
        )
      );
    }

    if (filters?.isClaimed !== undefined) {
      conditions.push(eq(lostFoundItems.isClaimed, filters.isClaimed));
    }

    if (conditions.length > 0) {
      return await db.select().from(lostFoundItems).where(and(...conditions)).orderBy(desc(lostFoundItems.createdAt));
    }

    return await db.select().from(lostFoundItems).orderBy(desc(lostFoundItems.createdAt));
  }

  async getLostFoundItem(id: string): Promise<LostFoundItem | undefined> {
    const [item] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, id));
    return item || undefined;
  }

  async createLostFoundItem(item: InsertLostFoundItem & { postedBy: string; photos?: string[] }): Promise<LostFoundItem> {
    const [newItem] = await db.insert(lostFoundItems).values({
      ...item,
      photos: item.photos || [],
    } as any).returning();
    return newItem;
  }

  async updateLostFoundItem(id: string, updates: Partial<LostFoundItem>): Promise<LostFoundItem | undefined> {
    const [item] = await db
      .update(lostFoundItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lostFoundItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteLostFoundItem(id: string): Promise<boolean> {
    const result = await db.delete(lostFoundItems).where(eq(lostFoundItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  // ---------- Lost and Found Claims Methods ----------
  async getLostFoundClaims(filters?: {
    lostFoundItemId?: string;
    claimantId?: string;
    status?: string;
  }): Promise<(LostFoundClaim & { lostFoundItem: LostFoundItem; claimant: User })[]> {
    const conditions = [];

    if (filters?.lostFoundItemId) {
      conditions.push(eq(lostFoundClaims.lostFoundItemId, filters.lostFoundItemId));
    }

    if (filters?.claimantId) {
      conditions.push(eq(lostFoundClaims.claimantId, filters.claimantId));
    }

    if (filters?.status) {
      conditions.push(eq(lostFoundClaims.status, filters.status as any));
    }

    const baseQuery = db
      .select({
        id: lostFoundClaims.id,
        lostFoundItemId: lostFoundClaims.lostFoundItemId,
        claimantId: lostFoundClaims.claimantId,
        description: lostFoundClaims.description,
        // Include all the missing fields from the schema
        brand: lostFoundClaims.brand,
        model: lostFoundClaims.model,
        serialNumber: lostFoundClaims.serialNumber,
        color: lostFoundClaims.color,
        purchaseDate: lostFoundClaims.purchaseDate,
        purchaseLocation: lostFoundClaims.purchaseLocation,
        estimatedValue: lostFoundClaims.estimatedValue,
        additionalIdentifiers: lostFoundClaims.additionalIdentifiers,
        contactPreference: lostFoundClaims.contactPreference,
        proofFiles: lostFoundClaims.proofFiles,
        identificationPhotos: lostFoundClaims.identificationPhotos,
        status: lostFoundClaims.status,
        reviewedBy: lostFoundClaims.reviewedBy,
        reviewNotes: lostFoundClaims.reviewNotes,
        createdAt: lostFoundClaims.createdAt,
        updatedAt: lostFoundClaims.updatedAt,
        lostFoundItem: lostFoundItems,
        claimant: users,
      })
      .from(lostFoundClaims)
      .innerJoin(lostFoundItems, eq(lostFoundClaims.lostFoundItemId, lostFoundItems.id))
      .innerJoin(users, eq(lostFoundClaims.claimantId, users.id));

    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(desc(lostFoundClaims.createdAt));
    }

    return await baseQuery.orderBy(desc(lostFoundClaims.createdAt));
  }

  async createLostFoundClaim(claim: InsertLostFoundClaim & { 
    lostFoundItemId: string; 
    claimantId: string; 
    proofFiles?: string[] 
  }): Promise<LostFoundClaim> {
    // Check if item exists and is not already claimed
    const [item] = await db.select().from(lostFoundItems).where(eq(lostFoundItems.id, claim.lostFoundItemId));
    if (!item) {
      throw new Error("Lost and found item not found");
    }
    if (item.isClaimed) {
      throw new Error("This item has already been claimed");
    }

    // Check for existing pending claim by this user for this item
    const [existingClaim] = await db.select()
      .from(lostFoundClaims)
      .where(
        and(
          eq(lostFoundClaims.lostFoundItemId, claim.lostFoundItemId),
          eq(lostFoundClaims.claimantId, claim.claimantId),
          eq(lostFoundClaims.status, "pending")
        )
      );
    
    if (existingClaim) {
      throw new Error("You already have a pending claim for this item");
    }

    const [newClaim] = await db.insert(lostFoundClaims).values({
      ...claim,
      proofFiles: claim.proofFiles || [],
    } as any).returning();
    return newClaim;
  }

  async updateLostFoundClaim(id: string, updates: Partial<LostFoundClaim>): Promise<LostFoundClaim | undefined> {
    const [claim] = await db
      .update(lostFoundClaims)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lostFoundClaims.id, id))
      .returning();
    return claim || undefined;
  }

  async approveLostFoundClaim(claimId: string, reviewedBy: string, notes?: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Get the claim and verify it's still pending
      const [claim] = await tx.select().from(lostFoundClaims).where(eq(lostFoundClaims.id, claimId));
      if (!claim || claim.status !== "pending") {
        return false;
      }

      // Check if the item is still available (not already claimed)
      const [item] = await tx.select().from(lostFoundItems).where(eq(lostFoundItems.id, claim.lostFoundItemId));
      if (!item || item.isClaimed) {
        return false;
      }

      // Approve this specific claim
      await tx.update(lostFoundClaims)
        .set({
          status: "approved",
          reviewedBy,
          reviewNotes: notes,
          updatedAt: new Date(),
        })
        .where(eq(lostFoundClaims.id, claimId));

      // Mark the item as claimed
      await tx.update(lostFoundItems)
        .set({
          isClaimed: true,
          claimedBy: claim.claimantId,
          updatedAt: new Date(),
        })
        .where(eq(lostFoundItems.id, claim.lostFoundItemId));

      // Reject all other pending claims for this item
      await tx.update(lostFoundClaims)
        .set({
          status: "rejected",
          reviewedBy,
          reviewNotes: "Automatically rejected - item was claimed by another user",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(lostFoundClaims.lostFoundItemId, claim.lostFoundItemId),
            eq(lostFoundClaims.status, "pending"),
            sql`${lostFoundClaims.id} != ${claimId}` // Not the approved claim
          )
        );

      return true;
    });
  }

  async rejectLostFoundClaim(claimId: string, reviewedBy: string, notes?: string): Promise<boolean> {
    const result = await db.update(lostFoundClaims)
      .set({
        status: "rejected",
        reviewedBy,
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(lostFoundClaims.id, claimId));

    return (result.rowCount || 0) > 0;
  }

  // ---------- Admin Methods ----------
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeItems: number;
    totalMessages: number;
    totalLostFoundItems: number;
    totalClaims: number;
  }> {
    const [userCount] = await db.select({ count: sql`count(*)` }).from(users);
    const [itemCount] = await db
      .select({ count: sql`count(*)` })
      .from(items)
      .where(eq(items.status, "active"));
    const [messageCount] = await db
      .select({ count: sql`count(*)` })
      .from(messages);
    const [lostFoundCount] = await db
      .select({ count: sql`count(*)` })
      .from(lostFoundItems);
    const [claimsCount] = await db
      .select({ count: sql`count(*)` })
      .from(lostFoundClaims);

    return {
      totalUsers: Number(userCount.count),
      activeItems: Number(itemCount.count),
      totalMessages: Number(messageCount.count),
      totalLostFoundItems: Number(lostFoundCount.count),
      totalClaims: Number(claimsCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
