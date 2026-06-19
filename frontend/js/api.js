/* js/api.js - API client module with mock data fallback and scoping rules */

const API_BASE_URL = 'https://propmanager-backend-1.onrender.com';
const USE_MOCK = false; // Set to false to connect to your live Python backend

// Utility to simulate network delay when in mock mode
const sleep = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

// Retrieve headers with JWT authorization token if available
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// IN-MEMORY MOCK DATABASE INITIALIZATION
// -------------------------------------------------------------
const defaultMockDB = {
  users: [
    { id: 'user-admin', name: 'Super Admin', email: 'admin@example.com', role: 'admin', phone: '+91 99999 88888', status: 'active' },
    { id: 'user-manager', name: 'Rajesh Kumar', email: 'rajesh@example.com', role: 'manager', phone: '+91 98765 43210', status: 'active' },
    { id: 'user-manager2', name: 'John Doe', email: 'john@example.com', role: 'manager', phone: '+91 98765 77777', status: 'active' },
    { id: 'user-arjun', name: 'Arjun Sharma', email: 'arjun@example.com', role: 'tenant', phone: '+91 98765 11111', status: 'active' },
    { id: 'user-priya', name: 'Priya Desai', email: 'priya@example.com', role: 'tenant', phone: '+91 98765 22222', status: 'active' },
    { id: 'user-kiran', name: 'Kiran Nair', email: 'kiran@example.com', role: 'tenant', phone: '+91 98765 33333', status: 'active' },
    { id: 'user-sunita', name: 'Sunita Rao', email: 'sunita@example.com', role: 'tenant', phone: '+91 98765 44444', status: 'active' }
  ],
  properties: [
    { id: 'prop-1', title: 'Sunrise Apartments — B-204', description: 'Cozy 2BHK flat with a spacious balcony overlooking the park.', address: 'Koregaon Park', city: 'Pune', type: 'flat', bedrooms: 2, bathrooms: 2, rent_amount: 28000, status: 'occupied', manager_id: 'user-manager' },
    { id: 'prop-2', title: 'Green Valley Villa — 7A', description: 'Luxurious 4BHK gated community villa with private garden.', address: 'Baner', city: 'Pune', type: 'villa', bedrooms: 4, bathrooms: 4, rent_amount: 55000, status: 'occupied', manager_id: 'user-manager' },
    { id: 'prop-3', title: 'MG Road Commercial Space', description: 'Premium ground floor commercial showroom location.', address: 'Deccan', city: 'Pune', type: 'commercial', bedrooms: null, bathrooms: 1, rent_amount: 42000, status: 'vacant', manager_id: 'user-manager' },
    { id: 'prop-4', title: 'Shivaji Nagar PG Suites', description: 'Furnished studio spaces for students and working professionals.', address: 'Shivaji Nagar', city: 'Pune', type: 'studio', bedrooms: 1, bathrooms: 1, rent_amount: 12000, status: 'occupied', manager_id: 'user-manager' }
  ],
  tenants: [
    { id: 'tenant-1', user_id: 'user-arjun', name: 'Arjun Sharma', email: 'arjun@example.com', phone: '+91 98765 11111', emergency_contact: 'Amit Sharma: +91 98765 99991', id_proof_url: 'id_arjun.pdf' },
    { id: 'tenant-2', user_id: 'user-priya', name: 'Priya Desai', email: 'priya@example.com', phone: '+91 98765 22222', emergency_contact: 'Ravi Desai: +91 98765 99992', id_proof_url: 'id_priya.pdf' },
    { id: 'tenant-3', user_id: 'user-kiran', name: 'Kiran Nair', email: 'kiran@example.com', phone: '+91 98765 33333', emergency_contact: 'Gopal Nair: +91 98765 99993', id_proof_url: 'id_kiran.pdf' },
    { id: 'tenant-4', user_id: 'user-sunita', name: 'Sunita Rao', email: 'sunita@example.com', phone: '+91 98765 44444', emergency_contact: 'Dev Rao: +91 98765 99994', id_proof_url: 'id_sunita.pdf' }
  ],
  agreements: [
    { id: 'agr-1', property_id: 'prop-1', tenant_id: 'tenant-1', start_date: '2025-06-01', end_date: '2026-06-01', rent_amount: 28000, deposit_amount: 60000, status: 'active', document_url: 'lease_b204.pdf' },
    { id: 'agr-2', property_id: 'prop-2', tenant_id: 'tenant-2', start_date: '2025-09-15', end_date: '2026-09-15', rent_amount: 55000, deposit_amount: 110000, status: 'active', document_url: 'lease_villa7a.pdf' },
    { id: 'agr-4', property_id: 'prop-4', tenant_id: 'tenant-3', start_date: '2026-01-01', end_date: '2026-12-31', rent_amount: 12000, deposit_amount: 25000, status: 'active', document_url: 'lease_pg.pdf' }
  ],
  payments: [
    { id: 'pay-1', agreement_id: 'agr-1', amount: 28000, due_date: '2026-06-17', payment_date: '2026-06-17', status: 'paid', payment_method: 'UPI' },
    { id: 'pay-2', agreement_id: 'agr-2', amount: 55000, due_date: '2026-06-20', payment_date: null, status: 'pending', payment_method: null },
    { id: 'pay-3', agreement_id: 'agr-4', amount: 12000, due_date: '2026-06-22', payment_date: null, status: 'pending', payment_method: null },
    { id: 'pay-4', agreement_id: 'agr-1', amount: 28000, due_date: '2026-05-17', payment_date: '2026-05-17', status: 'paid', payment_method: 'Net Banking' },
    { id: 'pay-5', agreement_id: 'agr-2', amount: 55000, due_date: '2026-05-15', payment_date: '2026-05-16', status: 'paid', payment_method: 'UPI' },
    { id: 'pay-6', agreement_id: 'agr-1', amount: 28000, due_date: '2026-04-17', payment_date: null, status: 'overdue', payment_method: null }
  ],
  maintenance: [
    { id: 'maint-1', property_id: 'prop-1', description: 'Pipe leak in master bathroom toilet unit.', status: 'urgent', reported_date: '2026-06-17', notes: 'Plumber assigned, visiting today.' },
    { id: 'maint-2', property_id: 'prop-2', description: 'Power outage in kitchen heating appliance line.', status: 'pending', reported_date: '2026-06-16', notes: 'Waiting for electrician slot.' },
    { id: 'maint-3', property_id: 'prop-4', description: 'Common area walls repainting.', status: 'done', reported_date: '2026-06-05', notes: 'Completed painting work on June 14.' }
  ],
  activities: [
    { id: 'act-1', text: 'Rent received from <strong>Arjun Sharma</strong> — ₹28,000', time: 'Today, 10:42 AM', type: 'payment' },
    { id: 'act-2', text: 'Lease agreement renewed — <strong>Priya Desai</strong>', time: 'Yesterday, 3:15 PM', type: 'agreement' },
    { id: 'act-3', text: 'Overdue notice sent to <strong>Sunita Rao</strong>', time: 'Jun 15, 9:00 AM', type: 'warning' },
    { id: 'act-4', text: 'New tenant onboarded — <strong>Shivaji Nagar PG</strong>', time: 'Jun 13, 2:30 PM', type: 'tenant' }
  ],
  bookingRequests: []
};

