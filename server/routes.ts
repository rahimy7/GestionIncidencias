// server/routes.ts - Correcciones necesarias

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { login, register, isAuthenticated } from "./auth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  insertIncidentSchema,
  insertActionPlanSchema,
  insertIncidentParticipantSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes - JWT instead of Replit
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = await register(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

  // Object storage endpoints
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    // FIX: Usar req.user.id en lugar de req.user.claims.sub
    const userId = (req as any).user.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const stats = await storage.getDashboardStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

  // Center stats for manager dashboard
 app.get('/api/dashboard/center-stats/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    const centerId = req.params.centerId;
    // FIX: usar req.user.id en lugar de req.user.claims.sub  
    const userId = req.user.id;
    const centerStats = await storage.getCenterStats(centerId, userId);
    res.json(centerStats);
  } catch (error) {
    console.error("Error fetching center stats:", error);
    res.status(500).json({ message: "Failed to fetch center stats" });
  }
});

  // Get user's own incidents
app.get('/api/incidents/my', isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const incidents = await storage.getIncidentsByReporter(userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching user incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

  // Get incidents by center (for managers)
app.get('/api/incidents/center/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    const centerId = req.params.centerId;
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id; 
    const incidents = await storage.getIncidentsByCenter(centerId, userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching center incidents:", error);
    res.status(500).json({ message: "Failed to fetch center incidents" });
  }
});

  // Get user's managed center
app.get('/api/centers/my', isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const center = await storage.getCenterByManager(userId);
    res.json(center);
  } catch (error) {
    console.error("Error fetching managed center:", error);
    res.status(500).json({ message: "Failed to fetch center" });
  }
});

  // Incidents endpoints
  app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      const { status, priority, centerId, assigneeId, reporterId } = req.query;
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (centerId) filters.centerId = centerId;
      if (assigneeId) filters.assigneeId = assigneeId;
      if (reporterId) filters.reporterId = reporterId;

      const incidents = await storage.getIncidents(filters);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  app.post("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      const validatedData = insertIncidentSchema.parse({
        ...req.body,
        reporterId: userId,
      });

      const incident = await storage.createIncident(validatedData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.put("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      
      // Check if user has permission to update this incident
      const incident = await storage.getIncidentById(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      const updates = req.body;
      const updatedIncident = await storage.updateIncident(id, updates);

      // Add history entry for the update
      await storage.addIncidentHistory({
        incidentId: id,
        userId: userId,
        action: "updated",
        description: "Incidencia actualizada",
        metadata: updates,
      });

      res.json(updatedIncident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Action plans endpoints
  app.post("/api/incidents/:id/action-plans", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      
      const validatedData = insertActionPlanSchema.parse({
        ...req.body,
        incidentId: id,
      });

      const actionPlan = await storage.createActionPlan(validatedData);
      res.status(201).json(actionPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating action plan:", error);
      res.status(500).json({ message: "Failed to create action plan" });
    }
  });

  // Evidence upload endpoint - FIX IMPORTANTE
  app.put("/api/evidence-files", isAuthenticated, async (req: any, res) => {
    if (!req.body.evidenceFileURL) {
      return res.status(400).json({ error: "evidenceFileURL is required" });
    }

    // FIX: Usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.evidenceFileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting evidence file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Centers endpoints
  app.get("/api/centers", isAuthenticated, async (req, res) => {
    try {
      const centers = await storage.getCenters();
      res.json(centers);
    } catch (error) {
      console.error("Error fetching centers:", error);
      res.status(500).json({ message: "Failed to fetch centers" });
    }
  });

  // Incident types endpoints
  app.get("/api/incident-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getIncidentTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching incident types:", error);
      res.status(500).json({ message: "Failed to fetch incident types" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}