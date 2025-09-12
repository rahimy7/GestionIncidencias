// server/routes.ts - Correcciones necesarias

import express, { type Express } from "express";
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
  Center,
  incidentHistory,
  users,
} from "@shared/schema";
import { z } from "zod";
import { hashPassword } from './auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { eq, desc } from "drizzle-orm";
import { db } from "./db.js";


interface RequestWithFile extends Express.Request {
  file?: Express.Multer.File;
  user?: any;
  body: any;
}
// Configuración de multer para uploads

const multerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

function processEvidenceFiles(files: any): string[] {
  const processedFiles: string[] = [];
  const fileList = Array.isArray(files) ? files : [files];
  
  for (const file of fileList) {
    const relativePath = `/uploads/${file.filename}`;
    processedFiles.push(relativePath);
  }
  
  return processedFiles;
}

export async function ensureUploadsDirectory() {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    console.log('📁 Uploads directory ensured:', uploadDir);
  } catch (error) {
    console.error('❌ Error creating uploads directory:', error);
  }
}

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
   app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

   // CORS si es necesario
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Debug middleware para todos los requests de action plans
  app.use('/api/incidents/*/action-plans', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Content-Type:', req.get('Content-Type'));
    next();
  });
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

// Agregar después de las rutas de auth existentes
app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      location: user.location,
      centerId: user.centerId
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
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

app.get('/api/dashboard/center-stats-detailed', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verificar que el usuario es manager y tiene centro asignado
    if (user.role !== 'manager' && user.role !== 'supervisor') {
      return res.status(403).json({ message: 'Access denied. Manager role required.' });
    }
    
    if (!user.centerId) {
      return res.status(404).json({ message: 'User is not assigned to a center' });
    }

    const detailedStats = await storage.getCenterStatsDetailed(user.centerId, userId);
    res.json(detailedStats);
  } catch (error) {
    console.error("Error fetching detailed center stats:", error);
    res.status(500).json({ message: "Failed to fetch detailed center stats" });
  }
});