// Check if database exists in localStorage, otherwise set default
if (!localStorage.getItem('prm_db')) {
  localStorage.setItem('prm_db', JSON.stringify(defaultMockDB));
}

function getMockDB() {
  return JSON.parse(localStorage.getItem('prm_db'));
}

function saveMockDB(db) {
  localStorage.setItem('prm_db', JSON.stringify(db));
}

// Get the current user cache locally
function getCachedUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// -------------------------------------------------------------
// AUTHENTICATION API
// -------------------------------------------------------------
export async function login(email, password) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      if (user.status === 'deactivated') {
        throw new Error('Your account is deactivated. Please contact the administrator.');
      }
      const mockToken = `mock-jwt-token-${user.id}`;
      localStorage.setItem('token', mockToken);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, user, token: mockToken };
    }
    throw new Error('Invalid email or password');
  } else {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
  }
}

export async function register(name, email, password, role = 'tenant') {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email is already registered');
    }
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      phone: '',
      status: 'active'
    };
    db.users.push(newUser);
    if (role === 'tenant') {
      db.tenants.push({
        id: `tenant-${Date.now()}`,
        user_id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: '',
        emergency_contact: '',
        id_proof_url: null
      });
    }
    saveMockDB(db);
    return { success: true, user: newUser };
  } else {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password, role })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  }
}

