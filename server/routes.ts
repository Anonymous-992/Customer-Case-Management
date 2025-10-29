import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin";
import Customer from "./models/Customer";
import ProductCase from "./models/ProductCase";
import InteractionHistory from "./models/InteractionHistory";
import { authenticateToken, requireSuperAdmin, generateToken, type AuthRequest } from "./middleware/auth";
import { isMongoDBAvailable } from "./db";
import { memoryStorage } from "./storage/memory-storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== AUTH ROUTES =====
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const admin = isMongoDBAvailable 
        ? await Admin.findOne({ username })
        : await memoryStorage.findAdminByUsername(username);

      if (!admin) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = generateToken(admin._id.toString());

      res.json({
        success: true,
        token,
        admin: {
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatar: admin.avatar,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch("/api/auth/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, password, avatar } = req.body;
      const updates: any = {};

      if (name) updates.name = name;
      if (avatar !== undefined) updates.avatar = avatar;
      if (password) {
        updates.password = await bcrypt.hash(password, 10);
      }

      const admin = isMongoDBAvailable
        ? await Admin.findByIdAndUpdate(req.admin!._id, updates, { new: true }).select('-password')
        : await memoryStorage.updateAdmin(req.admin!._id, updates);

      res.json({
        success: true,
        admin: {
          _id: admin!._id,
          username: admin!.username,
          email: admin!.email,
          name: admin!.name,
          role: admin!.role,
          avatar: admin!.avatar,
          createdAt: admin!.createdAt,
          updatedAt: admin!.updatedAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ===== ADMIN ROUTES =====
  app.get("/api/admins", authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const admins = isMongoDBAvailable
        ? await Admin.find().select('-password').sort({ createdAt: -1 })
        : (await memoryStorage.findAdminsByRole()).map(a => ({ ...a, password: undefined }));
      
      res.json(admins);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admins", authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { username, email, password, name, role, avatar } = req.body;

      if (isMongoDBAvailable) {
        const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
        if (existingAdmin) {
          return res.status(400).json({ message: "Username or email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new Admin({
          username,
          email,
          password: hashedPassword,
          name,
          role: role || 'subadmin',
          avatar,
        });

        await admin.save();

        res.status(201).json({
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatar: admin.avatar,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        });
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await memoryStorage.createAdmin({
          username,
          email,
          password: hashedPassword,
          name,
          role: role || 'subadmin',
          avatar,
        });

        res.status(201).json({
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          avatar: admin.avatar,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admins/:id", authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const admin = isMongoDBAvailable
        ? await Admin.findById(req.params.id)
        : await memoryStorage.findAdminById(req.params.id);

      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      if (admin.role === 'superadmin') {
        return res.status(403).json({ message: "Cannot delete super admin" });
      }

      if (isMongoDBAvailable) {
        await Admin.findByIdAndDelete(req.params.id);
      } else {
        await memoryStorage.deleteAdmin(req.params.id);
      }

      res.json({ success: true, message: "Admin deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CUSTOMER ROUTES =====
  app.get("/api/customers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const customers = isMongoDBAvailable
        ? await Customer.find().sort({ createdAt: -1 })
        : await memoryStorage.findAllCustomers();
      
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const customer = isMongoDBAvailable
        ? await Customer.findById(req.params.id)
        : await memoryStorage.findCustomerById(req.params.id);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const cases = isMongoDBAvailable
        ? await ProductCase.find({ customerId: req.params.id }).sort({ createdAt: -1 })
        : await memoryStorage.findCasesByCustomerId(req.params.id);

      res.json({
        ...(isMongoDBAvailable ? customer.toObject() : customer),
        cases,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/customers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, phone, address, email } = req.body;

      let customer;
      if (isMongoDBAvailable) {
        const count = await Customer.countDocuments();
        const customerId = `CUST-${String(count + 1001).padStart(4, '0')}`;

        customer = new Customer({
          customerId,
          name,
          phone,
          address,
          email,
          createdBy: req.admin!._id,
        });

        await customer.save();

        await InteractionHistory.create({
          customerId: customer._id,
          type: 'customer_created',
          message: `Customer profile created: ${name}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });
      } else {
        customer = await memoryStorage.createCustomer({
          name,
          phone,
          address,
          email,
          createdBy: req.admin!._id,
        });

        await memoryStorage.createInteraction({
          customerId: customer._id,
          type: 'customer_created',
          message: `Customer profile created: ${name}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });
      }

      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/customers/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const customer = isMongoDBAvailable
        ? await Customer.findById(req.params.id)
        : await memoryStorage.findCustomerById(req.params.id);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (isMongoDBAvailable) {
        await ProductCase.deleteMany({ customerId: req.params.id });
        
        await InteractionHistory.create({
          customerId: req.params.id,
          type: 'customer_deleted',
          message: `Customer deleted: ${customer.name} (${customer.customerId})`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });

        await Customer.findByIdAndDelete(req.params.id);
      } else {
        await memoryStorage.createInteraction({
          customerId: req.params.id,
          type: 'customer_deleted',
          message: `Customer deleted: ${customer.name} (${customer.customerId})`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });

        await memoryStorage.deleteCustomer(req.params.id);
      }

      res.json({ success: true, message: "Customer and all related cases deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PRODUCT CASE ROUTES =====
  app.get("/api/cases", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cases = isMongoDBAvailable
        ? await ProductCase.find().sort({ createdAt: -1 })
        : await memoryStorage.findAllCases();
      
      res.json(cases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cases/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productCase = isMongoDBAvailable
        ? await ProductCase.findById(req.params.id)
        : await memoryStorage.findCaseById(req.params.id);

      if (!productCase) {
        return res.status(404).json({ message: "Case not found" });
      }

      const customer = isMongoDBAvailable
        ? await Customer.findById(productCase.customerId)
        : await memoryStorage.findCustomerById(productCase.customerId);

      const history = isMongoDBAvailable
        ? await InteractionHistory.find({ caseId: req.params.id }).sort({ createdAt: -1 })
        : await memoryStorage.findInteractionsByCaseId(req.params.id);

      res.json({
        ...(isMongoDBAvailable ? productCase.toObject() : productCase),
        customer,
        history,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cases", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const {
        customerId,
        modelNumber,
        serialNumber,
        purchasePlace,
        dateOfPurchase,
        receiptNumber,
        status,
        repairNeeded,
        paymentStatus,
        shippingCost,
        shippedDate,
        receivedDate,
        initialSummary,
      } = req.body;

      let productCase;
      if (isMongoDBAvailable) {
        productCase = new ProductCase({
          customerId,
          modelNumber,
          serialNumber,
          purchasePlace,
          dateOfPurchase: new Date(dateOfPurchase),
          receiptNumber,
          status: status || 'New Case',
          repairNeeded,
          paymentStatus: paymentStatus || 'Pending',
          shippingCost: shippingCost || 0,
          shippedDate: shippedDate ? new Date(shippedDate) : undefined,
          receivedDate: receivedDate ? new Date(receivedDate) : undefined,
          initialSummary,
          createdBy: req.admin!._id,
        });

        await productCase.save();

        await InteractionHistory.create({
          caseId: productCase._id,
          customerId,
          type: 'case_created',
          message: `Case created. ${initialSummary}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            modelNumber,
            serialNumber,
            status,
          },
        });
      } else {
        productCase = await memoryStorage.createCase({
          customerId,
          modelNumber,
          serialNumber,
          purchasePlace,
          dateOfPurchase: new Date(dateOfPurchase),
          receiptNumber,
          status: status || 'New Case',
          repairNeeded,
          paymentStatus: paymentStatus || 'Pending',
          shippingCost: shippingCost || 0,
          shippedDate: shippedDate ? new Date(shippedDate) : undefined,
          receivedDate: receivedDate ? new Date(receivedDate) : undefined,
          initialSummary,
          createdBy: req.admin!._id,
        });

        await memoryStorage.createInteraction({
          caseId: productCase._id,
          customerId,
          type: 'case_created',
          message: `Case created. ${initialSummary}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            modelNumber,
            serialNumber,
            status,
          },
        });
      }

      res.status(201).json(productCase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/cases/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const existingCase = isMongoDBAvailable
        ? await ProductCase.findById(req.params.id)
        : await memoryStorage.findCaseById(req.params.id);

      if (!existingCase) {
        return res.status(404).json({ message: "Case not found" });
      }

      const oldStatus = existingCase.status;
      const updates: any = {};
      
      if (req.body.status) updates.status = req.body.status;
      if (req.body.paymentStatus) updates.paymentStatus = req.body.paymentStatus;
      if (req.body.shippingCost !== undefined) updates.shippingCost = req.body.shippingCost;
      if (req.body.shippedDate) updates.shippedDate = new Date(req.body.shippedDate);
      if (req.body.receivedDate) updates.receivedDate = new Date(req.body.receivedDate);

      const productCase = isMongoDBAvailable
        ? await ProductCase.findByIdAndUpdate(req.params.id, updates, { new: true })
        : await memoryStorage.updateCase(req.params.id, updates);

      if (req.body.status && req.body.status !== oldStatus) {
        const interactionData = {
          caseId: req.params.id,
          customerId: existingCase.customerId,
          type: 'status_changed' as const,
          message: `Status changed from "${oldStatus}" to "${req.body.status}"`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            oldStatus,
            newStatus: req.body.status,
          },
        };

        if (isMongoDBAvailable) {
          await InteractionHistory.create(interactionData);
        } else {
          await memoryStorage.createInteraction(interactionData);
        }
      } else {
        const interactionData = {
          caseId: req.params.id,
          customerId: existingCase.customerId,
          type: 'case_updated' as const,
          message: `Case information updated`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        };

        if (isMongoDBAvailable) {
          await InteractionHistory.create(interactionData);
        } else {
          await memoryStorage.createInteraction(interactionData);
        }
      }

      res.json(productCase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/cases/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const productCase = isMongoDBAvailable
        ? await ProductCase.findById(req.params.id)
        : await memoryStorage.findCaseById(req.params.id);

      if (!productCase) {
        return res.status(404).json({ message: "Case not found" });
      }

      const interactionData = {
        caseId: req.params.id,
        customerId: productCase.customerId,
        type: 'case_deleted' as const,
        message: `Case deleted: ${productCase.modelNumber} (S/N: ${productCase.serialNumber})`,
        adminId: req.admin!._id,
        adminName: req.admin!.name,
        adminAvatar: req.admin!.avatar,
        adminRole: req.admin!.role,
      };

      if (isMongoDBAvailable) {
        await InteractionHistory.create(interactionData);
        await ProductCase.findByIdAndDelete(req.params.id);
      } else {
        await memoryStorage.createInteraction(interactionData);
        await memoryStorage.deleteCase(req.params.id);
      }

      res.json({ success: true, message: "Case deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== INTERACTION HISTORY ROUTES =====
  app.post("/api/interactions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { caseId, customerId, type, message, metadata } = req.body;

      const interactionData = {
        caseId,
        customerId,
        type: type || 'note_added',
        message,
        adminId: req.admin!._id,
        adminName: req.admin!.name,
        adminAvatar: req.admin!.avatar,
        adminRole: req.admin!.role,
        metadata,
      };

      const interaction = isMongoDBAvailable
        ? await InteractionHistory.create(interactionData)
        : await memoryStorage.createInteraction(interactionData);

      res.status(201).json(interaction);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
