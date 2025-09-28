import type { Express } from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema, insertWishlistSchema, insertMessageSchema, insertLostFoundItemSchema, insertLostFoundClaimSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { z } from "zod";
import express from "express";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || req.user!.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function registerRoutes(app: Express): Promise<void> {
  // Setup authentication routes
  setupAuth(app);

  // Items routes
  app.get("/api/items", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        location: req.query.location as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
        status: req.query.status as string,
      };
      
      const items = await storage.getItems(filters);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Increment view count
      await storage.incrementItemViews(req.params.id);
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  app.post("/api/items", requireAuth, upload.array("photos", 5), async (req: any, res) => {
    try {
      console.log("Raw request body:", req.body);
      console.log("Request files:", req.files);
      
      // Parse and validate the form data
      const price = req.body.price ? parseInt(req.body.price, 10) : 0;
      const isExchangeable = req.body.isExchangeable === "true" || req.body.isExchangeable === true;
      
      const formData = {
        title: req.body.title || "",
        description: req.body.description || "",
        category: req.body.category,
        condition: req.body.condition,
        price: isNaN(price) ? 0 : price,
        location: req.body.location,
        isExchangeable,
      };
      
      console.log("Processed form data:", formData);
      
      const itemData = insertItemSchema.parse(formData);
      
      // Handle uploaded photos
      const photos = (req.files as Express.Multer.File[])?.map(file => file.filename) || [];
      
      const item = await storage.createItem({
        ...itemData,
        photos,
        sellerId: req.user!.id,
      } as any);
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Item creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create item" });
    }
  });
    // Draft endpoint: save incomplete listings (allows partial fields)
  app.post("/api/items/draft", requireAuth, upload.array("photos", 5), async (req, res) => {
    try {
      // Use partial() so all fields are optional
      const parsed = insertItemSchema.partial().safeParse({
        ...req.body,
        price: req.body.price ? parseInt(req.body.price) : undefined,
        isExchangeable:
          req.body.isExchangeable === "true"
            ? true
            : req.body.isExchangeable === "false"
            ? false
            : undefined,
      });

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation error (draft)",
          errors: parsed.error.errors,
        });
      }

      // Handle uploaded photos
      const photos =
        (req.files as Express.Multer.File[])?.map((f) => f.filename) || [];

      // Call storage.createDraft (to implement in storage.ts)
      const draft = await storage.createDraft({
        ...parsed.data,
        photos,
        sellerId: req.user!.id,
        isDraft: true,
      });

      res.status(201).json(draft);
    } catch (err) {
      console.error("Failed to create draft:", err);
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  app.put("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.sellerId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to update this item" });
      }
      
      const updates = {
        ...req.body,
        price: req.body.price ? parseInt(req.body.price) : undefined,
        isExchangeable: req.body.isExchangeable !== undefined ? req.body.isExchangeable === "true" : undefined,
      };
      
      const updatedItem = await storage.updateItem(req.params.id, updates);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", requireAuth, async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.sellerId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to delete this item" });
      }
      
      const deleted = await storage.deleteItem(req.params.id);
      if (deleted) {
        res.json({ message: "Item deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete item" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  app.get("/api/my-items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getItems({
        sellerId: req.user!.id,
        status: req.query.status as string,
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch your items" });
    }
  });

  // Wishlist routes
  app.get("/api/wishlist/?", requireAuth, async (req, res) => {
    try {
      const wishlistItems = await storage.getWishlistByUser(req.user!.id);
      res.json(wishlistItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/wishlist/?", requireAuth, async (req, res) => {
    try {
      const wishlistData = insertWishlistSchema.parse({
        userId: req.user!.id,
        itemId: req.body.itemId,
      });
      
      // Check if already in wishlist
      const exists = await storage.isInWishlist(req.user!.id, req.body.itemId);
      if (exists) {
        return res.status(400).json({ message: "Item already in wishlist" });
      }
      
      const wishlistItem = await storage.addToWishlist(wishlistData);
      res.status(201).json(wishlistItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/wishlist/:itemId", requireAuth, async (req, res) => {
    try {
      const removed = await storage.removeFromWishlist(req.user!.id, req.params.itemId);
      if (removed) {
        res.json({ message: "Removed from wishlist" });
      } else {
        res.status(404).json({ message: "Item not found in wishlist" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  // Messages routes
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessages(req.user!.id, req.query.itemId as string);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        senderId: req.user!.id,
        receiverId: req.body.receiverId,
        itemId: req.body.itemId,
        content: req.body.content,
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.put("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.json({ message: "Message marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(req.params.id, updates);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Lost and Found routes
  app.get("/api/lost-found", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        search: req.query.search as string,
        isClaimed: req.query.isClaimed === "true" ? true : req.query.isClaimed === "false" ? false : undefined,
      };
      
      const items = await storage.getLostFoundItems(filters);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lost and found items" });
    }
  });

  app.get("/api/lost-found/:id", async (req, res) => {
    try {
      const item = await storage.getLostFoundItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Lost and found item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lost and found item" });
    }
  });

  app.post("/api/lost-found", requireAdmin, upload.array("photos", 5), async (req: any, res) => {
    try {
      const itemData = insertLostFoundItemSchema.parse({
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        foundLocation: req.body.foundLocation,
      });
      
      // Handle uploaded photos
      const photos = (req.files as Express.Multer.File[])?.map(file => file.filename) || [];
      
      const item = await storage.createLostFoundItem({
        ...itemData,
        photos,
        postedBy: req.user!.id,
      });
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lost and found item" });
    }
  });

  app.put("/api/lost-found/:id", requireAdmin, async (req: any, res) => {
    try {
      const item = await storage.getLostFoundItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Lost and found item not found" });
      }
      
      // Validate and whitelist allowed fields for updates
      const allowedUpdates = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        foundLocation: req.body.foundLocation,
      };
      
      // Remove undefined fields
      const updates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updatedItem = await storage.updateLostFoundItem(req.params.id, updates);
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lost and found item" });
    }
  });

  app.delete("/api/lost-found/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteLostFoundItem(req.params.id);
      if (deleted) {
        res.json({ message: "Lost and found item deleted successfully" });
      } else {
        res.status(404).json({ message: "Lost and found item not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lost and found item" });
    }
  });

  // Lost and Found Claims routes
  app.get("/api/lost-found-claims", requireAuth, async (req: any, res) => {
    try {
      const filters = {
        lostFoundItemId: req.query.lostFoundItemId as string,
        claimantId: req.user!.role === "admin" ? req.query.claimantId as string : req.user!.id,
        status: req.query.status as string,
      };
      
      const claims = await storage.getLostFoundClaims(filters);
      res.json(claims);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });

  app.post("/api/lost-found-claims", requireAuth, upload.array("proofFiles", 3), async (req: any, res) => {
    try {
      const claimData = insertLostFoundClaimSchema.parse({
        description: req.body.description,
      });
      
      // Handle uploaded proof files
      const proofFiles = (req.files as Express.Multer.File[])?.map(file => file.filename) || [];
      
      const claim = await storage.createLostFoundClaim({
        ...claimData,
        lostFoundItemId: req.body.lostFoundItemId,
        claimantId: req.user!.id,
        proofFiles,
      });
      
      res.status(201).json(claim);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create claim" });
    }
  });

  app.put("/api/lost-found-claims/:id/approve", requireAdmin, async (req: any, res) => {
    try {
      const success = await storage.approveLostFoundClaim(
        req.params.id,
        req.user!.id,
        req.body.notes
      );
      
      if (success) {
        res.json({ message: "Claim approved successfully" });
      } else {
        res.status(404).json({ message: "Claim not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to approve claim" });
    }
  });

  app.put("/api/lost-found-claims/:id/reject", requireAdmin, async (req: any, res) => {
    try {
      const success = await storage.rejectLostFoundClaim(
        req.params.id,
        req.user!.id,
        req.body.notes
      );
      
      if (success) {
        res.json({ message: "Claim rejected successfully" });
      } else {
        res.status(404).json({ message: "Claim not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to reject claim" });
    }
  });

  // Health check is now registered early in server/index.ts

  // Auth providers check
  app.get("/api/auth/providers/?", (req, res) => {
    res.json({
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  });

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  return Promise.resolve();
}