export async function getCurrentUser() {
  if (USE_MOCK) {
    await sleep(20);
    const cached = getCachedUser();
    if (cached) {
      const db = getMockDB();
      const dbUser = db.users.find(u => u.id === cached.id);
      if (dbUser) {
        localStorage.setItem('currentUser', JSON.stringify(dbUser));
        return dbUser;
      }
    }
    return cached;
  } else {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
}

// -------------------------------------------------------------
// USER MANAGEMENT API (Admin Stories - Secured)
// -------------------------------------------------------------
export async function getUsers() {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    // Enforce Admin only
    const user = getCachedUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Access denied: Admin permissions required');
    }
    return db.users;
  } else {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  }
}

export async function createAdminUser(userData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    // Enforce Admin only
    const user = getCachedUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Access denied: Admin permissions required');
    }
    
    if (db.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('User email already exists');
    }
    const newUser = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      phone: userData.phone || '',
      status: 'active'
    };
    db.users.push(newUser);
    
    if (userData.role === 'tenant') {
      db.tenants.push({
        id: `tenant-${Date.now()}`,
        user_id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        emergency_contact: '',
        id_proof_url: null
      });
    }
    
    saveMockDB(db);
    return newUser;
  } else {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error('Failed to create user');
    return await res.json();
  }
}

export async function toggleUserStatus(id) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    // Enforce Admin only
    const user = getCachedUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Access denied: Admin permissions required');
    }
    
    const targetUser = db.users.find(u => u.id === id);
    if (!targetUser) throw new Error('User not found');
    
    if (user.id === id) {
      throw new Error('Cannot deactivate your own logged-in account');
    }
    
    targetUser.status = (targetUser.status === 'active') ? 'deactivated' : 'active';
    saveMockDB(db);
    return targetUser;
  } else {
    const res = await fetch(`${API_BASE_URL}/users/${id}/toggle-status`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle user status');
    return await res.json();
  }
}

// -------------------------------------------------------------
// USER PROFILE UPDATES (Tenant Stories)
// -------------------------------------------------------------
export async function updateUserProfile(id, profileData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    
    const user = db.users.find(u => u.id === id);
    if (!user) throw new Error('User profile not found');
    
    user.name = profileData.name;
    user.email = profileData.email;
    user.phone = profileData.phone;
    
    if (user.role === 'tenant') {
      const tenant = db.tenants.find(t => t.user_id === id);
      if (tenant) {
        tenant.name = profileData.name;
        tenant.email = profileData.email;
        tenant.phone = profileData.phone;
        tenant.emergency_contact = profileData.emergency_contact || '';
      }
    }
    
    saveMockDB(db);
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  } else {
    const res = await fetch(`${API_BASE_URL}/users/${id}/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return await res.json();
  }
}

// -------------------------------------------------------------
// PROPERTIES API (CRUD & Scoped by Role & Status updates)
// -------------------------------------------------------------
export async function getProperties(filters = {}) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    let list = [...db.properties];
    const user = getCachedUser();
    
    // Managers can only see properties assigned to them
    if (user && user.role === 'manager') {
      list = list.filter(p => p.manager_id === user.id);
    }
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
    }
    return list;
  } else {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_BASE_URL}/properties?${query}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch properties');
    return await res.json();
  }
}

export async function getProperty(id) {
  if (USE_MOCK) {
    await sleep(50);
    const db = getMockDB();
    const prop = db.properties.find(p => p.id === id);
    if (!prop) throw new Error('Property not found');
    return prop;
  } else {
    const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Property not found');
    return await res.json();
  }
}

export async function createProperty(propertyData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const newProp = {
      id: `prop-${Date.now()}`,
      ...propertyData,
      rent_amount: parseFloat(propertyData.rent_amount),
      bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
      bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
      status: propertyData.status || 'vacant' // managers can assign status initially
    };
    db.properties.push(newProp);
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `New property registered: <strong>${newProp.title}</strong>`,
      time: 'Just now',
      type: 'property'
    });
    
    saveMockDB(db);
    return newProp;
  } else {
    const res = await fetch(`${API_BASE_URL}/properties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(propertyData)
    });
    if (!res.ok) throw new Error('Failed to create property');
    return await res.json();
  }
}

