import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin";
import Customer from "./models/Customer";
import ProductCase from "./models/ProductCase";
import InteractionHistory from "./models/InteractionHistory";
import Reminder from "./models/Reminder";
import Settings from "./models/Settings";
import QuickCase from "./models/QuickCase";
import { authenticateToken, requireSuperAdmin, generateToken, type AuthRequest } from "./middleware/auth";
import { isMongoDBAvailable } from "./db";
import { memoryStorage } from "./storage/memory-storage";
import * as notificationService from "./services/notification.service";

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
  // Check if phone number exists
  app.get("/api/customers/check-phone/:phone", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const phone = decodeURIComponent(req.params.phone);
      const existingCustomer = isMongoDBAvailable
        ? await Customer.findOne({ phone })
        : await memoryStorage.findCustomerByPhone(phone);
      
      res.json({ 
        exists: !!existingCustomer,
        customer: existingCustomer ? {
          name: existingCustomer.name,
          customerId: existingCustomer.customerId
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/customers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { q } = req.query;
      
      let customers;
      if (q && typeof q === 'string' && q.trim().length > 0) {
        // Search mode - only if query is not empty
        const searchQuery = q.trim();
        customers = isMongoDBAvailable
          ? await Customer.find({
              $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { phone: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { customerId: { $regex: searchQuery, $options: 'i' } },
                { address: { $regex: searchQuery, $options: 'i' } },
              ]
            }).sort({ createdAt: -1 })
          : await memoryStorage.searchCustomers(searchQuery);
      } else {
        // Get all customers
        customers = isMongoDBAvailable
          ? await Customer.find().sort({ createdAt: -1 })
          : await memoryStorage.findAllCustomers();
      }
      
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

      // Check for duplicate phone number
      const existingCustomer = isMongoDBAvailable
        ? await Customer.findOne({ phone })
        : await memoryStorage.findCustomerByPhone(phone);

      if (existingCustomer) {
        return res.status(400).json({ 
          message: `Phone number already exists for customer: ${existingCustomer.name} (${existingCustomer.customerId})` 
        });
      }

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

  app.patch("/api/customers/:id/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { notificationPreferences } = req.body;

      const customer = isMongoDBAvailable
        ? await Customer.findByIdAndUpdate(
            req.params.id,
            { notificationPreferences },
            { new: true }
          )
        : await memoryStorage.updateCustomer(req.params.id, { notificationPreferences });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({ success: true, customer });
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
  // Check if serial number exists
  app.get("/api/cases/check-serial/:serialNumber", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const serialNumber = decodeURIComponent(req.params.serialNumber);
      const existingCase = isMongoDBAvailable
        ? await ProductCase.findOne({ serialNumber })
        : await memoryStorage.findCaseBySerialNumber(serialNumber);
      
      res.json({ 
        exists: !!existingCase,
        case: existingCase ? {
          modelNumber: existingCase.modelNumber,
          serialNumber: existingCase.serialNumber
        } : null
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/cases", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { q } = req.query;
      
      let cases;
      if (q && typeof q === 'string' && q.trim().length > 0) {
        // Search mode - only if query is not empty
        const searchQuery = q.trim();
        cases = isMongoDBAvailable
          ? await ProductCase.find({
              $or: [
                { modelNumber: { $regex: searchQuery, $options: 'i' } },
                { serialNumber: { $regex: searchQuery, $options: 'i' } },
                { purchasePlace: { $regex: searchQuery, $options: 'i' } },
                { receiptNumber: { $regex: searchQuery, $options: 'i' } },
                { status: { $regex: searchQuery, $options: 'i' } },
                { paymentStatus: { $regex: searchQuery, $options: 'i' } },
                { repairNeeded: { $regex: searchQuery, $options: 'i' } },
                { initialSummary: { $regex: searchQuery, $options: 'i' } },
              ]
            }).sort({ createdAt: -1 })
          : await memoryStorage.searchCases(searchQuery);
      } else {
        // Get all cases
        cases = isMongoDBAvailable
          ? await ProductCase.find().sort({ createdAt: -1 })
          : await memoryStorage.findAllCases();
      }
      
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

      // Check for duplicate serial number
      const existingCase = isMongoDBAvailable
        ? await ProductCase.findOne({ serialNumber })
        : await memoryStorage.findCaseBySerialNumber(serialNumber);

      if (existingCase) {
        return res.status(400).json({ 
          message: `Serial number already exists for product: ${existingCase.modelNumber} (Case already registered)` 
        });
      }

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

      // Send email notification to customer about new case
      try {
        const customer = isMongoDBAvailable
          ? await Customer.findById(customerId)
          : await memoryStorage.findCustomerById(customerId);

        if (customer && customer.notificationPreferences?.email) {
          await notificationService.sendCaseCreatedEmail(
            customer.email,
            customer.name,
            modelNumber,
            serialNumber,
            status || 'New Case'
          );
        }
      } catch (emailError) {
        console.error('Failed to send case creation email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(productCase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Quick Case Creation - Only phone number and basic info required
  app.post("/api/cases/quick", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { phone, modelNumber, serialNumber, repairNeeded, initialSummary } = req.body;

      // Find or create customer by phone number
      let customer = isMongoDBAvailable
        ? await Customer.findOne({ phone })
        : await memoryStorage.findCustomerByPhone(phone);

      if (!customer) {
        // Create a MINIMAL pending customer profile with ONLY phone number
        // This is a placeholder until full customer info is provided
        if (isMongoDBAvailable) {
          customer = new Customer({
            name: `PENDING - ${phone}`, // Clear indicator this is incomplete
            phone,
            email: `pending+${phone}@temp.com`, // Temporary placeholder email
            address: "PENDING", // Clearly marked as pending
            customerId: `PENDING-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            createdBy: req.admin!._id,
          });
          await customer.save();
        } else {
          customer = await memoryStorage.createCustomer({
            name: `PENDING - ${phone}`,
            phone,
            email: `pending+${phone}@temp.com`,
            address: "PENDING",
            createdBy: req.admin!._id,
          });
        }
      }

      // Check for duplicate serial number if provided
      if (serialNumber) {
        const existingCase = isMongoDBAvailable
          ? await ProductCase.findOne({ serialNumber })
          : await memoryStorage.findCaseBySerialNumber(serialNumber);

        if (existingCase) {
          return res.status(400).json({ 
            message: `Serial number already exists for product: ${existingCase.modelNumber}` 
          });
        }
      }

      // Create case with minimal information
      let productCase;
      if (isMongoDBAvailable) {
        productCase = new ProductCase({
          customerId: customer._id,
          modelNumber,
          serialNumber: serialNumber || `PENDING-${Date.now()}`,
          purchasePlace: "To be provided",
          dateOfPurchase: new Date(),
          receiptNumber: "Pending",
          status: "New Case",
          repairNeeded: repairNeeded || "To be determined",
          paymentStatus: "Pending",
          shippingCost: 0,
          initialSummary: initialSummary || "Quick case - Information pending",
          createdBy: req.admin!._id,
        });
        await productCase.save();

        await InteractionHistory.create({
          caseId: productCase._id,
          customerId: customer._id,
          type: 'case_created',
          message: `Quick case created via phone number. ${initialSummary || 'Information pending'}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            modelNumber,
            serialNumber: serialNumber || 'Pending',
            quickCase: true,
          },
        });
      } else {
        productCase = await memoryStorage.createCase({
          customerId: customer._id,
          modelNumber,
          serialNumber: serialNumber || `PENDING-${Date.now()}`,
          purchasePlace: "To be provided",
          dateOfPurchase: new Date(),
          receiptNumber: "Pending",
          status: "New Case",
          repairNeeded: repairNeeded || "To be determined",
          paymentStatus: "Pending",
          shippingCost: 0,
          initialSummary: initialSummary || "Quick case - Information pending",
          createdBy: req.admin!._id,
        });

        await memoryStorage.createInteraction({
          caseId: productCase._id,
          customerId: customer._id,
          type: 'case_created',
          message: `Quick case created via phone number. ${initialSummary || 'Information pending'}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            modelNumber,
            serialNumber: serialNumber || 'Pending',
            quickCase: true,
          },
        });
      }

      res.status(201).json({ case: productCase, customer });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete Quick Case - Update both customer profile and case with full information
  app.patch("/api/cases/:id/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { customerInfo, caseInfo } = req.body;
      
      // Get the case
      const productCase = isMongoDBAvailable
        ? await ProductCase.findById(req.params.id)
        : await memoryStorage.findCaseById(req.params.id);

      if (!productCase) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Get the customer
      let customer = isMongoDBAvailable
        ? await Customer.findById(productCase.customerId)
        : await memoryStorage.findCustomerById(productCase.customerId);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Update customer with full information
      if (customerInfo) {
        if (isMongoDBAvailable) {
          await Customer.findByIdAndUpdate(customer._id, {
            name: customerInfo.name,
            email: customerInfo.email,
            address: customerInfo.address,
            customerId: customerInfo.customerId || customer.customerId.replace('PENDING-', 'CUST-'),
          });
          customer = await Customer.findById(customer._id);
        } else {
          await memoryStorage.updateCustomer(customer._id, {
            name: customerInfo.name,
            email: customerInfo.email,
            address: customerInfo.address,
            customerId: customerInfo.customerId || customer.customerId.replace('PENDING-', 'CUST-'),
          });
          customer = await memoryStorage.findCustomerById(customer._id);
        }
      }

      // Update case with full information
      if (caseInfo) {
        if (isMongoDBAvailable) {
          await ProductCase.findByIdAndUpdate(req.params.id, caseInfo);
        } else {
          await memoryStorage.updateCase(req.params.id, caseInfo);
        }
      }

      // Create interaction history
      const updatedCase = isMongoDBAvailable
        ? await ProductCase.findById(req.params.id)
        : await memoryStorage.findCaseById(req.params.id);

      if (isMongoDBAvailable) {
        await InteractionHistory.create({
          caseId: req.params.id,
          customerId: customer._id,
          type: 'case_updated',
          message: 'Quick case completed with full customer and case information',
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });
      } else {
        await memoryStorage.createInteraction({
          caseId: req.params.id,
          customerId: customer._id,
          type: 'case_updated',
          message: 'Quick case completed with full customer and case information',
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
        });
      }

      res.json({ case: updatedCase, customer });
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

        // Send notification to customer about status change
        try {
          const customer = isMongoDBAvailable
            ? await Customer.findById(existingCase.customerId)
            : await memoryStorage.findCustomerById(existingCase.customerId);

          if (customer && productCase) {
            const notificationResults = await notificationService.sendCaseStatusNotification(
              customer,
              productCase,
              oldStatus,
              req.body.status
            );
            
            console.log('Notification results:', notificationResults);
          }
        } catch (notificationError: any) {
          console.error('Failed to send notification:', notificationError.message);
          // Don't fail the request if notification fails
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

  // ===== QUICK CASE ROUTES =====
  // Create a Quick Case (only phone number and optional notes)
  app.post("/api/quick-cases", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { phone, notes } = req.body;

      if (!phone || phone.length < 10 || phone.length > 15) {
        return res.status(400).json({ message: "Phone number must be between 10 and 15 digits" });
      }

      if (isMongoDBAvailable) {
        const quickCase = new QuickCase({
          phone,
          notes: notes || '',
          status: 'incomplete',
          createdBy: req.admin!._id,
          createdByName: req.admin!.name,
        });
        await quickCase.save();
        res.status(201).json(quickCase);
      } else {
        // Memory storage for Quick Cases
        const quickCase = await memoryStorage.createQuickCase({
          phone,
          notes: notes || '',
          createdBy: req.admin!._id,
          createdByName: req.admin!.name,
        });
        res.status(201).json(quickCase);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all incomplete Quick Cases
  app.get("/api/quick-cases", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quickCases = isMongoDBAvailable
        ? await QuickCase.find({ status: 'incomplete' }).sort({ createdAt: -1 })
        : await memoryStorage.getQuickCases();

      res.json(quickCases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a single Quick Case by ID
  app.get("/api/quick-cases/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const quickCase = isMongoDBAvailable
        ? await QuickCase.findById(req.params.id)
        : await memoryStorage.findQuickCaseById(req.params.id);

      if (!quickCase) {
        return res.status(404).json({ message: "Quick Case not found" });
      }

      res.json(quickCase);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Complete a Quick Case - Create customer and regular case
  app.post("/api/quick-cases/:id/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { customerInfo, caseInfo } = req.body;
      
      // Get the Quick Case
      const quickCase = isMongoDBAvailable
        ? await QuickCase.findById(req.params.id)
        : await memoryStorage.findQuickCaseById(req.params.id);

      if (!quickCase) {
        return res.status(404).json({ message: "Quick Case not found" });
      }

      if (quickCase.status === 'completed') {
        return res.status(400).json({ message: "This Quick Case has already been completed" });
      }

      // Check if customer already exists with this phone
      let customer = isMongoDBAvailable
        ? await Customer.findOne({ phone: quickCase.phone })
        : await memoryStorage.findCustomerByPhone(quickCase.phone);

      if (!customer) {
        // Create new customer
        if (isMongoDBAvailable) {
          customer = new Customer({
            name: customerInfo.name,
            phone: quickCase.phone,
            email: customerInfo.email,
            address: customerInfo.address,
            customerId: `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            createdBy: req.admin!._id,
            notificationPreferences: {
              email: true,
              sms: false,
            },
          });
          await customer.save();
        } else {
          customer = await memoryStorage.createCustomer({
            name: customerInfo.name,
            phone: quickCase.phone,
            email: customerInfo.email,
            address: customerInfo.address,
            createdBy: req.admin!._id,
          });
        }
      }

      // Check for duplicate serial number if provided
      if (caseInfo.serialNumber) {
        const existingCase = isMongoDBAvailable
          ? await ProductCase.findOne({ serialNumber: caseInfo.serialNumber })
          : await memoryStorage.findCaseBySerialNumber(caseInfo.serialNumber);

        if (existingCase) {
          return res.status(400).json({ 
            message: `Serial number already exists for product: ${existingCase.modelNumber}` 
          });
        }
      }

      // Create the regular case
      let productCase;
      if (isMongoDBAvailable) {
        productCase = new ProductCase({
          customerId: customer._id,
          modelNumber: caseInfo.modelNumber,
          serialNumber: caseInfo.serialNumber,
          purchasePlace: caseInfo.purchasePlace,
          dateOfPurchase: caseInfo.dateOfPurchase ? new Date(caseInfo.dateOfPurchase) : new Date(),
          receiptNumber: caseInfo.receiptNumber || 'N/A',
          status: caseInfo.status || 'New Case',
          repairNeeded: caseInfo.repairNeeded || 'To be determined',
          paymentStatus: caseInfo.paymentStatus || 'Pending',
          shippingCost: caseInfo.shippingCost || 0,
          initialSummary: caseInfo.initialSummary || quickCase.notes || 'Completed from Quick Case',
          createdBy: req.admin!._id,
        });
        await productCase.save();

        // Create interaction history
        await InteractionHistory.create({
          caseId: productCase._id,
          customerId: customer._id,
          type: 'case_created',
          message: `Case created from Quick Case. Original notes: ${quickCase.notes || 'None'}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            quickCaseId: quickCase._id,
            completedFrom: 'quick_case',
          },
        });

        // Mark Quick Case as completed
        await QuickCase.findByIdAndUpdate(req.params.id, { status: 'completed' });
      } else {
        productCase = await memoryStorage.createCase({
          customerId: customer._id,
          modelNumber: caseInfo.modelNumber,
          serialNumber: caseInfo.serialNumber,
          purchasePlace: caseInfo.purchasePlace,
          dateOfPurchase: caseInfo.dateOfPurchase ? new Date(caseInfo.dateOfPurchase) : new Date(),
          receiptNumber: caseInfo.receiptNumber || 'N/A',
          status: caseInfo.status || 'New Case',
          repairNeeded: caseInfo.repairNeeded || 'To be determined',
          paymentStatus: caseInfo.paymentStatus || 'Pending',
          shippingCost: caseInfo.shippingCost || 0,
          initialSummary: caseInfo.initialSummary || quickCase.notes || 'Completed from Quick Case',
          createdBy: req.admin!._id,
        });

        await memoryStorage.createInteraction({
          caseId: productCase._id,
          customerId: customer._id,
          type: 'case_created',
          message: `Case created from Quick Case. Original notes: ${quickCase.notes || 'None'}`,
          adminId: req.admin!._id,
          adminName: req.admin!.name,
          adminAvatar: req.admin!.avatar,
          adminRole: req.admin!.role,
          metadata: {
            quickCaseId: quickCase._id,
            completedFrom: 'quick_case',
          },
        });

        await memoryStorage.updateQuickCase(req.params.id, { status: 'completed' });
      }

      // Send email notification to customer if enabled
      try {
        if (customer.notificationPreferences?.email) {
          await notificationService.sendCaseCreatedEmail(
            customer.email,
            customer.name,
            productCase.modelNumber,
            productCase.serialNumber,
            productCase.status
          );
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      res.status(201).json({ case: productCase, customer, quickCase });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a Quick Case
  app.delete("/api/quick-cases/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (isMongoDBAvailable) {
        const result = await QuickCase.findByIdAndDelete(req.params.id);
        if (!result) {
          return res.status(404).json({ message: "Quick Case not found" });
        }
      } else {
        await memoryStorage.deleteQuickCase(req.params.id);
      }

      res.json({ success: true, message: "Quick Case deleted successfully" });
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

  // ===== REPORTS AND STATISTICS ROUTES =====
  app.get("/api/reports/statistics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cases = isMongoDBAvailable
        ? await ProductCase.find()
        : await memoryStorage.findAllCases();

      const customers = isMongoDBAvailable
        ? await Customer.find()
        : await memoryStorage.findAllCustomers();

      // Calculate statistics
      const now = new Date();

      // Total counts
      const totalCases = cases.length;
      const totalCustomers = customers.length;
      const openCases = cases.filter(c => 
        c.status !== 'Closed' && c.status !== 'Shipped to Customer'
      ).length;
      const closedCases = cases.filter(c => c.status === 'Closed').length;

      // Cases by store
      const casesByStore: Record<string, number> = {};
      cases.forEach(c => {
        casesByStore[c.purchasePlace] = (casesByStore[c.purchasePlace] || 0) + 1;
      });

      // Cases by product/model
      const casesByProduct: Record<string, number> = {};
      cases.forEach(c => {
        casesByProduct[c.modelNumber] = (casesByProduct[c.modelNumber] || 0) + 1;
      });

      // Common issues (top repair needs)
      const issueFrequency: Record<string, number> = {};
      cases.forEach(c => {
        if (c.repairNeeded) {
          const issue = c.repairNeeded.toLowerCase().trim();
          issueFrequency[issue] = (issueFrequency[issue] || 0) + 1;
        }
      });

      // Cases by status
      const casesByStatus: Record<string, number> = {
        'New Case': 0,
        'In Progress': 0,
        'Awaiting Parts': 0,
        'Repair Completed': 0,
        'Shipped to Customer': 0,
        'Closed': 0,
      };
      cases.forEach(c => {
        casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
      });

      // Cases by payment status
      const casesByPaymentStatus: Record<string, number> = {
        'Pending': 0,
        'Paid by Customer': 0,
        'Under Warranty': 0,
        'Company Covered': 0,
      };
      cases.forEach(c => {
        casesByPaymentStatus[c.paymentStatus] = (casesByPaymentStatus[c.paymentStatus] || 0) + 1;
      });

      // Average resolution time (for closed cases)
      const closedCasesWithTime = cases.filter(c => c.status === 'Closed');
      let avgResolutionTime = 0;
      if (closedCasesWithTime.length > 0) {
        const totalTime = closedCasesWithTime.reduce((sum, c) => {
          const created = new Date(c.createdAt).getTime();
          const updated = new Date(c.updatedAt).getTime();
          return sum + (updated - created);
        }, 0);
        avgResolutionTime = totalTime / closedCasesWithTime.length / (1000 * 60 * 60 * 24); // Convert to days
      }

      // Cases trend (last 30 days)
      const last30Days: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const count = cases.filter(c => {
          const caseDate = new Date(c.createdAt).toISOString().split('T')[0];
          return caseDate === dateStr;
        }).length;
        
        last30Days.push({ date: dateStr, count });
      }

      // Monthly revenue (shipping costs)
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyRevenue = cases
        .filter(c => {
          const caseDate = new Date(c.createdAt);
          return caseDate.getMonth() === currentMonth && caseDate.getFullYear() === currentYear;
        })
        .reduce((sum, c) => sum + (c.shippingCost || 0), 0);

      // Top 10 stores by case count
      const topStores = Object.entries(casesByStore)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Top 10 products by case count
      const topProducts = Object.entries(casesByProduct)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Top 10 common issues
      const topIssues = Object.entries(issueFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([issue, count]) => ({ issue, count }));

      res.json({
        summary: {
          totalCases,
          totalCustomers,
          openCases,
          closedCases,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
          monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        },
        casesByStatus,
        casesByPaymentStatus,
        topStores,
        topProducts,
        topIssues,
        caseTrend: last30Days,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== REMINDER ROUTES =====
  
  // Get all reminders for current admin (assigned to them or created by them)
  app.get("/api/reminders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const adminId = req.admin!._id.toString();
      
      let reminders;
      if (isMongoDBAvailable) {
        reminders = await Reminder.find({
          $or: [
            { assignedTo: adminId },
            { assignedBy: adminId }
          ]
        }).sort({ createdAt: -1 });
      } else {
        const allReminders = await memoryStorage.findAllReminders();
        reminders = allReminders.filter((r: any) => 
          r.assignedTo.includes(adminId) || r.assignedBy === adminId
        );
      }

      res.json(reminders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get unread reminder count for badge (dual notification system)
  app.get("/api/reminders/unread-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const adminId = req.admin!._id.toString();
      
      let count = 0;
      
      if (isMongoDBAvailable) {
        // Count reminders assigned to this admin that they haven't read
        const unreadAssigned = await Reminder.countDocuments({
          assignedTo: adminId,
          isReadByAssignees: { $ne: adminId }
        });
        
        // Count reminders created by this admin with unread updates from assignees
        const unreadUpdates = await Reminder.countDocuments({
          assignedBy: adminId,
          hasUnreadUpdate: true
        });
        
        count = unreadAssigned + unreadUpdates;
      } else {
        const allReminders = await memoryStorage.findAllReminders();
        
        // Count unread assigned reminders
        const unreadAssigned = allReminders.filter((r: any) => 
          r.assignedTo.includes(adminId) && !(r.isReadByAssignees || []).includes(adminId)
        ).length;
        
        // Count reminders with updates for creator
        const unreadUpdates = allReminders.filter((r: any) =>
          r.assignedBy === adminId && r.hasUnreadUpdate === true
        ).length;
        
        count = unreadAssigned + unreadUpdates;
      }

      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a reminder (superadmin only)
  app.post("/api/reminders", authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { title, description, priority, assignedTo, dueDate, relatedCaseId } = req.body;
      const currentAdmin = req.admin!;

      // Get the assigned admins' names (Sub Admins only)
      const assignedToNames: string[] = [];
      for (const adminId of assignedTo) {
        const admin = isMongoDBAvailable
          ? await Admin.findById(adminId)
          : await memoryStorage.findAdminById(adminId);
        
        if (admin) {
          assignedToNames.push(admin.name);
        }
      }

      const reminderData = {
        title,
        description,
        priority: priority || "Medium",
        status: "Pending",
        assignedTo,
        assignedToNames,
        assignedBy: currentAdmin._id.toString(),
        assignedByName: currentAdmin.name,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        relatedCaseId: relatedCaseId || undefined,
        isReadByAssignees: [],
        hasUnreadUpdate: false,
      };

      const reminder = isMongoDBAvailable
        ? await Reminder.create(reminderData)
        : await memoryStorage.createReminder(reminderData);

      res.status(201).json(reminder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update a reminder (status, mark as read, etc.)
  app.patch("/api/reminders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const currentAdmin = req.admin!;

      // If marking as read by assignee (Sub Admin viewed reminder)
      if (updates.markAsReadByAssignee === true) {
        if (isMongoDBAvailable) {
          const reminder = await Reminder.findById(id);
          if (reminder) {
            const adminIdObj = currentAdmin._id as any;
            if (!reminder.isReadByAssignees.some(id => id.toString() === adminIdObj.toString())) {
              reminder.isReadByAssignees.push(adminIdObj);
              await reminder.save();
            }
          }
          return res.json(reminder);
        } else {
          const reminder = await memoryStorage.findReminderById(id);
          if (reminder) {
            const isReadByAssignees = reminder.isReadByAssignees || [];
            if (!isReadByAssignees.includes(currentAdmin._id.toString())) {
              isReadByAssignees.push(currentAdmin._id.toString());
              await memoryStorage.updateReminder(id, { isReadByAssignees });
            }
            return res.json(reminder);
          }
        }
      }

      // If marking update as seen by Super Admin (creator viewed status update)
      if (updates.markUpdateAsSeen === true) {
        if (isMongoDBAvailable) {
          const reminder = await Reminder.findById(id);
          if (reminder && reminder.assignedBy.toString() === currentAdmin._id.toString()) {
            reminder.hasUnreadUpdate = false;
            await reminder.save();
          }
          return res.json(reminder);
        } else {
          const reminder = await memoryStorage.findReminderById(id);
          if (reminder && reminder.assignedBy === currentAdmin._id.toString()) {
            await memoryStorage.updateReminder(id, { hasUnreadUpdate: false });
          }
          return res.json(reminder);
        }
      }

      // If status is being updated by a Sub Admin, notify the Super Admin creator
      if (updates.status) {
        if (isMongoDBAvailable) {
          const reminder = await Reminder.findById(id);
          if (reminder) {
            const isAssignee = reminder.assignedTo.some(id => id.toString() === currentAdmin._id.toString());
            const isCreator = reminder.assignedBy.toString() === currentAdmin._id.toString();
            
            // If a Sub Admin assignee is updating (not the creator), mark as unread update for Super Admin
            if (isAssignee && !isCreator) {
              updates.hasUnreadUpdate = true;
              updates.lastUpdatedBy = currentAdmin._id;
            }
          }
        } else {
          const reminder = await memoryStorage.findReminderById(id);
          if (reminder) {
            const isAssignee = reminder.assignedTo.includes(currentAdmin._id.toString());
            const isCreator = reminder.assignedBy === currentAdmin._id.toString();
            
            if (isAssignee && !isCreator) {
              updates.hasUnreadUpdate = true;
              updates.lastUpdatedBy = currentAdmin._id.toString();
            }
          }
        }
      }

      // If dueDate is provided, convert to Date
      if (updates.dueDate) {
        updates.dueDate = new Date(updates.dueDate);
      }

      const reminder = isMongoDBAvailable
        ? await Reminder.findByIdAndUpdate(id, updates, { new: true })
        : await memoryStorage.updateReminder(id, updates);

      if (!reminder) {
        return res.status(404).json({ message: "Reminder not found" });
      }

      res.json(reminder);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a reminder (superadmin only, must be creator)
  app.delete("/api/reminders/:id", authenticateToken, requireSuperAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      if (isMongoDBAvailable) {
        const reminder = await Reminder.findByIdAndDelete(id);
        if (!reminder) {
          return res.status(404).json({ message: "Reminder not found" });
        }
      } else {
        const deleted = await memoryStorage.deleteReminder(id);
        if (!deleted) {
          return res.status(404).json({ message: "Reminder not found" });
        }
      }

      res.json({ message: "Reminder deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SETTINGS ROUTES =====
  
  // Get settings for current user (or global if superadmin)
  app.get("/api/settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const currentAdmin = req.admin!;
      const userId = currentAdmin.role === "superadmin" ? undefined : currentAdmin._id.toString();
      
      let settings;
      if (isMongoDBAvailable) {
        settings = await Settings.findOne({ userId: userId || { $exists: false } });
        
        // Create default settings if none exist
        if (!settings) {
          settings = await Settings.create({ userId });
        }
      } else {
        settings = await memoryStorage.findSettings(userId);
        
        // Create default settings if none exist
        if (!settings) {
          settings = await memoryStorage.createSettings({ userId });
        }
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update settings (superadmin can update global, users update their own)
  app.patch("/api/settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const currentAdmin = req.admin!;
      const updates = req.body;
      const userId = currentAdmin.role === "superadmin" ? undefined : currentAdmin._id.toString();
      
      let settings;
      if (isMongoDBAvailable) {
        settings = await Settings.findOne({ userId: userId || { $exists: false } });
        
        if (!settings) {
          // Create new settings with updates
          settings = await Settings.create({ userId, ...updates });
        } else {
          // Update existing settings using deep merge
          if (updates.notifications) {
            settings.notifications = { ...settings.notifications, ...updates.notifications };
          }
          if (updates.remindersConfig) {
            settings.remindersConfig = { ...settings.remindersConfig, ...updates.remindersConfig };
          }
          if (updates.exportSettings) {
            settings.exportSettings = { ...settings.exportSettings, ...updates.exportSettings };
          }
          if (updates.defaultViews) {
            settings.defaultViews = { ...settings.defaultViews, ...updates.defaultViews };
          }
          if (updates.autoStatusRules) {
            settings.autoStatusRules = { ...settings.autoStatusRules, ...updates.autoStatusRules };
          }
          if (updates.preferences) {
            settings.preferences = { ...settings.preferences, ...updates.preferences };
          }
          
          await settings.save();
        }
      } else {
        settings = await memoryStorage.findSettings(userId);
        
        if (!settings) {
          settings = await memoryStorage.createSettings({ userId, ...updates });
        } else {
          settings = await memoryStorage.updateSettings(settings._id, updates);
        }
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reset settings to defaults
  app.post("/api/settings/reset", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const currentAdmin = req.admin!;
      const userId = currentAdmin.role === "superadmin" ? undefined : currentAdmin._id.toString();
      
      const defaultSettings = {
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          inactivityAlertsEnabled: true,
          inactivityThresholdDays: 7,
        },
        remindersConfig: {
          autoRemindersEnabled: true,
          defaultReminderInterval: "weekly",
        },
        exportSettings: {
          defaultFormat: "excel",
          includeFilters: true,
        },
        defaultViews: {
          dashboardFilter: "open",
          defaultColumns: ["customerName", "status", "assignedTo", "createdAt"],
        },
        autoStatusRules: {
          enabled: false,
          inactivityDays: 14,
          targetStatus: "Pending Follow-Up",
        },
        preferences: {
          timezone: "UTC",
          language: "en",
          dateFormat: "DD/MM/YYYY",
        },
      };
      
      let settings;
      if (isMongoDBAvailable) {
        settings = await Settings.findOneAndUpdate(
          { userId: userId || { $exists: false } },
          defaultSettings,
          { new: true, upsert: true }
        );
      } else {
        const existing = await memoryStorage.findSettings(userId);
        if (existing) {
          settings = await memoryStorage.updateSettings(existing._id, defaultSettings);
        } else {
          settings = await memoryStorage.createSettings({ userId, ...defaultSettings });
        }
      }

      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