app.get('/api/action-plans/center/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    let centerId = req.params.centerId;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Si no se proporciona centerId, obtener el centro del usuario (para managers)
    if (!centerId) {
      if (!user.centerId) {
        return res.status(404).json({ message: "User is not assigned to a center" });
      }
      centerId = user.centerId;
    }
    
    // Verificar permisos - solo managers del centro o admins
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied. Manager role required.' });
    }
    
    if (user.role === 'manager' && user.centerId !== centerId) {
      return res.status(403).json({ message: 'Access denied. Can only view action plans from your assigned center.' });
    }

    const actionPlans = await storage.getActionPlansByCenter(centerId);
    res.json(actionPlans);
  } catch (error) {
    console.error("Error fetching center action plans:", error);
    res.status(500).json({ message: "Failed to fetch center action plans" });
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
// Reemplaza tu endpoint existente con esta versión mejorada
app.get('/api/incidents/center/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    let centerId = req.params.centerId;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Si no se proporciona centerId, obtener el centro del usuario (para managers)
    if (!centerId) {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.centerId) {
        return res.status(404).json({ message: "User is not assigned to a center" });
      }
      
      centerId = user.centerId;
      console.log(`Manager ${user.firstName} ${user.lastName} accessing their center incidents: ${centerId}`);
    }
    
    // Usar getIncidentsWithAdvancedFilters en lugar de getIncidentsByCenter
    const filters = { centerId: centerId };
    const incidents = await storage.getIncidentsWithAdvancedFilters(filters, limit, offset);
    
    console.log(`Found ${incidents.length} incidents for center ${centerId}`);
    
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

// Incidents endpoints - ORDEN CORRECTO
app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
  try {
    const {
      centerId = "",
      typeId = "",
      startDate = "", // yyyy-MM-dd
      endDate = "",   // yyyy-MM-dd
      sortBy = "createdAt", // "createdAt" | "center" | "type"
      sortDir = "desc",     // "asc" | "desc"
      limit = "100",
      offset = "0",
    } = req.query as Record<string, string>;

    const filters: any = {};

    if (centerId) filters.centerId = centerId;
    if (typeId) filters.typeId = typeId;

    if (startDate) filters.dateFrom = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      filters.dateTo = end;
    }

    filters.sortBy = (sortBy === "createdAt") ? "date" : sortBy;
    filters.sortOrder = (sortDir === "asc") ? "asc" : "desc";

    const incidents = await storage.getIncidentsWithAdvancedFilters(
      filters,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    res.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

// ESPECÍFICO PRIMERO - antes que /:id
app.get("/api/incidents/assigned", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const incidents = await storage.getIncidentsByAssignee(userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching assigned incidents:", error);
    res.status(500).json({ message: "Failed to fetch assigned incidents" });
  }
});

app.post("/api/incidents", isAuthenticated, async (req: any, res) => {
  try {
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

// GENÉRICO AL FINAL - después de rutas específicas
app.get("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`Invalid UUID format: ${id}`);
      return res.status(400).json({ 
        error: "Formato de ID inválido",
        details: `El ID '${id}' no es un UUID válido`,
        receivedId: id
      });
    }

    const incident = await storage.getIncidentById(id);
    if (!incident) {
      console.log(`Incident not found: ${id}`);
      return res.status(404).json({ 
        error: "Incidencia no encontrada",
        details: `No se encontró la incidencia con ID ${id}`
      });
    }

    // Verificar permisos
    if (userRole !== "admin") {
      if (userRole === "manager" && incident.centerId) {
        const isManager = await storage.isManagerOfCenter(userId, incident.centerId);
        console.log(`isManagerOfCenter(${userId}, ${incident.centerId}):`, isManager);
      }

      const hasAccess = 
        incident.reporterId === userId ||
        incident.assigneeId === userId ||
        (userRole === "manager" && incident.centerId && await storage.isManagerOfCenter(userId, incident.centerId));
      
      console.log("Access check result:", hasAccess);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(incident);
  } catch (error) {
    console.error(`Error fetching incident ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

app.put("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const incident = await storage.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    const updates = req.body;
    const updatedIncident = await storage.updateIncident(id, updates, userId);

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

// Endpoint para historial de incidencias
app.get('/api/incidents/:id/history', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const history = await db
      .select({
        id: incidentHistory.id,
        action: incidentHistory.action,
        description: incidentHistory.description,
        metadata: incidentHistory.metadata,
        createdAt: incidentHistory.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(incidentHistory)
      .leftJoin(users, eq(incidentHistory.userId, users.id))
      .where(eq(incidentHistory.incidentId, id))
      .orderBy(desc(incidentHistory.createdAt));

    res.json(history);
  } catch (error) {
    console.error('Error fetching incident history:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
// Participants endpoints
app.post("/api/incidents/:id/participants", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "participant" } = req.body;
    
    const participant = await storage.addIncidentParticipant({
      incidentId: id,
      userId,
      role
    });
    
    res.status(201).json(participant);
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ message: "Failed to add participant" });
  }
});
app.get("/api/incidents/:id/participants", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Formato de ID inválido',
        details: `El parámetro '${id}' no es un UUID válido`
      });
    }

    // Verificar que la incidencia existe
    const incident = await storage.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ 
        message: "Incidencia no encontrada" 
      });
    }

    // Obtener participantes usando el método de storage
    const participants = await storage.getIncidentParticipants(id);
    
    res.json(participants);
  } catch (error) {
    console.error("Error fetching incident participants:", error);
    res.status(500).json({ 
      message: "Error al obtener participantes de la incidencia" 
    });
  }
});

app.delete("/api/incidents/:id/participants/:userId", isAuthenticated, async (req: any, res) => {
  try {
    const { id, userId } = req.params;
    await storage.removeIncidentParticipant(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ message: "Failed to remove participant" });
  }
});

// Departments endpoint - SOLO UNA VEZ
app.get("/api/departments", isAuthenticated, async (req: any, res) => {
  try {
    const departments = await storage.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});
// Action plans endpoints

// Middleware específico SOLO para rutas de incidents
app.use('/api/incidents/:id', (req, res, next) => {
  const { id } = req.params;
  console.log(`Validating incident ID: ${id}`);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    console.log(`Invalid UUID format: ${id}`);
    return res.status(400).json({
      error: 'Formato de ID inválido',
      details: `El parámetro '${id}' no es un UUID válido`,
      expected: 'UUID en formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    });
  }
  
  next();
});
// En server/routes.ts - Endpoint POST corregido con manejo de campos requeridos

app.post("/api/incidents/:id/action-plans", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log("Creating action plan for incident:", id);
    console.log("Request body:", req.body);
    console.log("User ID:", userId);

    // Verificar que la incidencia existe
    const incident = await storage.getIncidentById(id);
    if (!incident) {
      console.log("Incident not found:", id);
      return res.status(404).json({ message: "Incident not found" });
    }

    // Validar campos requeridos antes del schema
    const { title, description, assigneeId, dueDate } = req.body;
    
    if (!title || !description || !assigneeId || !dueDate) {
      return res.status(400).json({ 
        message: "Missing required fields", 
        required: ["title", "description", "assigneeId", "dueDate"],
        received: { title, description, assigneeId, dueDate }
      });
    }

    // Preparar los datos del plan de acción
    const data = {
      incidentId: id,
      title: title.trim(),
      description: description.trim(),
      assigneeId: assigneeId,
      dueDate: new Date(dueDate),
      status: "pending", // Default status
      departmentId: req.body.departmentId || null
    };

    console.log("Prepared data:", data);

    // Validar los datos usando el schema
    try {
      const validatedData = insertActionPlanSchema.parse(data);
      console.log("Data validated successfully:", validatedData);

      // Crear el plan de acción
      const actionPlan = await storage.createActionPlan(validatedData);
      console.log("Action plan created:", actionPlan);

      res.status(201).json(actionPlan);
    } catch (schemaError) {
      console.error("Schema validation error:", schemaError);
      if (schemaError instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Schema validation failed", 
          errors: schemaError.errors,
          receivedData: data
        });
      }
      throw schemaError;
    }

  } catch (error) {
    console.error("Error creating action plan:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Asegurarse de devolver JSON siempre
    if (!res.headersSent) {
      return res.status(500).json({ 
        message: "Failed to create action plan",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});


app.get("/api/incidents/:id/action-plans", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const actionPlans = await storage.getActionPlansByIncident(id);
    res.json(actionPlans);
  } catch (error) {
    console.error("Error fetching action plans:", error);
    res.status(500).json({ message: "Failed to fetch action plans" });
  }
});

// Actualizar plan de acción
app.patch("/api/action-plans/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log('📝 Updating action plan:', id, updates);

    // Si se está completando el plan, agregar fecha de completado
    if (updates.status === 'completed') {
      updates.completedAt = new Date();
    }

    const updatedPlan = await storage.updateActionPlan(id, updates);
    res.json(updatedPlan);

  } catch (error) {
    console.error("Error updating action plan:", error);
    res.status(500).json({ 
      message: "No se pudo actualizar el plan de acción",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Agregar participante a plan de acción
app.post("/api/action-plans/:id/participants", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'participant' } = req.body;
    
    const participant = await storage.addActionPlanParticipant({
      actionPlanId: id,
      userId,
      role
    });
    
    res.status(201).json(participant);
  } catch (error) {
    console.error("Error adding action plan participant:", error);
    res.status(500).json({ message: "Failed to add participant" });
  }
});

// Remover participante de plan de acción
app.delete("/api/action-plans/:id/participants/:userId", isAuthenticated, async (req: any, res) => {
  try {
    const { id, userId } = req.params;
    await storage.removeActionPlanParticipant(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing action plan participant:", error);
    res.status(500).json({ message: "Failed to remove participant" });
  }
});
// Obtener participantes de un plan de acción
app.get("/api/action-plans/:id/participants", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const participants = await storage.getActionPlanParticipants(id);
    res.json(participants);
  } catch (error) {
    console.error("Error fetching action plan participants:", error);
    res.status(500).json({ message: "Failed to fetch participants" });
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
  // Agregar estas rutas en server/routes.ts después de la línea con los endpoints de centers

  // Crear centro (POST)
  app.post("/api/centers", isAuthenticated, async (req: any, res) => {
    try {
      const { name, code, address, managerId } = req.body;
      
      // Validar datos requeridos
      if (!name || !code || !address) {
        return res.status(400).json({ 
          message: "Nombre, código y dirección son requeridos" 
        });
      }

      // Verificar si el código ya existe
      const existingCenter = await storage.getCenterByCode(code);
      if (existingCenter) {
        return res.status(400).json({ 
          message: "El código de centro ya existe" 
        });
      }

      const centerData = {
        name,
        code: code.toUpperCase(),
        address,
        managerId: managerId || null
      };

      const newCenter = await storage.createCenter(centerData);
      res.status(201).json(newCenter);
    } catch (error) {
      console.error("Error creating center:", error);
      res.status(500).json({ message: "Error al crear el centro" });
    }
  });

  // Obtener usuarios (para el select de managers)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    
    // Solo admins o el mismo usuario pueden ver detalles
    if (requestingUserRole !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});

app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    
    // Solo admins pueden editar usuarios
    if (requestingUserRole !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    const updates = req.body;
    
    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    const updatedUser = await storage.updateUser(id, updates);
    
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
});

// server/routes.ts - Reemplazar la función DELETE /api/users/:id

app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;
    
    // Solo admins pueden eliminar usuarios
    if (requestingUserRole !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    // No permitir que se eliminen a sí mismos
    if (requestingUserId === id) {
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Eliminar todas las referencias antes de eliminar el usuario
    await storage.removeUserReferences(id);

    await storage.deleteUser(id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
});

// server/storage.ts - Agregar este método a la clase DatabaseStorage


  // Agregar estos endpoints al final de server/routes.ts, antes de "const httpServer = createServer(app);"

  // Obtener todos los usuarios (para gestión de usuarios)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Crear nuevo usuario
app.post("/api/users", isAuthenticated, async (req: any, res) => {
  try {
    const userData = req.body;
    
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ 
        message: "El email ya está en uso" 
      });
    }

    const { hashPassword } = await import('./auth.js');
    const hashedPassword = await hashPassword(userData.password);
    const userDataWithHashedPassword = {
      ...userData,
      password: hashedPassword,
      centerId: userData.centerId || null
    };

    const newUser = await storage.createUser(userDataWithHashedPassword);
    
    const { password, ...userResponse } = newUser;
    res.status(201).json(userResponse);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error al crear el usuario" });
  }
});

// Actualizar usuario
app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Si se actualiza el email, verificar que no esté en uso
    if (updates.email) {
      const existingUser = await storage.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ 
          message: "El email ya está en uso" 
        });
      }
    }
    
    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      const { hashPassword } = await import('./auth.js');
      updates.password = await hashPassword(updates.password);
    }
    
    const updatedUser = await storage.updateUser(id, updates);
    
    // No devolver la contraseña
    const { password, ...userResponse } = updatedUser;
    res.json(userResponse);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
});

// Obtener usuario específico
app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // No devolver la contraseña
    const { password, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});

app.get("/api/users-with-details", isAuthenticated, async (req: any, res) => {
  try {
    const usersWithDetails = await storage.getUsersWithDetails();
    res.json(usersWithDetails);
  } catch (error) {
    console.error("Error fetching users with details:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});


// Obtener todos los departamentos
app.get("/api/departments", isAuthenticated, async (req, res) => {
  try {
    // Por ahora usamos los departments del campo department de users como referencia
    // Más adelante se puede crear una tabla separada para departments
    const departments = await storage.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// Crear departamento
app.post("/api/departments", isAuthenticated, async (req: any, res) => {
  try {
    const { name, code, description, headUserId } = req.body;
    
    // Validar datos requeridos
    if (!name || !code) {
      return res.status(400).json({ 
        message: "Nombre y código son requeridos" 
      });
    }

    // Verificar si el código ya existe
    const existingDept = await storage.getDepartmentByCode(code);
    if (existingDept) {
      return res.status(400).json({ 
        message: "El código de departamento ya existe" 
      });
    }

    const departmentData = {
      name,
      code: code.toUpperCase(),
      description: description || null,
      headUserId: headUserId || null
    };

    const newDepartment = await storage.createDepartment(departmentData);
    res.status(201).json(newDepartment);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ message: "Error al crear el departamento" });
  }
});

// Actualizar departamento
app.put("/api/departments/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedDepartment = await storage.updateDepartment(id, updates);
    res.json(updatedDepartment);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ message: "Error al actualizar el departamento" });
  }
});

// Agregar este endpoint en server/routes.ts después del GET /api/departments

// Obtener departamento específico
app.get("/api/departments/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const department = await storage.getDepartment(id);
    
    if (!department) {
      return res.status(404).json({ message: "Departamento no encontrado" });
    }
    
    res.json(department);
  } catch (error) {
    console.error("Error fetching department:", error);
    res.status(500).json({ message: "Error al obtener departamento" });
  }
});

// Eliminar departamento
app.delete("/api/departments/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay usuarios asignados al departamento
    const usersInDepartment = await storage.getUsersByDepartment(id);
    if (usersInDepartment.length > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar el departamento porque tiene usuarios asignados" 
      });
    }

    await storage.deleteDepartment(id);
    res.json({ message: "Departamento eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ message: "Error al eliminar departamento" });
  }
});

// =================== CENTROS/TIENDAS MEJORADOS ===================

// Obtener centros/tiendas con filtro por tipo
app.get('/api/centers', isAuthenticated, async (req: any, res) => {
  try {
    const { type } = req.query; // 'store' | 'center' | undefined (todos)
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Tipar explícitamente la variable centers
    let centers: Center[] = [];
    
    if (user.role === 'admin') {
      centers = await storage.getAllCenters(type);
    } else if (user.role === 'manager' && user.centerId) {
      const userCenter = await storage.getCenter(user.centerId);
      centers = userCenter ? [userCenter] : [];
    }
    
    res.json(centers);
  } catch (error) {
    console.error("Error fetching centers:", error);
    res.status(500).json({ message: "Failed to fetch centers" });
  }
});

// Crear centro/tienda
app.post("/api/centers", isAuthenticated, async (req: any, res) => {
  try {
    const { name, code, address, managerId, type } = req.body;
    
    // Validar datos requeridos
    if (!name || !code || !address) {
      return res.status(400).json({ 
        message: "Nombre, código y dirección son requeridos" 
      });
    }

    // Validar formato del código según el tipo
    const codeUpper = code.toUpperCase();
    if (type === 'store' && !codeUpper.startsWith('T')) {
      return res.status(400).json({ 
        message: "El código de tienda debe iniciar con 'T' (ej: T01, T02)" 
      });
    }
    if (type === 'center' && !codeUpper.startsWith('TCD')) {
      return res.status(400).json({ 
        message: "El código de centro debe iniciar con 'TCD' (ej: TCD11, TCD12)" 
      });
    }

    // Verificar si el código ya existe
    const existingCenter = await storage.getCenterByCode(codeUpper);
    if (existingCenter) {
      return res.status(400).json({ 
        message: "El código ya existe" 
      });
    }

    const centerData = {
      name,
      code: codeUpper,
      address,
      managerId: managerId || null
    };

    const newCenter = await storage.createCenter(centerData);
    res.status(201).json(newCenter);
  } catch (error) {
    console.error("Error creating center:", error);
    res.status(500).json({ message: "Error al crear el centro/tienda" });
  }
});

// Actualizar centro/tienda
app.put("/api/centers/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Si se actualiza el código, validar formato
    if (updates.code) {
      const codeUpper = updates.code.toUpperCase();
      updates.code = codeUpper;
      
      // Verificar si el nuevo código ya existe (excluyendo el centro actual)
      const existingCenter = await storage.getCenterByCode(codeUpper);
      if (existingCenter && existingCenter.id !== id) {
        return res.status(400).json({ 
          message: "El código ya existe" 
        });
      }
    }
    
    const updatedCenter = await storage.updateCenter(id, updates);
    res.json(updatedCenter);
  } catch (error) {
    console.error("Error updating center:", error);
    res.status(500).json({ message: "Error al actualizar el centro/tienda" });
  }
});

// Endpoint para subir archivos
app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: RequestWithFile, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo' });
    }

    const { incidentId } = req.body;
    if (!incidentId) {
      return res.status(400).json({ message: 'ID de incidencia requerido' });
    }

    // Construir URL del archivo
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Guardar referencia del archivo en la base de datos si tienes tabla de attachments
    // await storage.createAttachment({
    //   incidentId,
    //   filename: req.file.filename,
    //   originalName: req.file.originalname,
    //   mimetype: req.file.mimetype,
    //   size: req.file.size,
    //   url: fileUrl
    // });

    res.json({
      message: 'Archivo subido exitosamente',
      url: fileUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Obtener usuarios de prueba (para página TestUsers)
  app.get("/api/test-users", async (req, res) => {
    try {
      const testUsers = await storage.getTestUsers();
      res.json(testUsers);
    } catch (error) {
      console.error("Error fetching test users:", error);
      res.status(500).json({ message: "Failed to fetch test users" });
    }
  });

  app.delete('/api/centers/:id', isAuthenticated, async (req, res) => {
  try {
    await storage.deleteCenter(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar centro" });
  }
});

// server/routes.ts - Agregar estos endpoints después de los existentes

// Endpoint para estadísticas globales (Admin)
app.get('/api/dashboard/global-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Verificar que el usuario sea admin
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const globalStats = await storage.getGlobalStats();
    res.json(globalStats);
  } catch (error) {
    console.error("Error fetching global stats:", error);
    res.status(500).json({ message: "Failed to fetch global stats" });
  }
});

app.get('/api/dashboard/center-type-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const stats = await storage.getCenterTypeStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching center type stats:", error);
    res.status(500).json({ message: "Failed to fetch center type stats" });
  }
});

// Estadísticas de departamentos
app.get('/api/dashboard/department-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const stats = await storage.getDepartmentStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching department stats:", error);
    res.status(500).json({ message: "Failed to fetch department stats" });
  }
});

// Endpoint para obtener incidencias con filtros avanzados

app.get('/api/incidents/filtered', isAuthenticated, async (req: any, res) => {
  try {
    const { 
      status, 
      priority, 
      centerId, 
      search,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    const filters: any = {};
    
    // Aplicar filtros básicos
    if (status && status !== 'critical') filters.status = status;
    if (priority || status === 'critical') {
      filters.priority = status === 'critical' ? 'critical' : priority;
    }
    if (centerId) filters.centerId = centerId;
    
    // Aplicar filtros de búsqueda y fecha
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Final del día
      filters.dateTo = endDate;
    }
    
    // Configurar ordenamiento
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;


if (!user) {
  return res.status(404).json({ message: "User not found" });
}

// Para managers, limitar a su centro si no son admin
if (user.role === 'manager' && user.centerId && !filters.centerId) {
  filters.centerId = user.centerId;
}

    const incidents = await storage.getIncidentsWithAdvancedFilters(filters, parseInt(limit), parseInt(offset));
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching filtered incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

// Endpoint para obtener lista de centros
app.get('/api/centers', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let centers: { id: string; name: string; createdAt: Date | null; code: string; address: string | null; managerId: string | null; }[];
    if (user.role === 'admin') {
      centers = await storage.getAllCenters();
    } else if (user.role === 'manager' && user.centerId) {
  const userCenter = await storage.getCenter(user.centerId);
  centers = userCenter ? [userCenter] : [];
    } else {
      centers = [];
    }
    
    res.json(centers);
  } catch (error) {
    console.error("Error fetching centers:", error);
    res.status(500).json({ message: "Failed to fetch centers" });
  }
});

function getActionPlanStatusWithOverdue(
  requestedStatus: "pending" | "in_progress" | "completed", // CORREGIDO: Sin 'overdue'
  dueDate: Date,
  currentStatus: string
): "pending" | "in_progress" | "completed" | "overdue" {
  // Si se está marcando como completado, siempre permitir
  if (requestedStatus === 'completed') {
    return 'completed';
  }
  
  // Si ya está completado, no cambiar
  if (currentStatus === 'completed') {
    return 'completed';
  }
  
  // Verificar si está vencido
  const now = new Date();
  const isOverdue = now > dueDate;
  
  // Si está vencido y no completado, marcar como overdue
  if (isOverdue) {
    return 'overdue';
  }
  
  // En otros casos, usar el estado solicitado
  return requestedStatus;
}

// server/routes.ts - Agregar estas rutas al final del archivo, antes del return httpServer

app.get('/api/action-plans/assigned', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching action plans for user:', userId);
    
    // Verificar que el usuario existe
    if (!userId) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        details: 'No se encontró ID de usuario en la sesión'
      });
    }
    
    // Obtener planes donde el usuario es responsable o participante
    const assignedActionPlans = await storage.getActionPlansByUser(userId);
    
    console.log(`Found ${assignedActionPlans.length} action plans for user ${userId}`);
    
    res.json(assignedActionPlans);
  } catch (error) {
    console.error('Error fetching assigned action plans:', error);
    
    // Log más detallado del error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/action-plans/:id/status - Actualizar estado de plan de acción

app.put('/api/action-plans/:id/status', isAuthenticated, async (req: any, res) => {
  try {
    const planId = req.params.id;
    const userId = req.user.id;
    console.log(`User ${userId} updating action plan ${planId} status`);
    
    // Permitir solo transiciones válidas que el usuario puede hacer
    const updateSchema = z.object({
      status: z.enum(['pending', 'in_progress', 'completed']), // No permitir que el usuario establezca 'overdue' manualmente
      completedAt: z.string().optional()
    });

    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: validationResult.error.issues
      });
    }

    const { status, completedAt } = validationResult.data;

    // Verificar que el usuario puede actualizar este plan
    const actionPlan = await storage.getActionPlanById(planId);
    if (!actionPlan) {
      return res.status(404).json({ error: 'Plan de acción no encontrado' });
    }

    // Verificar permisos (responsable o participante)
    const hasPermission = actionPlan.assigneeId === userId || 
      (actionPlan.participants && actionPlan.participants.some((p: any) => p.userId === userId));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'No tienes permisos para actualizar este plan',
        userRole: actionPlan.assigneeId === userId ? 'assignee' : 'none'
      });
    }

    // Determinar el estado final considerando vencimientos
    const finalStatus = getActionPlanStatusWithOverdue(
      status, // Ahora coincide con el tipo
      new Date(actionPlan.dueDate),
      actionPlan.status
    );

    const updatedPlan = await storage.updateActionPlanStatus(planId, {
      status: finalStatus,
      completedAt: status === 'completed' ? new Date() : (completedAt ? new Date(completedAt) : null),
      updatedBy: userId
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating action plan status:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// GET /api/action-plans/:id - Obtener detalle de un plan de acción específico

// server/routes.ts - Agregar estas rutas después de las existentes

// ===== RUTAS MEJORADAS DE PLANES DE ACCIÓN =====

// GET /api/action-plans/:id - Obtener detalles completos de un plan de acción
app.get('/api/action-plans/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar que el usuario tiene acceso al plan (es responsable o participante)
    const actionPlan = await storage.getActionPlanWithDetails(id, userId);
    
    if (!actionPlan) {
      return res.status(404).json({ error: 'Plan de acción no encontrado o sin acceso' });
    }
    
    res.json(actionPlan);
  } catch (error) {
    console.error('Error fetching action plan details:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/action-plans/:id/tasks - Agregar tarea a plan de acción
app.post('/api/action-plans/:id/tasks', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, assigneeId } = req.body;
    const userId = req.user.id;
    
    // Verificar que el usuario es responsable del plan
    const isResponsible = await storage.isUserResponsibleForActionPlan(id, userId);
    if (!isResponsible) {
      return res.status(403).json({ error: 'Solo el responsable puede agregar tareas' });
    }
    
    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Título y fecha límite son requeridos' });
    }
    
    const task = await storage.addActionPlanTask({
      actionPlanId: id,
      title,
      description: description || '',
      dueDate: new Date(dueDate),
      assigneeId: assigneeId || userId,
      createdBy: userId
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error adding task to action plan:', error);
    res.status(500).json({ error: 'Error al agregar tarea' });
  }
});

// PATCH /api/action-plans/:id/tasks/:taskId - Actualizar tarea (marcar como completada)

app.patch('/api/action-plans/:id/tasks/:taskId', 
  isAuthenticated,
  upload.array('evidence', 5), // Máximo 5 archivos de evidencia
  async (req: any, res) => {
    try {
      const { id, taskId } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      
      const canComplete = await storage.canUserCompleteTask(taskId, userId);
      if (!canComplete) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar esta tarea' });
      }
      
      // Procesar archivos de evidencia subidos
      let evidenceFiles: string[] = [];
      if (req.files && req.files.length > 0) {
        evidenceFiles = req.files.map((file: any) => `/uploads/${file.filename}`);
        console.log('Archivos de evidencia procesados:', evidenceFiles);
      }
      
      const updatedTask = await storage.updateActionPlanTask(taskId, {
        status,
        completedAt: status === 'completed' ? new Date() : null,
        completedBy: status === 'completed' ? userId : null,
        evidence: evidenceFiles // Pasar los archivos procesados
      });
      
      await storage.updateActionPlanProgress(id);
      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Error al actualizar tarea' });
    }
  }
);

app.post('/api/action-plans/:id/comments', 
  isAuthenticated,
  upload.array('attachments', 5), // Máximo 5 archivos
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      
      console.log('💬 Adding comment to action plan:', id);
      console.log('📁 Attachments received:', req.files?.length || 0);
      
      const hasAccess = await storage.userHasAccessToActionPlan(id, userId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Sin acceso al plan de acción' });
      }
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'El contenido del comentario es requerido' });
      }
      
      // Procesar archivos adjuntos
      let attachments: string[] = [];
      if (req.files && req.files.length > 0) {
        try {
          attachments = processEvidenceFiles(req.files); // Reutilizar la misma función
          console.log('✅ Attachments processed:', attachments);
        } catch (error) {
          console.error('❌ Error processing attachments:', error);
          return res.status(500).json({ error: 'Error procesando archivos adjuntos' });
        }
      }
      
      const comment = await storage.addActionPlanComment({
        actionPlanId: id,
        content: content.trim(),
        authorId: userId,
        attachments
      });
      
      console.log('✅ Comment added successfully:', comment.id);
      res.status(201).json(comment);
      
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      res.status(500).json({ 
        error: 'Error al agregar comentario',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
// PATCH /api/action-plans/:id - Actualizar estado del plan de acción
app.patch('/api/action-plans/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    // Solo el responsable puede marcar el plan como completado
    const isResponsible = await storage.isUserResponsibleForActionPlan(id, userId);
    if (!isResponsible) {
      return res.status(403).json({ error: 'Solo el responsable puede completar el plan' });
    }
    
    // Verificar que todas las tareas estén completadas antes de completar el plan
    if (status === 'completed') {
      const allTasksCompleted = await storage.areAllTasksCompleted(id);
      if (!allTasksCompleted) {
        return res.status(400).json({ error: 'Todas las tareas deben estar completadas' });
      }
    }
    
    const updatedPlan = await storage.updateActionPlan(id, {
      status,
      completedAt: status === 'completed' ? new Date() : null,
      completedBy: status === 'completed' ? userId : null
    });
    
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating action plan:', error);
    res.status(500).json({ error: 'Error al actualizar plan de acción' });
  }
});

// GET /api/action-plans/:id/tasks - Obtener tareas de un plan específico
app.get('/api/action-plans/:id/tasks', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar acceso
    const hasAccess = await storage.userHasAccessToActionPlan(id, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso al plan de acción' });
    }
    
    const tasks = await storage.getActionPlanTasks(id);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching action plan tasks:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});


app.get('/api/action-plans/:id/comments', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar acceso
    const hasAccess = await storage.userHasAccessToActionPlan(id, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso al plan de acción' });
    }
    
    const comments = await storage.getActionPlanComments(id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching action plan comments:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// DELETE /api/action-plans/:id/tasks/:taskId - Eliminar tarea (solo responsable)
app.delete('/api/action-plans/:id/tasks/:taskId', isAuthenticated, async (req: any, res) => {
  try {
    const { id, taskId } = req.params;
    const userId = req.user.id;
    
    // Solo el responsable puede eliminar tareas
    const isResponsible = await storage.isUserResponsibleForActionPlan(id, userId);
    if (!isResponsible) {
      return res.status(403).json({ error: 'Solo el responsable puede eliminar tareas' });
    }
    
    await storage.deleteActionPlanTask(taskId);
    
    // Actualizar progreso del plan
    await storage.updateActionPlanProgress(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
});

// PATCH /api/action-plans/:id/tasks/:taskId/assign - Reasignar tarea
// Endpoint para estadísticas de tendencias
app.get('/api/dashboard/trends', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const trends = await storage.getTrendData();
    res.json(trends);
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({ message: "Failed to fetch trends" });
  }
});

// GET /api/incidents/:id/comments - Obtener comentarios de una incidencia
app.get('/api/incidents/:id/comments', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verificar acceso a la incidencia
    const hasAccess = await storage.userCanAccessIncidentComments(id, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso a los comentarios de esta incidencia' });
    }
    
    const comments = await storage.getIncidentComments(id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching incident comments:', error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// POST /api/incidents/:id/comments - Crear nuevo comentario

app.post('/api/incidents/:id/comments', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { text, content } = req.body;
    
    // Validar contenido
    const commentContent = text || content;
    if (!commentContent || commentContent.trim() === '') {
      return res.status(400).json({ error: 'El contenido del comentario es requerido' });
    }
    
    // Verificar acceso a la incidencia
    const hasAccess = await storage.userCanAccessIncidentComments(id, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso para comentar en esta incidencia' });
    }
    
    // Crear comentario
    const comment = await storage.createIncidentComment({
      incidentId: id,
      content: commentContent.trim(),
      authorId: userId,
    });
    
    // Registrar en el historial de la incidencia
    await storage.addIncidentHistory({
      incidentId: id,
      userId: userId,
      action: "comment_added",
      description: "Nuevo comentario agregado",
      metadata: { commentId: comment.id },
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating incident comment:', error);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});
// PUT /api/incidents/:incidentId/comments/:commentId - Actualizar comentario
app.put('/api/incidents/:incidentId/comments/:commentId', isAuthenticated, async (req: any, res) => {
  try {
    const { incidentId, commentId } = req.params;
    const userId = req.user.id;
    const { text, content } = req.body;
    
    // Validar contenido
    const commentContent = text || content;
    if (!commentContent || commentContent.trim() === '') {
      return res.status(400).json({ error: 'El contenido del comentario es requerido' });
    }
    
    // Verificar acceso a la incidencia
    const hasAccess = await storage.userCanAccessIncidentComments(incidentId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso para editar comentarios de esta incidencia' });
    }
    
    // Verificar que el usuario sea el autor del comentario o admin
    const comments = await storage.getIncidentComments(incidentId);
    const comment = comments.find(c => c.id === commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }
    
    const user = await storage.getUser(userId);
    if (comment.author.id !== userId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo puedes editar tus propios comentarios' });
    }
    
    // Actualizar comentario
    const updatedComment = await storage.updateIncidentComment(commentId, commentContent.trim());
    
    // Registrar en el historial
    await storage.addIncidentHistory({
      incidentId: incidentId,
      userId: userId,
      action: "comment_updated",
      description: "Comentario actualizado",
      metadata: { commentId: commentId },
    });
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Error updating incident comment:', error);
    res.status(500).json({ error: 'Error al actualizar comentario' });
  }
});

// DELETE /api/incidents/:incidentId/comments/:commentId - Eliminar comentario
app.delete('/api/incidents/:incidentId/comments/:commentId', isAuthenticated, async (req: any, res) => {
  try {
    const { incidentId, commentId } = req.params;
    const userId = req.user.id;
    
    // Verificar acceso a la incidencia
    const hasAccess = await storage.userCanAccessIncidentComments(incidentId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Sin acceso para eliminar comentarios de esta incidencia' });
    }
    
    // Verificar que el usuario sea el autor del comentario o admin
    const comments = await storage.getIncidentComments(incidentId);
    const comment = comments.find(c => c.id === commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }
    
    const user = await storage.getUser(userId);
    if (!comment.author || (comment.author.id !== userId && user?.role !== 'admin')) {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propios comentarios' });
    }
    
    // Eliminar comentario
    await storage.deleteIncidentComment(commentId);
    
    // Registrar en el historial
    await storage.addIncidentHistory({
      incidentId: incidentId,
      userId: userId,
      action: "comment_deleted",
      description: "Comentario eliminado",
      metadata: { commentId: commentId },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident comment:', error);
    res.status(500).json({ error: 'Error al eliminar comentario' });
  }
});



  const httpServer = createServer(app);
  return httpServer;
}