export async function updateProperty(id, propertyData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const index = db.properties.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Property not found');
    
    const user = getCachedUser();
    if (user && user.role === 'manager' && db.properties[index].manager_id !== user.id) {
      throw new Error('Unauthorized to edit this property');
    }
    
    db.properties[index] = {
      ...db.properties[index],
      ...propertyData,
      rent_amount: parseFloat(propertyData.rent_amount),
      bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
      bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
      status: propertyData.status // save the status chosen by manager/admin
    };
    
    saveMockDB(db);
    return db.properties[index];
  } else {
    const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(propertyData)
    });
    if (!res.ok) throw new Error('Failed to update property');
    return await res.json();
  }
}

export async function deleteProperty(id) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const index = db.properties.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Property not found');
    
    const user = getCachedUser();
    if (user && user.role === 'manager' && db.properties[index].manager_id !== user.id) {
      throw new Error('Unauthorized to delete this property');
    }
    
    const activeAgreement = db.agreements.find(a => a.property_id === id && a.status === 'active');
    if (activeAgreement) {
      throw new Error('Cannot delete property with active tenancy agreement');
    }
    
    db.properties = db.properties.filter(p => p.id !== id);
    saveMockDB(db);
    return { success: true };
  } else {
    const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to delete property');
    }
    return await res.json();
  }
}

// -------------------------------------------------------------
// TENANTS API (CRUD & Scoped)
// -------------------------------------------------------------
export async function getTenants() {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = getCachedUser();
    
    if (user && user.role === 'manager') {
      const managedPropIds = db.properties.filter(p => p.manager_id === user.id).map(p => p.id);
      const activeTenantIds = db.agreements.filter(a => managedPropIds.includes(a.property_id)).map(a => a.tenant_id);
      return db.tenants.filter(t => activeTenantIds.includes(t.id));
    }
    return db.tenants;
  } else {
    const res = await fetch(`${API_BASE_URL}/tenants`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch tenants');
    return await res.json();
  }
}

export async function createTenant(tenantData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const newUserId = `user-${Date.now()}`;
    
    const newUser = {
      id: newUserId,
      name: tenantData.name,
      email: tenantData.email,
      role: 'tenant',
      phone: tenantData.phone,
      status: 'active'
    };
    db.users.push(newUser);
    
    const newTenant = {
      id: `tenant-${Date.now()}`,
      user_id: newUserId,
      name: tenantData.name,
      email: tenantData.email,
      phone: tenantData.phone,
      emergency_contact: tenantData.emergency_contact || '',
      id_proof_url: tenantData.id_proof_url || null
    };
    db.tenants.push(newTenant);
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `New tenant onboarded: <strong>${newTenant.name}</strong>`,
      time: 'Just now',
      type: 'tenant'
    });
    
    saveMockDB(db);
    return newTenant;
  } else {
    const res = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tenantData)
    });
    if (!res.ok) throw new Error('Failed to create tenant');
    return await res.json();
  }
}

export async function updateTenant(id, tenantData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const index = db.tenants.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tenant not found');
    
    db.tenants[index] = {
      ...db.tenants[index],
      ...tenantData
    };
    
    const userIndex = db.users.findIndex(u => u.id === db.tenants[index].user_id);
    if (userIndex !== -1) {
      db.users[userIndex].phone = tenantData.phone;
      db.users[userIndex].name = tenantData.name;
    }
    
    saveMockDB(db);
    return db.tenants[index];
  } else {
    const res = await fetch(`${API_BASE_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(tenantData)
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return await res.json();
  }
}

// -------------------------------------------------------------
// TENANT BOOKING REQUESTS (Tenant Booking Story)
// -------------------------------------------------------------
export async function getBookingRequests() {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = getCachedUser();
    let list = db.bookingRequests || [];
    
    if (user && user.role === 'manager') {
      // Find properties managed by Rajesh
      const managedPropIds = db.properties.filter(p => p.manager_id === user.id).map(p => p.id);
      list = list.filter(r => managedPropIds.includes(r.property_id));
    } else if (user && user.role === 'tenant') {
      const tenant = db.tenants.find(t => t.user_id === user.id);
      if (tenant) {
        list = list.filter(r => r.tenant_id === tenant.id);
      } else {
        list = [];
      }
    }
    return list;
  } else {
    const res = await fetch(`${API_BASE_URL}/booking-requests`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to get booking requests');
    return await res.json();
  }
}

export async function createBookingRequest(requestData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    
    const property = db.properties.find(p => p.id === requestData.property_id);
    if (!property) throw new Error('Property does not exist');
    if (property.status !== 'vacant') throw new Error('Property is not vacant');
    
    const newRequest = {
      id: `req-${Date.now()}`,
      property_id: requestData.property_id,
      tenant_id: requestData.tenant_id,
      start_date: requestData.start_date,
      end_date: requestData.end_date,
      status: 'pending',
      created_at: new Date().toISOString().slice(0, 10)
    };
    if (!db.bookingRequests) db.bookingRequests = [];
    db.bookingRequests.push(newRequest);
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `Tenant requested booking for <strong>${property.title}</strong>`,
      time: 'Just now',
      type: 'tenant'
    });
    
    saveMockDB(db);
    return newRequest;
  } else {
    const res = await fetch(`${API_BASE_URL}/booking-requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestData)
    });
    if (!res.ok) throw new Error('Failed to submit booking request');
    return await res.json();
  }
}

