import bcrypt from 'bcryptjs';

// In-memory storage for when MongoDB is not available
class MemoryStorage {
  private admins: Map<string, any> = new Map();
  private customers: Map<string, any> = new Map();
  private cases: Map<string, any> = new Map();
  private interactions: Map<string, any> = new Map();
  private customerIdCounter = 1001;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Create super admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const superAdmin = {
      _id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Super Administrator',
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.admins.set(superAdmin._id, superAdmin);
  }

  // Admin methods
  async findAdminById(id: string) {
    return this.admins.get(id);
  }

  async findAdminByUsername(username: string) {
    return Array.from(this.admins.values()).find(a => a.username === username);
  }

  async findAdminsByRole(role?: string) {
    if (!role) {
      return Array.from(this.admins.values());
    }
    return Array.from(this.admins.values()).filter(a => a.role === role);
  }

  async createAdmin(data: any) {
    const id = `admin-${Date.now()}`;
    const admin = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.admins.set(id, admin);
    return admin;
  }

  async updateAdmin(id: string, updates: any) {
    const admin = this.admins.get(id);
    if (!admin) return null;
    
    const updated = {
      ...admin,
      ...updates,
      updatedAt: new Date(),
    };
    this.admins.set(id, updated);
    return updated;
  }

  async deleteAdmin(id: string) {
    return this.admins.delete(id);
  }

  // Customer methods
  async findAllCustomers() {
    return Array.from(this.customers.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findCustomerById(id: string) {
    return this.customers.get(id);
  }

  async createCustomer(data: any) {
    const id = `customer-${Date.now()}`;
    const customerId = `CUST-${String(this.customerIdCounter++).padStart(4, '0')}`;
    const customer = {
      _id: id,
      customerId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async deleteCustomer(id: string) {
    // Delete all cases for this customer
    const casesToDelete = Array.from(this.cases.values()).filter(c => c.customerId === id);
    casesToDelete.forEach(c => this.cases.delete(c._id));
    
    return this.customers.delete(id);
  }

  // Product Case methods
  async findAllCases() {
    return Array.from(this.cases.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findCaseById(id: string) {
    return this.cases.get(id);
  }

  async findCasesByCustomerId(customerId: string) {
    return Array.from(this.cases.values())
      .filter(c => c.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createCase(data: any) {
    const id = `case-${Date.now()}`;
    const productCase = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cases.set(id, productCase);
    return productCase;
  }

  async updateCase(id: string, updates: any) {
    const productCase = this.cases.get(id);
    if (!productCase) return null;
    
    const updated = {
      ...productCase,
      ...updates,
      updatedAt: new Date(),
    };
    this.cases.set(id, updated);
    return updated;
  }

  async deleteCase(id: string) {
    return this.cases.delete(id);
  }

  // Interaction History methods
  async findInteractionsByCaseId(caseId: string) {
    return Array.from(this.interactions.values())
      .filter(i => i.caseId === caseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createInteraction(data: any) {
    const id = `interaction-${Date.now()}-${Math.random()}`;
    const interaction = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    this.interactions.set(id, interaction);
    return interaction;
  }
}

export const memoryStorage = new MemoryStorage();
