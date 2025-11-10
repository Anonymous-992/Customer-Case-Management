import bcrypt from 'bcryptjs';

// In-memory storage for when MongoDB is not available
class MemoryStorage {
  private admins: Map<string, any> = new Map();
  private customers: Map<string, any> = new Map();
  private cases: Map<string, any> = new Map();
  private interactions: Map<string, any> = new Map();
  private reminders: Map<string, any> = new Map();
  private settings: Map<string, any> = new Map();
  private quickCases: Map<string, any> = new Map();
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
      notificationPreferences: data.notificationPreferences || {
        email: true,
        sms: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: any) {
    const customer = this.customers.get(id);
    if (!customer) return null;
    
    const updated = {
      ...customer,
      ...updates,
      updatedAt: new Date(),
    };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string) {
    // Delete all cases for this customer
    const casesToDelete = Array.from(this.cases.values()).filter(c => c.customerId === id);
    casesToDelete.forEach(c => this.cases.delete(c._id));
    
    return this.customers.delete(id);
  }

  async searchCustomers(query: string) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.customers.values())
      .filter(customer => 
        customer.name?.toLowerCase().includes(lowerQuery) ||
        customer.phone?.toLowerCase().includes(lowerQuery) ||
        customer.email?.toLowerCase().includes(lowerQuery) ||
        customer.customerId?.toLowerCase().includes(lowerQuery) ||
        customer.address?.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findCustomerByPhone(phone: string) {
    return Array.from(this.customers.values()).find(c => c.phone === phone);
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

  async searchCases(query: string) {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.cases.values())
      .filter(case_ => 
        case_.modelNumber?.toLowerCase().includes(lowerQuery) ||
        case_.serialNumber?.toLowerCase().includes(lowerQuery) ||
        case_.purchasePlace?.toLowerCase().includes(lowerQuery) ||
        case_.receiptNumber?.toLowerCase().includes(lowerQuery) ||
        case_.status?.toLowerCase().includes(lowerQuery) ||
        case_.paymentStatus?.toLowerCase().includes(lowerQuery) ||
        case_.repairNeeded?.toLowerCase().includes(lowerQuery) ||
        case_.initialSummary?.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findCaseBySerialNumber(serialNumber: string) {
    return Array.from(this.cases.values()).find(c => c.serialNumber === serialNumber);
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

  // Reminder methods
  async findAllReminders() {
    return Array.from(this.reminders.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findReminderById(id: string) {
    return this.reminders.get(id);
  }

  async findRemindersByAssignedTo(adminId: string) {
    return Array.from(this.reminders.values())
      .filter(r => r.assignedTo.includes(adminId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findRemindersByAssignedBy(adminId: string) {
    return Array.from(this.reminders.values())
      .filter(r => r.assignedBy === adminId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createReminder(data: any) {
    const id = `reminder-${Date.now()}`;
    const reminder = {
      _id: id,
      ...data,
      status: data.status || 'Pending',
      isReadByAssignees: [],
      hasUnreadUpdate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reminders.set(id, reminder);
    return reminder;
  }

  async updateReminder(id: string, updates: any) {
    const reminder = this.reminders.get(id);
    if (!reminder) return null;
    
    const updated = {
      ...reminder,
      ...updates,
      updatedAt: new Date(),
    };
    this.reminders.set(id, updated);
    return updated;
  }

  async deleteReminder(id: string) {
    return this.reminders.delete(id);
  }

  // Settings methods
  async findSettings(userId?: string) {
    // Find global settings (userId = undefined) or user-specific settings
    const settingsArray = Array.from(this.settings.values());
    return settingsArray.find(s => s.userId === userId);
  }

  async createSettings(data: any) {
    const id = `settings-${Date.now()}`;
    const settings = {
      _id: id,
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
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(id, settings);
    return settings;
  }

  async updateSettings(id: string, updates: any) {
    const settings = this.settings.get(id);
    if (!settings) return null;
    
    const updated = {
      ...settings,
      ...updates,
      // Deep merge nested objects
      notifications: { ...settings.notifications, ...updates.notifications },
      remindersConfig: { ...settings.remindersConfig, ...updates.remindersConfig },
      exportSettings: { ...settings.exportSettings, ...updates.exportSettings },
      defaultViews: { ...settings.defaultViews, ...updates.defaultViews },
      autoStatusRules: { ...settings.autoStatusRules, ...updates.autoStatusRules },
      preferences: { ...settings.preferences, ...updates.preferences },
      updatedAt: new Date(),
    };
    this.settings.set(id, updated);
    return updated;
  }

  // Quick Case methods
  async createQuickCase(data: any) {
    const id = `quickcase-${Date.now()}`;
    const quickCase = {
      _id: id,
      ...data,
      status: 'incomplete',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.quickCases.set(id, quickCase);
    return quickCase;
  }

  async getQuickCases() {
    return Array.from(this.quickCases.values())
      .filter(qc => qc.status === 'incomplete')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findQuickCaseById(id: string) {
    return this.quickCases.get(id);
  }

  async updateQuickCase(id: string, updates: any) {
    const quickCase = this.quickCases.get(id);
    if (!quickCase) return null;

    const updated = {
      ...quickCase,
      ...updates,
      updatedAt: new Date(),
    };
    this.quickCases.set(id, updated);
    return updated;
  }

  async deleteQuickCase(id: string) {
    return this.quickCases.delete(id);
  }
}

export const memoryStorage = new MemoryStorage();