export async function approveBookingRequest(id) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    if (!db.bookingRequests) db.bookingRequests = [];
    const req = db.bookingRequests.find(r => r.id === id);
    if (!req) throw new Error('Booking request not found');
    
    const property = db.properties.find(p => p.id === req.property_id);
    if (!property) throw new Error('Property not found');
    if (property.status !== 'vacant') throw new Error('Property is no longer vacant');
    
    // Create Active Agreement
    const newAgr = {
      id: `agr-${Date.now()}`,
      property_id: req.property_id,
      tenant_id: req.tenant_id,
      start_date: req.start_date,
      end_date: req.end_date,
      rent_amount: property.rent_amount,
      deposit_amount: property.rent_amount * 2,
      status: 'active',
      document_url: 'lease_agreement.pdf'
    };
    db.agreements.push(newAgr);
    
    // Set property occupied
    property.status = 'occupied';
    
    // Generate Rent Ledger invoice
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    db.payments.push({
      id: `pay-${Date.now()}`,
      agreement_id: newAgr.id,
      amount: newAgr.rent_amount,
      due_date: dueDateStr,
      payment_date: null,
      status: 'pending',
      payment_method: null
    });
    
    // Remove request from pending list
    db.bookingRequests = db.bookingRequests.filter(r => r.id !== id);
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `Booking approved for <strong>${property.title}</strong>`,
      time: 'Just now',
      type: 'agreement'
    });
    
    saveMockDB(db);
    return newAgr;
  } else {
    const res = await fetch(`${API_BASE_URL}/booking-requests/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to approve request');
    return await res.json();
  }
}

export async function deleteBookingRequest(id) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    if (!db.bookingRequests) db.bookingRequests = [];
    db.bookingRequests = db.bookingRequests.filter(r => r.id !== id);
    
    saveMockDB(db);
    return { success: true };
  } else {
    const res = await fetch(`${API_BASE_URL}/booking-requests/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to reject request');
    return await res.json();
  }
}

// -------------------------------------------------------------
// RENTAL AGREEMENTS API (CRUD & Scoped & Rules)
// -------------------------------------------------------------
export async function getAgreements() {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = getCachedUser();
    let list = [...db.agreements];
    
    if (user && user.role === 'manager') {
      const managedPropIds = db.properties.filter(p => p.manager_id === user.id).map(p => p.id);
      list = list.filter(a => managedPropIds.includes(a.property_id));
    } else if (user && user.role === 'tenant') {
      const tenant = db.tenants.find(t => t.user_id === user.id);
      if (tenant) {
        list = list.filter(a => a.tenant_id === tenant.id);
      } else {
        list = [];
      }
    }
    
    // Add calculated outstanding balance dynamically
    list = list.map(a => {
      const outstanding = db.payments
        .filter(p => p.agreement_id === a.id && p.status !== 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      return { ...a, outstanding_balance: outstanding };
    });
    
    return list;
  } else {
    const res = await fetch(`${API_BASE_URL}/agreements`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch agreements');
    return await res.json();
  }
}

export async function createAgreement(agreementData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    
    const property = db.properties.find(p => p.id === agreementData.property_id);
    if (!property) throw new Error('Property does not exist');
    
    const user = getCachedUser();
    if (user && user.role === 'manager' && property.manager_id !== user.id) {
      throw new Error('Unauthorized to lease this property');
    }
    
    if (property.status !== 'vacant') {
      throw new Error('Property is currently not vacant and cannot be leased');
    }
    
    const existingActive = db.agreements.find(a => a.property_id === agreementData.property_id && a.status === 'active');
    if (existingActive) {
      throw new Error('Property already has an active agreement');
    }
    
    const newAgr = {
      id: `agr-${Date.now()}`,
      property_id: agreementData.property_id,
      tenant_id: agreementData.tenant_id,
      start_date: agreementData.start_date,
      end_date: agreementData.end_date,
      rent_amount: parseFloat(agreementData.rent_amount || property.rent_amount),
      deposit_amount: parseFloat(agreementData.deposit_amount || 0),
      status: 'active',
      document_url: agreementData.document_url || 'lease_agreement.pdf'
    };
    db.agreements.push(newAgr);
    
    property.status = 'occupied';
    
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    const dueDateStr = dueDate.toISOString().slice(0, 10);
    
    db.payments.push({
      id: `pay-${Date.now()}`,
      agreement_id: newAgr.id,
      amount: newAgr.rent_amount,
      due_date: dueDateStr,
      payment_date: null,
      status: 'pending',
      payment_method: null
    });
    
    const tenant = db.tenants.find(t => t.id === newAgr.tenant_id);
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `Agreement signed for <strong>${property.title}</strong> with <strong>${tenant ? tenant.name : 'Tenant'}</strong>`,
      time: 'Just now',
      type: 'agreement'
    });
    
    saveMockDB(db);
    return newAgr;
  } else {
    const res = await fetch(`${API_BASE_URL}/agreements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(agreementData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create agreement');
    }
    return await res.json();
  }
}

export async function terminateAgreement(id) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const agreement = db.agreements.find(a => a.id === id);
    if (!agreement) throw new Error('Agreement not found');
    
    const property = db.properties.find(p => p.id === agreement.property_id);
    const user = getCachedUser();
    const tenant = db.tenants.find(t => t.user_id === user.id);
    
    // Tenant associated with agreement or manager/admin can terminate
    const isAdmin = user && user.role === 'admin';
    const isManager = user && user.role === 'manager' && property && property.manager_id === user.id;
    const isTenantSignee = tenant && agreement.tenant_id === tenant.id;
    
    if (!isAdmin && !isManager && !isTenantSignee) {
      throw new Error('Unauthorized to cancel this lease contract');
    }
    
    agreement.status = 'terminated';
    
    if (property) {
      property.status = 'vacant';
    }
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `Agreement cancelled for <strong>${property ? property.title : 'Property'}</strong>`,
      time: 'Just now',
      type: 'agreement'
    });
    
    saveMockDB(db);
    return agreement;
  } else {
    const res = await fetch(`${API_BASE_URL}/agreements/${id}/terminate`, {
      method: 'PUT',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to terminate agreement');
    return await res.json();
  }
}

// -------------------------------------------------------------
// PAYMENTS API (CRUD & Scoped)
// -------------------------------------------------------------
export async function getPayments(agreementId = null) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = getCachedUser();
    let list = [...db.payments];
    
    if (agreementId) {
      list = list.filter(p => p.agreement_id === agreementId);
    }
    
    // Scoping by Manager
    if (user && user.role === 'manager') {
      const managedPropIds = db.properties.filter(p => p.manager_id === user.id).map(p => p.id);
      const activeAgrIds = db.agreements.filter(a => managedPropIds.includes(a.property_id)).map(a => a.id);
      list = list.filter(p => activeAgrIds.includes(p.agreement_id));
    }
    // Scoping by Tenant
    else if (user && user.role === 'tenant') {
      const tenant = db.tenants.find(t => t.user_id === user.id);
      const activeAgrIds = tenant ? db.agreements.filter(a => a.tenant_id === tenant.id).map(a => a.id) : [];
      list = list.filter(p => activeAgrIds.includes(p.agreement_id));
    }
    
    return list;
  } else {
    const url = agreementId ? `${API_BASE_URL}/payments?agreementId=${agreementId}` : `${API_BASE_URL}/payments`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return await res.json();
  }
}

export async function recordPayment(paymentId, paymentData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const payment = db.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('Payment record not found');
    
    const agr = db.agreements.find(a => a.id === payment.agreement_id);
    const property = agr ? db.properties.find(x => x.id === agr.property_id) : null;
    const user = getCachedUser();
    
    if (user && user.role === 'manager' && property && property.manager_id !== user.id) {
      throw new Error('Unauthorized to collect payments for this property');
    }
    
    payment.status = 'paid';
    payment.payment_date = new Date().toISOString().slice(0, 10);
    payment.payment_method = paymentData.payment_method || 'UPI';
    
    let tenantName = 'Tenant';
    let propTitle = 'Property';
    if (agr) {
      const tenant = db.tenants.find(t => t.id === agr.tenant_id);
      if (tenant) tenantName = tenant.name;
      if (property) propTitle = property.title;
    }
    
    db.activities.unshift({
      id: `act-${Date.now()}`,
      text: `Rent received from <strong>${tenantName}</strong> (${propTitle}) — ₹${payment.amount.toLocaleString('en-IN')}`,
      time: 'Just now',
      type: 'payment'
    });
    
    saveMockDB(db);
    return payment;
  } else {
    const res = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    if (!res.ok) throw new Error('Failed to record payment');
    return await res.json();
  }
}

export async function getOutstandingBalance(agreementId) {
  if (USE_MOCK) {
    const db = getMockDB();
    return db.payments
      .filter(p => p.agreement_id === agreementId && p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  } else {
    const res = await fetch(`${API_BASE_URL}/payments?agreementId=${agreementId}`, {
      headers: getHeaders()
    });
    const payments = await res.json();
    return payments
      .filter(p => p.status !== 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }
}

// -------------------------------------------------------------
// MAINTENANCE TICKETS API (Scoped)
// -------------------------------------------------------------
export async function getMaintenanceTickets() {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const user = getCachedUser();
    let list = [...db.maintenance];
    
    if (user && user.role === 'manager') {
      const managedPropIds = db.properties.filter(p => p.manager_id === user.id).map(p => p.id);
      list = list.filter(m => managedPropIds.includes(m.property_id));
    } else if (user && user.role === 'tenant') {
      const tenant = db.tenants.find(t => t.user_id === user.id);
      const activeAgrs = tenant ? db.agreements.filter(a => a.tenant_id === tenant.id && a.status === 'active') : [];
      const tenantPropIds = activeAgrs.map(a => a.property_id);
      list = list.filter(m => tenantPropIds.includes(m.property_id));
    }
    return list;
  } else {
    const res = await fetch(`${API_BASE_URL}/maintenance`, {
      headers: getHeaders()
    });
    return await res.json();
  }
}

export async function createMaintenanceTicket(ticketData) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    const newTicket = {
      id: `maint-${Date.now()}`,
      property_id: ticketData.property_id,
      description: ticketData.description,
      status: ticketData.status || 'pending',
      reported_date: new Date().toISOString().slice(0, 10),
      notes: ticketData.notes || 'Reported by tenant.'
    };
    db.maintenance.unshift(newTicket);
    saveMockDB(db);
    return newTicket;
  } else {
    const res = await fetch(`${API_BASE_URL}/maintenance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticketData)
    });
    return await res.json();
  }
}

// -------------------------------------------------------------
// DASHBOARD ANALYTICS API
// -------------------------------------------------------------
export async function getDashboardData(role) {
  if (USE_MOCK) {
    await sleep();
    const db = getMockDB();
    
    if (role === 'admin') {
      const totalProps = db.properties.length;
      const occupiedProps = db.properties.filter(p => p.status === 'occupied').length;
      const occupancyPct = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;
      
      const collectedThisMonth = db.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingThisMonth = db.payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
      
      const openTickets = db.maintenance.filter(m => m.status !== 'done').length;
      const urgentTickets = db.maintenance.filter(m => m.status === 'urgent').length;
      
      return {
        kpi: {
          totalProperties: totalProps,
          occupancyRate: `${occupancyPct}%`,
          rentCollected: `₹${(collectedThisMonth/100000).toFixed(1)}L`,
          pendingRent: `₹${(pendingThisMonth/1000).toFixed(0)}K`,
          openTickets,
          urgentTickets
        },
        dueRents: db.payments.filter(p => p.status !== 'paid').slice(0, 4).map(p => {
          const agr = db.agreements.find(a => a.id === p.agreement_id);
          const tenant = agr ? db.tenants.find(t => t.id === agr.tenant_id) : null;
          return {
            id: p.id,
            tenantName: tenant ? tenant.name : 'Unknown',
            dueDate: p.due_date,
            amount: `₹${(p.amount/1000).toFixed(0)}K`,
            status: p.status
          };
        }),
        recentActivity: db.activities.slice(0, 5),
        collectionTrend: [55, 60, 50, 65, 58, 70]
      };
    } 
    
    else if (role === 'manager') {
      const user = getCachedUser();
      const managedProps = db.properties.filter(p => p.manager_id === user.id);
      const totalProps = managedProps.length;
      const occupiedProps = managedProps.filter(p => p.status === 'occupied').length;
      const occupancyPct = totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0;
      
      const managedPropIds = managedProps.map(p => p.id);
      const activeAgrs = db.agreements.filter(a => managedPropIds.includes(a.property_id));
      const activeAgrIds = activeAgrs.map(a => a.id);
      
      const managedPayments = db.payments.filter(p => activeAgrIds.includes(p.agreement_id));
      const collectedThisMonth = managedPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
      const pendingThisMonth = managedPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
      
      const managedMaint = db.maintenance.filter(m => managedPropIds.includes(m.property_id));
      const openTickets = managedMaint.filter(m => m.status !== 'done').length;
      const urgentTickets = managedMaint.filter(m => m.status === 'urgent').length;
      
      return {
        kpi: {
          totalProperties: totalProps,
          occupancyRate: `${occupancyPct}%`,
          rentCollected: `₹${(collectedThisMonth/100000).toFixed(1)}L`,
          pendingRent: `₹${(pendingThisMonth/1000).toFixed(0)}K`,
          openTickets,
          urgentTickets
        },
        dueRents: db.payments.filter(p => activeAgrIds.includes(p.agreement_id) && p.status !== 'paid').slice(0, 4).map(p => {
          const agr = db.agreements.find(a => a.id === p.agreement_id);
          const tenant = agr ? db.tenants.find(t => t.id === agr.tenant_id) : null;
          return {
            id: p.id,
            tenantName: tenant ? tenant.name : 'Unknown',
            dueDate: p.due_date,
            amount: `₹${(p.amount/1000).toFixed(0)}K`,
            status: p.status
          };
        }),
        recentActivity: db.activities.slice(0, 4),
        collectionTrend: [55, 60, 50, 65, 58, 70]
      };
    } 
    
    else if (role === 'tenant') {
      const currentUser = getCachedUser();
      const tenantProfile = db.tenants.find(t => t.user_id === currentUser.id);
      
      if (!tenantProfile) {
        return { kpi: {}, dueRents: [], recentActivity: [] };
      }
      
      const activeAgr = db.agreements.find(a => a.tenant_id === tenantProfile.id && a.status === 'active');
      const prop = activeAgr ? db.properties.find(p => p.id === activeAgr.property_id) : null;
      
      const payments = activeAgr ? db.payments.filter(p => p.agreement_id === activeAgr.id) : [];
      const nextDue = payments.find(p => p.status !== 'paid');
      
      const maintenance = prop ? db.maintenance.filter(m => m.property_id === prop.id) : [];
      
      // Get assigned manager & owner contact details
      let managerName = 'Rajesh Kumar';
      let managerEmail = 'rajesh@example.com';
      let managerPhone = '+91 98765 43210';
      if (prop) {
        const mgr = db.users.find(u => u.id === prop.manager_id);
        if (mgr) {
          managerName = mgr.name;
          managerEmail = mgr.email;
          managerPhone = mgr.phone || '+91 98765 43210';
        }
      }
      
      return {
        lease: activeAgr ? {
          id: activeAgr.id,
          propertyName: prop ? prop.title : 'Leased Unit',
          address: prop ? `${prop.address}, ${prop.city}` : '',
          rent: `₹${activeAgr.rent_amount.toLocaleString('en-IN')}`,
          deposit: `₹${activeAgr.deposit_amount.toLocaleString('en-IN')}`,
          startDate: activeAgr.start_date,
          endDate: activeAgr.end_date,
          status: activeAgr.status
        } : null,
        nextPayment: nextDue ? {
          amount: `₹${nextDue.amount.toLocaleString('en-IN')}`,
          dueDate: nextDue.due_date,
          status: nextDue.status
        } : null,
        payments: payments.slice(0, 5),
        maintenanceTickets: maintenance.slice(0, 5),
        contacts: {
          manager: { name: managerName, email: managerEmail, phone: managerPhone },
          owner: { name: 'Super Admin', email: 'admin@example.com', phone: '+91 99999 88888' }
        }
      };
    }
  } else {
    const res = await fetch(`${API_BASE_URL}/dashboard/${role}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return await res.json();
  }
}
