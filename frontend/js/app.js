/* js/app.js - Frontend application controller */
import * as api from './api.js';

// Application State
let currentUser = null;
let currentView = 'dashboard';

// DOM Elements cache
const DOM = {
  authOverlay: document.getElementById('auth-overlay'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  showRegisterLink: document.getElementById('show-register'),
  showLoginLink: document.getElementById('show-login'),
  
  appRoot: document.getElementById('app-root'),
  sidebar: document.getElementById('sidebar'),
  userNameDisplay: document.getElementById('user-name-display'),
  userRoleDisplay: document.getElementById('user-role-display'),
  userAvatarDisplay: document.getElementById('user-avatar-display'),
  logoutBtn: document.getElementById('logout-btn'),
  
  topbarTitle: document.getElementById('topbar-title'),
  globalSearch: document.getElementById('global-search'),
  globalSearchInput: document.getElementById('global-search-input'),
  filterBtn: document.getElementById('filter-btn'),
  addPropertyBtn: document.getElementById('add-property-btn'),
  
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  
  // Views
  views: {
    dashboard: document.getElementById('view-dashboard'),
    properties: document.getElementById('view-properties'),
    tenants: document.getElementById('view-tenants'),
    agreements: document.getElementById('view-agreements'),
    payments: document.getElementById('view-payments'),
    settings: document.getElementById('view-settings'),
    users: document.getElementById('view-users'),
    maintenance: document.getElementById('view-maintenance')
  },
  
  // Navigation Menu Items
  navItems: document.querySelectorAll('.nav-item'),
  
  // Modals
  modals: {
    property: document.getElementById('modal-property'),
    tenant: document.getElementById('modal-tenant'),
    agreement: document.getElementById('modal-agreement'),
    payment: document.getElementById('modal-payment'),
    user: document.getElementById('modal-user'),
    booking: document.getElementById('modal-booking'),
    maintenance: document.getElementById('modal-maintenance')
  },
  
  // Modal Forms
  forms: {
    property: document.getElementById('form-property'),
    tenant: document.getElementById('form-tenant'),
    agreement: document.getElementById('form-agreement'),
    payment: document.getElementById('form-payment'),
    user: document.getElementById('form-user'),
    booking: document.getElementById('form-booking'),
    maintenance: document.getElementById('form-maintenance')
  }
};

// -------------------------------------------------------------
// APP INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuth();
});

// Setup global event handlers
function setupEventListeners() {
  // Authentication Forms
  if (DOM.loginForm) DOM.loginForm.addEventListener('submit', handleLogin);
  if (DOM.registerForm) DOM.registerForm.addEventListener('submit', handleRegister);
  
  if (DOM.showRegisterLink) {
    DOM.showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      DOM.loginForm.style.display = 'none';
      DOM.registerForm.style.display = 'block';
    });
  }
  
  if (DOM.showLoginLink) {
    DOM.showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      DOM.registerForm.style.display = 'none';
      DOM.loginForm.style.display = 'block';
    });
  }
  
  // Sidebar Navigation Switcher
  DOM.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  // Logout Trigger
  if (DOM.logoutBtn) {
    DOM.logoutBtn.addEventListener('click', () => {
      api.logout();
      showToast('Logged out successfully', 'info');
      checkAuth();
    });
  }

  // Add Button actions
  if (DOM.addPropertyBtn) {
    DOM.addPropertyBtn.addEventListener('click', () => {
      openPropertyModal();
    });
  }

  const addUserBtn = document.getElementById('btn-add-user');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', () => {
      openUserModal();
    });
  }

  // Setup modal close buttons
  document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Property Filters Tabs (Dashboard Properties Section)
  document.querySelectorAll('#prop-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#prop-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');
      renderDashboardProperties(filter);
    });
  });

  // Search input on properties view
  if (DOM.globalSearchInput) {
    DOM.globalSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (currentView === 'properties') {
        renderPropertiesList(val);
      }
    });
  }

  // Modals form submissions
  if (DOM.forms.property) DOM.forms.property.addEventListener('submit', handlePropertySubmit);
  if (DOM.forms.tenant) DOM.forms.tenant.addEventListener('submit', handleTenantSubmit);
  if (DOM.forms.agreement) DOM.forms.agreement.addEventListener('submit', handleAgreementSubmit);
  if (DOM.forms.payment) DOM.forms.payment.addEventListener('submit', handlePaymentSubmit);
  if (DOM.forms.user) DOM.forms.user.addEventListener('submit', handleUserSubmit);
  if (DOM.forms.booking) DOM.forms.booking.addEventListener('submit', handleBookingSubmit);
  if (DOM.forms.maintenance) DOM.forms.maintenance.addEventListener('submit', handleMaintenanceSubmit);

  // Agreements tabs selector
  const agreementsTabs = document.getElementById('agreements-tabs');
  if (agreementsTabs) {
    agreementsTabs.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        agreementsTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetTab = tab.getAttribute('data-tab');
        
        const leasesContainer = document.getElementById('lease-agreements-container');
        const bookingsContainer = document.getElementById('booking-requests-container');
        
        if (targetTab === 'leases') {
          if (leasesContainer) leasesContainer.style.display = 'block';
          if (bookingsContainer) bookingsContainer.style.display = 'none';
          renderAgreementsList();
        } else {
          if (leasesContainer) leasesContainer.style.display = 'none';
          if (bookingsContainer) bookingsContainer.style.display = 'block';
          renderBookingRequestsList();
        }
      });
    });
  }

  // Role Switcher buttons inside the login overlay (for easy local review)
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const email = btn.getAttribute('data-email');
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = 'password'; // Mock matches any
      }
    });
  });
}

// -------------------------------------------------------------
// AUTHENTICATION LOGIC
// -------------------------------------------------------------
async function checkAuth() {
  currentUser = await api.getCurrentUser();
  if (currentUser) {
    // Logged in
    DOM.authOverlay.style.display = 'none';
    DOM.appRoot.style.display = 'flex';
    
    // Set Profile UI Info
    DOM.userNameDisplay.textContent = currentUser.name;
    DOM.userRoleDisplay.textContent = currentUser.role === 'manager' ? 'Property Manager' : currentUser.role;
    
    // Set avatar initials
    const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    DOM.userAvatarDisplay.textContent = initials;
    
    // Hide or show features based on Role
    applyRolePermissions();
    
    // Load current view data
    switchView(currentView);
  } else {
    // Show Login
    DOM.authOverlay.style.display = 'flex';
    DOM.appRoot.style.display = 'none';
    if (DOM.loginForm) {
      DOM.loginForm.style.display = 'block';
      DOM.registerForm.style.display = 'none';
    }
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const data = await api.login(email, password);
    showToast(`Welcome back, ${data.user.name}!`, 'success');
    await checkAuth();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const role = document.getElementById('register-role').value;
  
  try {
    await api.register(name, email, password, role);
    showToast('Account registered successfully! Please log in.', 'success');
    DOM.registerForm.style.display = 'none';
    DOM.loginForm.style.display = 'block';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function applyRolePermissions() {
  const role = currentUser.role;
  
  // Hide settings/nav links if needed
  const managerOnlyElements = document.querySelectorAll('.manager-only');
  const adminOnlyElements = document.querySelectorAll('.admin-only');
  const staffOnlyElements = document.querySelectorAll('.staff-only'); // Admin + Manager
  
  if (role === 'tenant') {
    managerOnlyElements.forEach(el => el.style.display = 'none');
    adminOnlyElements.forEach(el => el.style.display = 'none');
    staffOnlyElements.forEach(el => el.style.display = 'none');
    DOM.addPropertyBtn.style.display = 'none';
  } else if (role === 'manager') {
    managerOnlyElements.forEach(el => el.style.display = 'flex');
    adminOnlyElements.forEach(el => el.style.display = 'none');
    staffOnlyElements.forEach(el => el.style.display = 'flex');
    DOM.addPropertyBtn.style.display = 'flex';
  } else if (role === 'admin') {
    managerOnlyElements.forEach(el => el.style.display = 'none');
    adminOnlyElements.forEach(el => el.style.display = 'flex');
    staffOnlyElements.forEach(el => el.style.display = 'flex');
    DOM.addPropertyBtn.style.display = 'flex';
  }
}

// -------------------------------------------------------------
// ROUTING / VIEW SWITCHER
// -------------------------------------------------------------
async function switchView(viewName) {
  // Route Guard: Tenants should not have access to Tenants or Users view
  if (currentUser && currentUser.role === 'tenant' && (viewName === 'tenants' || viewName === 'users')) {
    switchView('dashboard');
    return;
  }

  currentView = viewName;
  
  // Update Navigation Active State
  DOM.navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Show/Hide view divs
  Object.keys(DOM.views).forEach(name => {
    if (DOM.views[name]) {
      if (name === viewName) {
        DOM.views[name].classList.add('active');
      } else {
        DOM.views[name].classList.remove('active');
      }
    }
  });
  
  // Update Header Title & Action buttons context
  DOM.topbarTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
  
  // Load data for view
  if (viewName === 'dashboard') {
    await loadDashboardData();
  } else if (viewName === 'properties') {
    await renderPropertiesList();
  } else if (viewName === 'tenants') {
    await renderTenantsList();
  } else if (viewName === 'agreements') {
    const tabActive = document.querySelector('#agreements-tabs .tab.active');
    if (tabActive && tabActive.getAttribute('data-tab') === 'bookings') {
      await renderBookingRequestsList();
    } else {
      await renderAgreementsList();
    }
    await updateBookingBadge();
  } else if (viewName === 'payments') {
    await renderPaymentsList();
  } else if (viewName === 'settings') {
    loadSettingsData();
  } else if (viewName === 'users') {
    await renderUsersList();
  } else if (viewName === 'maintenance') {
    await renderMaintenanceList();
  }
}

// -------------------------------------------------------------
// VIEW 1: DASHBOARD
// -------------------------------------------------------------
async function loadDashboardData() {
  try {
    const role = currentUser.role;
    
    // Toggle role container dashboards
    const adminDashboard = document.getElementById('dashboard-admin-manager');
    const tenantDashboard = document.getElementById('dashboard-tenant');
    
    if (role === 'admin' || role === 'manager') {
      adminDashboard.style.display = 'block';
      tenantDashboard.style.display = 'none';
      
      const data = await api.getDashboardData(role);
      
      // Populate KPI values
      document.getElementById('kpi-total-properties').textContent = data.kpi.totalProperties;
      document.getElementById('kpi-occupancy').textContent = data.kpi.occupancyRate;
      document.getElementById('kpi-rent-collected').textContent = data.kpi.rentCollected;
      document.getElementById('kpi-pending').textContent = data.kpi.pendingRent;
      document.getElementById('kpi-open-tickets').textContent = data.kpi.openTickets;
      document.getElementById('kpi-urgent-tickets').textContent = `${data.kpi.urgentTickets} urgent`;
      
      // Render Properties list tab (default 'all')
      renderDashboardProperties('all');
      
      // Render Rent Due
      const dueList = document.getElementById('due-rents-list');
      dueList.innerHTML = '';
      if (data.dueRents.length === 0) {
        dueList.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:10px 0;text-align:center;">No pending payments</div>';
      } else {
        data.dueRents.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'rent-item';
          
          let dotColor = 'dot-amber';
          if (item.status === 'overdue') dotColor = 'dot-red';
          
          itemDiv.innerHTML = `
            <span class="rent-dot ${dotColor}"></span>
            <span class="rent-tenant">${item.tenantName}</span>
            <span class="rent-days">${item.status === 'overdue' ? 'Overdue' : 'Due'} ${formatDateShort(item.dueDate)}</span>
            <span class="rent-amount">${item.amount}</span>
          `;
          dueList.appendChild(itemDiv);
        });
      }
      
      // Render Maintenance list
      const tickets = await api.getMaintenanceTickets();
      const maintList = document.getElementById('dashboard-maint-list');
      maintList.innerHTML = '';
      
      const activeTickets = tickets.slice(0, 3);
      if (activeTickets.length === 0) {
        maintList.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:10px 0;text-align:center;">No active maintenance tickets</div>';
      } else {
        activeTickets.forEach(item => {
          const itemDiv = document.createElement('div');
          itemDiv.className = 'maint-item';
          
          let iconClass = 'ti-tool';
          if (item.description.toLowerCase().includes('leak') || item.description.toLowerCase().includes('water')) iconClass = 'ti-droplet';
          else if (item.description.toLowerCase().includes('power') || item.description.toLowerCase().includes('light')) iconClass = 'ti-plug';
          else if (item.description.toLowerCase().includes('paint')) iconClass = 'ti-paint';
          
          let badgeClass = 'badge-pending';
          if (item.status === 'urgent') badgeClass = 'badge-urgent';
          else if (item.status === 'done') badgeClass = 'badge-done';
          
          itemDiv.innerHTML = `
            <div class="maint-icon"><i class="ti ${iconClass}" aria-hidden="true"></i></div>
            <div class="maint-info">
              <div class="maint-desc">${item.description}</div>
              <div class="maint-sub">Reported ${formatDateShort(item.reported_date)} · ${item.notes}</div>
            </div>
            <div class="maint-badge ${badgeClass}">${item.status}</div>
          `;
          maintList.appendChild(itemDiv);
        });
      }

      // Render chart collection bars
      const bars = document.querySelectorAll('.bar-chart .bar');
      data.collectionTrend.forEach((height, i) => {
        if (bars[i]) {
          bars[i].style.height = `${height}px`;
        }
      });
      
      // Render Recent activity logs
      const actList = document.getElementById('recent-activity-list');
      actList.innerHTML = '';
      data.recentActivity.forEach(act => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'act-item';
        
        let dotColor = 'var(--primary)';
        if (act.type === 'warning') dotColor = 'var(--danger-dot)';
        else if (act.type === 'tenant') dotColor = 'var(--text-tertiary)';
        else if (act.type === 'agreement') dotColor = '#185FA5';
        
        itemDiv.innerHTML = `
          <div class="act-dot" style="background:${dotColor}"></div>
          <div>
            <div class="act-text">${act.text}</div>
            <div class="act-time">${act.time}</div>
          </div>
        `;
        actList.appendChild(itemDiv);
      });
    } 
    
    else if (role === 'tenant') {
      adminDashboard.style.display = 'none';
      tenantDashboard.style.display = 'block';
      
      const data = await api.getDashboardData(role);
      
      // Populate Lease Summary Card
      const leaseCard = document.getElementById('tenant-lease-card');
      if (data.lease) {
        leaseCard.innerHTML = `
          <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px">${data.lease.propertyName}</div>
          <div style="font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;margin-bottom:16px">
            <i class="ti ti-map-pin"></i> ${data.lease.address}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);margin-bottom:14px">
            <div>
              <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;font-weight:600">Monthly Rent</div>
              <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-top:2px">${data.lease.rent}</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;font-weight:600">Security Deposit</div>
              <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-top:2px">${data.lease.deposit}</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary)">
            <span>Start: <strong>${formatDateMedium(data.lease.startDate)}</strong></span>
            <span>End: <strong>${formatDateMedium(data.lease.endDate)}</strong></span>
          </div>
          <div style="margin-top: 16px; border-top: 1px solid var(--border-tertiary); padding-top: 12px; display: flex; justify-content: flex-end;">
            <button class="topbar-btn btn-cancel-lease" data-id="${data.lease.id}" style="color:var(--danger); border-color:var(--danger-bg); font-size:12px; padding:6px 12px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;">
              <i class="ti ti-ban"></i> Cancel Lease Contract
            </button>
          </div>
        `;

        // Attach listener to Cancel Contract button
        const cancelLeaseBtn = leaseCard.querySelector('.btn-cancel-lease');
        if (cancelLeaseBtn) {
          cancelLeaseBtn.addEventListener('click', async () => {
            const leaseId = cancelLeaseBtn.getAttribute('data-id');
            if (confirm('Are you sure you want to cancel your lease agreement early? The property status will shift to Vacant.')) {
              try {
                await api.terminateAgreement(leaseId);
                showToast('Your lease has been cancelled successfully.', 'success');
                await loadDashboardData();
              } catch (err) {
                showToast(err.message, 'error');
              }
            }
          });
        }
      } else {
        leaseCard.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary)">No active lease agreement found.</div>';
      }
      
      // Populate contacts card
      const contactsList = document.getElementById('tenant-contacts-list');
      if (contactsList && data.contacts) {
        contactsList.innerHTML = `
          <div style="padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
            <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Property Manager</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${data.contacts.manager.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              <div><i class="ti ti-phone" style="font-size: 12px;"></i> ${data.contacts.manager.phone}</div>
              <div style="margin-top: 2px;"><i class="ti ti-mail" style="font-size: 12px;"></i> ${data.contacts.manager.email}</div>
            </div>
          </div>
          <div style="padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-md); border-left: 3px solid #185FA5;">
            <div style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 600;">Property Owner / Landlord</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${data.contacts.owner.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              <div><i class="ti ti-phone" style="font-size: 12px;"></i> ${data.contacts.owner.phone}</div>
              <div style="margin-top: 2px;"><i class="ti ti-mail" style="font-size: 12px;"></i> ${data.contacts.owner.email}</div>
            </div>
          </div>
        `;
      }

      // Next Due Payment Highlight
      const payHighlight = document.getElementById('tenant-payment-highlight');
      if (data.nextPayment) {
        payHighlight.innerHTML = `
          <div style="font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase">Next Rent Payment Due</div>
          <div style="font-size:24px;font-weight:700;color:var(--text-primary);margin:4px 0">${data.nextPayment.amount}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
            <span style="font-size:12px;color:var(--text-secondary)">Due Date: <strong>${formatDateMedium(data.nextPayment.dueDate)}</strong></span>
            <span class="prop-status ${data.nextPayment.status === 'overdue' ? 'status-maintenance' : 'status-vacant'}">${data.nextPayment.status}</span>
          </div>
        `;
      } else {
        payHighlight.innerHTML = `
          <div style="font-size:11px;color:var(--text-secondary);font-weight:600;text-transform:uppercase">Next Rent Payment Due</div>
          <div style="font-size:16px;font-weight:600;color:var(--success);margin-top:8px">All rent payments up to date!</div>
        `;
      }
      
      // Tenant Payment History
      const payList = document.getElementById('tenant-payment-list');
      payList.innerHTML = '';
      if (data.payments.length === 0) {
        payList.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No payment records</td></tr>';
      } else {
        data.payments.forEach(p => {
          const row = document.createElement('tr');
          let statusBadge = '';
          if (p.status === 'paid') statusBadge = '<span class="prop-status status-occupied">Paid</span>';
          else if (p.status === 'pending') statusBadge = '<span class="prop-status status-vacant">Pending</span>';
          else statusBadge = '<span class="prop-status status-maintenance">Overdue</span>';
          
          row.innerHTML = `
            <td>${formatDateMedium(p.due_date)}</td>
            <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
            <td>${statusBadge}</td>
            <td>${p.payment_date ? formatDateMedium(p.payment_date) : '—'}</td>
          `;
          payList.appendChild(row);
        });
      }
      
      // Tenant Maintenance Requests
      const tenantMaintList = document.getElementById('tenant-maint-list');
      tenantMaintList.innerHTML = '';
      if (data.maintenanceTickets.length === 0) {
        tenantMaintList.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);text-align:center;padding:10px 0;">No maintenance issues reported</div>';
      } else {
        data.maintenanceTickets.forEach(item => {
          const div = document.createElement('div');
          div.className = 'maint-item';
          
          let badgeClass = 'badge-pending';
          if (item.status === 'urgent') badgeClass = 'badge-urgent';
          else if (item.status === 'done') badgeClass = 'badge-done';
          
          div.innerHTML = `
            <div class="maint-icon"><i class="ti ti-tool" aria-hidden="true"></i></div>
            <div class="maint-info">
              <div class="maint-desc">${item.description}</div>
              <div class="maint-sub">Reported ${formatDateMedium(item.reported_date)}</div>
            </div>
            <div class="maint-badge ${badgeClass}">${item.status}</div>
          `;
          tenantMaintList.appendChild(div);
        });
      }
    }
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// Render property cards on Dashboard Left Panel (filtered: all, occupied, vacant)
async function renderDashboardProperties(filter = 'all') {
  const container = document.getElementById('dashboard-properties-list');
  if (!container) return;
  container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-tertiary)">Loading properties...</div>';
  
  try {
    const properties = await api.getProperties({ status: filter });
    container.innerHTML = '';
    
    if (properties.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary)">No properties found.</div>';
      return;
    }
    
    properties.forEach(p => {
      const card = document.createElement('div');
      card.className = 'prop-card';
      card.addEventListener('click', () => {
        switchView('properties');
        renderPropertiesList(p.title);
      });
      
      let thumbClass = 'flat';
      let thumbIcon = 'ti-building';
      if (p.type === 'villa') { thumbClass = 'villa'; thumbIcon = 'ti-home'; }
      else if (p.type === 'commercial') { thumbClass = 'commercial'; thumbIcon = 'ti-briefcase'; }
      else if (p.type === 'studio') { thumbClass = 'studio'; thumbIcon = 'ti-bed'; }
      
      let badgeMarkup = '';
      if (p.status === 'occupied') {
        badgeMarkup = `
          <div class="prop-status status-occupied">
            <span class="pulse-wrap"><span class="pulse-ring"></span><span class="pulse-dot"></span></span>
            &nbsp;Occupied
          </div>
        `;
      } else if (p.status === 'vacant') {
        badgeMarkup = `<div class="prop-status status-vacant">Vacant</div>`;
      } else {
        badgeMarkup = `<div class="prop-status status-maintenance">Maintenance</div>`;
      }
      
      card.innerHTML = `
        <div class="prop-thumb ${thumbClass}"><i class="ti ${thumbIcon}" aria-hidden="true"></i></div>
        <div class="prop-info">
          <div class="prop-name">${p.title}</div>
          <div class="prop-loc"><i class="ti ti-map-pin" aria-hidden="true"></i> ${p.address}, ${p.city}</div>
          <div class="occ-bar-wrap">
            <div class="occ-bar-bg"><div class="occ-bar-fill" style="width: ${p.status === 'occupied' ? '100%' : '0%'}"></div></div>
            <div class="occ-pct">${p.status === 'occupied' ? 'Occupied' : 'Vacant'}</div>
          </div>
        </div>
        <div class="prop-meta">
          <div class="prop-rent">₹${(p.rent_amount || 0).toLocaleString('en-IN')}/mo</div>
          ${badgeMarkup}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger)">Error: ${err.message}</div>`;
  }
}

// -------------------------------------------------------------
// VIEW 2: PROPERTIES (CRUD SCREEN)
// -------------------------------------------------------------
async function renderPropertiesList(searchTerm = '') {
  const container = document.getElementById('properties-grid-container');
  if (!container) return;
  container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-tertiary)">Fetching properties...</div>';
  
  try {
    const list = await api.getProperties({ search: searchTerm });
    container.innerHTML = '';
    
    if (list.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary)">No properties found. Try a different search.</div>';
      return;
    }
    
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.position = 'relative';
      
      let thumbClass = 'flat';
      let thumbIcon = 'ti-building';
      if (p.type === 'villa') { thumbClass = 'villa'; thumbIcon = 'ti-home'; }
      else if (p.type === 'commercial') { thumbClass = 'commercial'; thumbIcon = 'ti-briefcase'; }
      else if (p.type === 'studio') { thumbClass = 'studio'; thumbIcon = 'ti-bed'; }
      
      let statusBadgeClass = 'status-vacant';
      if (p.status === 'occupied') statusBadgeClass = 'status-occupied';
      else if (p.status === 'maintenance') statusBadgeClass = 'status-maintenance';
      
      // Actions controls markup (only visible to staff/manager/admin)
      let actionsHtml = '';
      if (currentUser.role !== 'tenant') {
        actionsHtml = `
          <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border-tertiary);padding-top:14px">
            <button class="topbar-btn btn-edit-prop" data-id="${p.id}" style="padding:5px 10px;font-size:11px;flex:1"><i class="ti ti-edit"></i> Edit</button>
            <button class="topbar-btn btn-delete-prop" data-id="${p.id}" style="padding:5px 10px;font-size:11px;color:var(--danger);border-color:var(--danger-bg);flex:1"><i class="ti ti-trash"></i> Delete</button>
          </div>
        `;
      } else if (p.status === 'vacant') {
        actionsHtml = `
          <div style="display:flex;gap:8px;margin-top:16px;border-top:1px solid var(--border-tertiary);padding-top:14px">
            <button class="topbar-btn primary btn-book-prop" data-id="${p.id}" style="padding:5px 10px;font-size:11px;flex:1;justify-content:center"><i class="ti ti-calendar-event"></i> Book Now</button>
          </div>
        `;
      }
      
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="prop-thumb ${thumbClass}"><i class="ti ${thumbIcon}" aria-hidden="true"></i></div>
          <span class="prop-status ${statusBadgeClass}">${p.status}</span>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${p.title}</div>
          <div class="prop-loc"><i class="ti ti-map-pin"></i> ${p.address}, ${p.city}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">${p.description || 'No description provided.'}</div>
          
          <div style="display:flex;gap:12px;margin-top:12px;font-size:12px;color:var(--text-secondary);background:var(--bg-secondary);padding:8px 12px;border-radius:var(--radius-sm)">
            <span>Bedrooms: <strong>${p.bedrooms || 'N/A'}</strong></span>
            <span>Bathrooms: <strong>${p.bathrooms || 'N/A'}</strong></span>
            <span>Rent: <strong>₹${(p.rent_amount || 0).toLocaleString('en-IN')}/mo</strong></span>
          </div>
        </div>
        ${actionsHtml}
      `;
      
      // Attach listeners to newly created action buttons
      if (currentUser.role !== 'tenant') {
        card.querySelector('.btn-edit-prop').addEventListener('click', () => openPropertyModal(p.id));
        card.querySelector('.btn-delete-prop').addEventListener('click', () => handlePropertyDelete(p.id));
      } else if (p.status === 'vacant') {
        card.querySelector('.btn-book-prop').addEventListener('click', () => openBookingModal(p.id, p.title));
      }
      
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger)">Error: ${err.message}</div>`;
  }
}

function openPropertyModal(propertyId = null) {
  const form = DOM.forms.property;
  form.reset();
  
  const modalTitle = document.getElementById('prop-modal-title');
  const propIdInput = document.getElementById('prop-id-input');
  
  if (propertyId) {
    modalTitle.textContent = 'Edit Property Details';
    propIdInput.value = propertyId;
    
    // Fetch property details to populate form
    api.getProperty(propertyId).then(p => {
      document.getElementById('prop-title').value = p.title;
      document.getElementById('prop-address').value = p.address;
      document.getElementById('prop-city').value = p.city;
      document.getElementById('prop-type').value = p.type;
      document.getElementById('prop-bedrooms').value = p.bedrooms || '';
      document.getElementById('prop-bathrooms').value = p.bathrooms || '';
      document.getElementById('prop-rent').value = p.rent_amount;
      document.getElementById('prop-desc').value = p.description || '';
      document.getElementById('prop-status-select').value = p.status || 'vacant';
      
      DOM.modals.property.classList.add('active');
    }).catch(err => {
      showToast('Error getting property: ' + err.message, 'error');
    });
  } else {
    modalTitle.textContent = 'Register New Property';
    propIdInput.value = '';
    document.getElementById('prop-status-select').value = 'vacant';
    DOM.modals.property.classList.add('active');
  }
}

async function handlePropertySubmit(e) {
  e.preventDefault();
  const propId = document.getElementById('prop-id-input').value;
  
  const data = {
    title: document.getElementById('prop-title').value,
    address: document.getElementById('prop-address').value,
    city: document.getElementById('prop-city').value,
    type: document.getElementById('prop-type').value,
    bedrooms: document.getElementById('prop-bedrooms').value || null,
    bathrooms: document.getElementById('prop-bathrooms').value || null,
    rent_amount: document.getElementById('prop-rent').value,
    description: document.getElementById('prop-desc').value,
    status: document.getElementById('prop-status-select').value || 'vacant',
    manager_id: currentUser.id
  };
  
  try {
    if (propId) {
      await api.updateProperty(propId, data);
      showToast('Property updated successfully', 'success');
    } else {
      await api.createProperty(data);
      showToast('New property created successfully', 'success');
    }
    closeAllModals();
    await renderPropertiesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handlePropertyDelete(id) {
  if (confirm('Are you sure you want to delete this property? This cannot be undone.')) {
    try {
      await api.deleteProperty(id);
      showToast('Property deleted successfully', 'success');
      await renderPropertiesList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

// -------------------------------------------------------------
// VIEW 3: TENANTS (CRUD SCREEN)
// -------------------------------------------------------------
async function renderTenantsList() {
  const tableBody = document.getElementById('tenants-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary)">Loading tenants...</td></tr>';
  
  const addBtnDiv = document.getElementById('tenants-actions-wrap');
  if (addBtnDiv) {
    addBtnDiv.innerHTML = currentUser.role !== 'tenant' 
      ? '<button class="topbar-btn primary" id="btn-add-tenant"><i class="ti ti-plus"></i> Add tenant</button>' 
      : '';
    const addBtn = document.getElementById('btn-add-tenant');
    if (addBtn) addBtn.addEventListener('click', () => openTenantModal());
  }
  
  try {
    const tenants = await api.getTenants();
    const agreements = await api.getAgreements();
    const properties = await api.getProperties();
    
    tableBody.innerHTML = '';
    
    if (tenants.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No tenants registered yet.</td></tr>';
      return;
    }
    
    tenants.forEach(t => {
      // Find current agreement and property
      const activeAgr = agreements.find(a => a.tenant_id === t.id && a.status === 'active');
      let propertyName = 'Unassigned';
      if (activeAgr) {
        const prop = properties.find(p => p.id === activeAgr.property_id);
        if (prop) propertyName = prop.title;
      }
      
      const row = document.createElement('tr');
      
      let actionColumnHtml = '<td>—</td>';
      if (currentUser.role !== 'tenant') {
        actionColumnHtml = `
          <td>
            <button class="topbar-btn btn-edit-tenant" data-id="${t.id}" style="padding:4px 8px;font-size:11px;display:inline-flex"><i class="ti ti-edit"></i> Edit</button>
          </td>
        `;
      }
      
      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${t.name}</td>
        <td>${t.email}</td>
        <td>${t.phone || 'N/A'}</td>
        <td>
          <span class="prop-status ${propertyName === 'Unassigned' ? 'status-maintenance' : 'status-occupied'}">
            ${propertyName}
          </span>
        </td>
        ${actionColumnHtml}
      `;
      
      if (currentUser.role !== 'tenant') {
        row.querySelector('.btn-edit-tenant').addEventListener('click', () => openTenantModal(t.id));
      }
      
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function openTenantModal(tenantId = null) {
  const form = DOM.forms.tenant;
  form.reset();
  
  const modalTitle = document.getElementById('tenant-modal-title');
  const tenantIdInput = document.getElementById('tenant-id-input');
  
  if (tenantId) {
    modalTitle.textContent = 'Edit Tenant Details';
    tenantIdInput.value = tenantId;
    
    api.getTenants().then(list => {
      const t = list.find(x => x.id === tenantId);
      if (t) {
        document.getElementById('tenant-name').value = t.name;
        document.getElementById('tenant-email').value = t.email;
        document.getElementById('tenant-phone').value = t.phone || '';
        document.getElementById('tenant-emergency').value = t.emergency_contact || '';
        
        DOM.modals.tenant.classList.add('active');
      }
    });
  } else {
    modalTitle.textContent = 'Onboard New Tenant';
    tenantIdInput.value = '';
    DOM.modals.tenant.classList.add('active');
  }
}

async function handleTenantSubmit(e) {
  e.preventDefault();
  const tenantId = document.getElementById('tenant-id-input').value;
  
  const data = {
    name: document.getElementById('tenant-name').value,
    email: document.getElementById('tenant-email').value,
    phone: document.getElementById('tenant-phone').value,
    emergency_contact: document.getElementById('tenant-emergency').value
  };
  
  try {
    if (tenantId) {
      await api.updateTenant(tenantId, data);
      showToast('Tenant profile updated', 'success');
    } else {
      await api.createTenant(data);
      showToast('Tenant onboarded successfully', 'success');
    }
    closeAllModals();
    await renderTenantsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// VIEW 4: AGREEMENTS
// -------------------------------------------------------------
async function renderAgreementsList() {
  const tableBody = document.getElementById('agreements-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary)">Loading lease agreements...</td></tr>';
  
  const addBtnDiv = document.getElementById('agreements-actions-wrap');
  if (addBtnDiv) {
    addBtnDiv.innerHTML = currentUser.role !== 'tenant' 
      ? '<button class="topbar-btn primary" id="btn-add-agreement"><i class="ti ti-plus"></i> New lease agreement</button>' 
      : '';
    const addBtn = document.getElementById('btn-add-agreement');
    if (addBtn) addBtn.addEventListener('click', () => openAgreementModal());
  }

  try {
    const list = await api.getAgreements();
    const properties = await api.getProperties();
    const tenants = await api.getTenants();
    
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">No agreements registered yet.</td></tr>';
      return;
    }
    
    // Sort active first
    list.sort((a, b) => (a.status === 'active' ? -1 : 1));
    
    list.forEach(a => {
      const prop = properties.find(p => p.id === a.property_id);
      const tenant = tenants.find(t => t.id === a.tenant_id);
      
      const row = document.createElement('tr');
      
      let statusClass = 'status-vacant';
      if (a.status === 'active') statusClass = 'status-occupied';
      else if (a.status === 'terminated') statusClass = 'status-maintenance';
      
      let actionColumn = '<td>—</td>';
      if (currentUser.role !== 'tenant' && a.status === 'active') {
        actionColumn = `
          <td>
            <button class="topbar-btn btn-terminate-agreement" data-id="${a.id}" style="padding:4px 8px;font-size:11px;color:var(--danger);border-color:var(--danger-bg)"><i class="ti ti-ban"></i> Terminate</button>
          </td>
        `;
      }
      
      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${prop ? prop.title : 'Deleted Property'}</td>
        <td>${tenant ? tenant.name : 'Unknown'}</td>
        <td>${formatDateMedium(a.start_date)} to ${formatDateMedium(a.end_date)}</td>
        <td>₹${(a.rent_amount || 0).toLocaleString('en-IN')}/mo</td>
        <td style="font-weight:600;color:${a.outstanding_balance > 0 ? 'var(--danger-dot)' : 'var(--text-secondary)'}">
          ₹${(a.outstanding_balance || 0).toLocaleString('en-IN')}
        </td>
        <td><span class="prop-status ${statusClass}">${a.status}</span></td>
        ${actionColumn}
      `;
      
      if (currentUser.role !== 'tenant' && a.status === 'active') {
        row.querySelector('.btn-terminate-agreement').addEventListener('click', () => handleAgreementTerminate(a.id));
      }
      
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openAgreementModal() {
  const form = DOM.forms.agreement;
  form.reset();
  
  const propSelect = document.getElementById('agreement-property-id');
  const tenantSelect = document.getElementById('agreement-tenant-id');
  
  propSelect.innerHTML = '<option value="">-- Loading Vacant Properties --</option>';
  tenantSelect.innerHTML = '<option value="">-- Loading Tenants --</option>';
  
  try {
    // 1. Populate vacant properties dropdown
    const props = await api.getProperties();
    const vacantProps = props.filter(p => p.status === 'vacant');
    
    propSelect.innerHTML = '<option value="">Select a property...</option>';
    if (vacantProps.length === 0) {
      propSelect.innerHTML = '<option value="">No vacant properties available</option>';
    } else {
      vacantProps.forEach(p => {
        propSelect.innerHTML += `<option value="${p.id}">${p.title} (Rent: ₹${(p.rent_amount || 0).toLocaleString('en-IN')}/mo)</option>`;
      });
    }
    
    // 2. Populate tenants dropdown
    const tenants = await api.getTenants();
    tenantSelect.innerHTML = '<option value="">Select a tenant...</option>';
    tenants.forEach(t => {
      tenantSelect.innerHTML += `<option value="${t.id}">${t.name} (${t.email})</option>`;
    });
    
    // Auto-calculate rent fill on property select
    propSelect.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const selectedProp = props.find(p => p.id === selectedId);
      if (selectedProp) {
        document.getElementById('agreement-rent').value = selectedProp.rent_amount;
        document.getElementById('agreement-deposit').value = selectedProp.rent_amount * 2; // Default 2 mo deposit
      }
    });
    
    DOM.modals.agreement.classList.add('active');
  } catch (err) {
    showToast('Failed to populate selectors: ' + err.message, 'error');
  }
}

async function handleAgreementSubmit(e) {
  e.preventDefault();
  
  const data = {
    property_id: document.getElementById('agreement-property-id').value,
    tenant_id: document.getElementById('agreement-tenant-id').value,
    start_date: document.getElementById('agreement-start-date').value,
    end_date: document.getElementById('agreement-end-date').value,
    rent_amount: document.getElementById('agreement-rent').value,
    deposit_amount: document.getElementById('agreement-deposit').value
  };
  
  if (!data.property_id || !data.tenant_id || !data.start_date || !data.end_date) {
    showToast('Please fill out all required fields', 'error');
    return;
  }
  
  try {
    await api.createAgreement(data);
    showToast('Lease agreement created successfully! Property status updated to Occupied.', 'success');
    closeAllModals();
    await renderAgreementsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAgreementTerminate(id) {
  if (confirm('Are you sure you want to terminate this agreement early? The property status will shift to Vacant.')) {
    try {
      await api.terminateAgreement(id);
      showToast('Agreement terminated. Property is now vacant.', 'success');
      await renderAgreementsList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

// -------------------------------------------------------------
// VIEW 5: PAYMENTS
// -------------------------------------------------------------
async function renderPaymentsList() {
  const tableBody = document.getElementById('payments-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary)">Loading ledger records...</td></tr>';
  
  try {
    const list = await api.getPayments();
    const agreements = await api.getAgreements();
    const properties = await api.getProperties();
    const tenants = await api.getTenants();
    
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No payment records.</td></tr>';
      return;
    }
    
    // Sort pending and overdue first, then by date descending
    list.sort((a, b) => {
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      return new Date(b.due_date) - new Date(a.due_date);
    });
    
    list.forEach(p => {
      const agr = agreements.find(a => a.id === p.agreement_id);
      let propName = 'Unknown Property';
      let tenantName = 'Unknown Tenant';
      
      if (agr) {
        const prop = properties.find(x => x.id === agr.property_id);
        if (prop) propName = prop.title;
        const tenant = tenants.find(x => x.id === agr.tenant_id);
        if (tenant) tenantName = tenant.name;
      }
      
      const row = document.createElement('tr');
      
      let statusBadge = '';
      if (p.status === 'paid') statusBadge = '<span class="prop-status status-occupied">Paid</span>';
      else if (p.status === 'pending') statusBadge = '<span class="prop-status status-vacant">Pending</span>';
      else statusBadge = '<span class="prop-status status-maintenance">Overdue</span>';
      
      let actionColumn = '<td>—</td>';
      if (currentUser.role !== 'tenant' && p.status !== 'paid') {
        actionColumn = `
          <td>
            <button class="topbar-btn primary btn-pay-record" data-id="${p.id}" style="padding:4px 8px;font-size:11px"><i class="ti ti-cash"></i> Collect</button>
          </td>
        `;
      }
      
      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${propName}</td>
        <td>${tenantName}</td>
        <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
        <td>${formatDateMedium(p.due_date)}</td>
        <td>${statusBadge}</td>
        <td>${p.payment_date ? `${formatDateMedium(p.payment_date)} (${p.payment_method || 'UPI'})` : '—'}</td>
        ${currentUser.role !== 'tenant' ? actionColumn : ''}
      `;
      
      if (currentUser.role !== 'tenant' && p.status !== 'paid') {
        row.querySelector('.btn-pay-record').addEventListener('click', () => openPaymentModal(p.id, p.amount));
      }
      
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function openPaymentModal(paymentId, amount) {
  document.getElementById('payment-id-input').value = paymentId;
  document.getElementById('payment-amount-display').textContent = `₹${(amount || 0).toLocaleString('en-IN')}`;
  
  DOM.modals.payment.classList.add('active');
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const paymentId = document.getElementById('payment-id-input').value;
  const method = document.getElementById('payment-method').value;
  
  try {
    await api.recordPayment(paymentId, { payment_method: method });
    showToast('Payment recorded successfully! Balance updated.', 'success');
    closeAllModals();
    await renderPaymentsList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// VIEW 6: SETTINGS
// -------------------------------------------------------------
function loadSettingsData() {
  const details = document.getElementById('settings-profile-details');
  if (!details) return;
  
  const isTenant = currentUser.role === 'tenant';
  
  details.innerHTML = `
    <div class="card" style="max-width: 500px">
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:14px">Profile Details</div>
      
      <form id="form-profile-update">
        <div class="form-group">
          <label class="form-label" for="profile-name">Full Name</label>
          <input type="text" id="profile-name" class="form-control" value="${currentUser.name}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-email">Email Address</label>
          <input type="email" id="profile-email" class="form-control" value="${currentUser.email}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="profile-phone">Phone Number</label>
          <input type="text" id="profile-phone" class="form-control" value="${currentUser.phone || ''}">
        </div>
        ${isTenant ? `
        <div class="form-group">
          <label class="form-label" for="profile-emergency">Emergency Contact</label>
          <input type="text" id="profile-emergency" class="form-control" value="${currentUser.emergency_contact || ''}">
        </div>
        ` : ''}
        <button type="submit" class="topbar-btn primary" style="margin-top:16px; width:100%; justify-content:center">Save Profile Changes</button>
      </form>
    </div>
  `;

  document.getElementById('form-profile-update').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('profile-name').value,
      email: document.getElementById('profile-email').value,
      phone: document.getElementById('profile-phone').value
    };
    if (isTenant) {
      data.emergency_contact = document.getElementById('profile-emergency').value;
    }
    
    try {
      await api.updateUserProfile(currentUser.id, data);
      showToast('Profile updated successfully', 'success');
      await checkAuth();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------
function closeAllModals() {
  Object.keys(DOM.modals).forEach(name => {
    if (DOM.modals[name]) {
      DOM.modals[name].classList.remove('active');
    }
  });
}

function showToast(message, type = 'info') {
  DOM.toastMessage.textContent = message;
  
  DOM.toast.className = 'toast active';
  if (type === 'success') DOM.toast.classList.add('toast-success');
  else if (type === 'error') DOM.toast.classList.add('toast-error');
  else DOM.toast.classList.add('toast-info');
  
  setTimeout(() => {
    DOM.toast.classList.remove('active');
  }, 3000);
}

function formatDateMedium(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// -------------------------------------------------------------
// VIEW 7: USERS (ADMIN USER MANAGEMENT)
// -------------------------------------------------------------
async function renderUsersList() {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary)">Loading system accounts...</td></tr>';
  
  try {
    const list = await api.getUsers();
    tableBody.innerHTML = '';
    
    list.forEach(u => {
      const row = document.createElement('tr');
      
      const isDeactivated = u.status === 'deactivated';
      let statusBadge = isDeactivated 
        ? '<span class="prop-status status-maintenance">Deactivated</span>' 
        : '<span class="prop-status status-occupied">Active</span>';
        
      let actionBtnMarkup = '';
      if (currentUser.id !== u.id) {
        actionBtnMarkup = `
          <button class="topbar-btn btn-toggle-user" data-id="${u.id}" style="padding:4px 8px;font-size:11px;${isDeactivated ? 'color:var(--success);border-color:var(--success-bg)' : 'color:var(--danger);border-color:var(--danger-bg)'}">
            <i class="ti ${isDeactivated ? 'ti-circle-check' : 'ti-ban'}"></i> ${isDeactivated ? 'Activate' : 'Deactivate'}
          </button>
        `;
      } else {
        actionBtnMarkup = '<span style="font-size:11px;color:var(--text-tertiary)">Logged In</span>';
      }
      
      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${u.name}</td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td style="text-transform:capitalize">${u.role}</td>
        <td>${statusBadge}</td>
        <td>${actionBtnMarkup}</td>
      `;
      
      if (currentUser.id !== u.id) {
        row.querySelector('.btn-toggle-user').addEventListener('click', () => handleUserToggleStatus(u.id));
      }
      
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

function openUserModal() {
  const form = DOM.forms.user;
  form.reset();
  DOM.modals.user.classList.add('active');
}

async function handleUserSubmit(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('user-name').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    role: document.getElementById('user-role').value
  };
  
  try {
    await api.createAdminUser(data);
    showToast('User account created successfully!', 'success');
    closeAllModals();
    await renderUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleUserToggleStatus(id) {
  try {
    await api.toggleUserStatus(id);
    showToast('User account status updated', 'success');
    await renderUsersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// VIEW 8: BOOKING REQUESTS SYSTEM (Tenant & Manager Stories)
// -------------------------------------------------------------
function openBookingModal(propertyId, propertyTitle) {
  const form = DOM.forms.booking;
  form.reset();
  
  document.getElementById('booking-property-id').value = propertyId;
  document.getElementById('booking-property-title').textContent = propertyTitle;
  
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);
  
  document.getElementById('booking-start-date').value = today.toISOString().split('T')[0];
  
  const oneYearLater = new Date(nextMonth);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  document.getElementById('booking-end-date').value = oneYearLater.toISOString().split('T')[0];
  
  DOM.modals.booking.classList.add('active');
}

async function handleBookingSubmit(e) {
  e.preventDefault();
  const propertyId = document.getElementById('booking-property-id').value;
  const startDate = document.getElementById('booking-start-date').value;
  const endDate = document.getElementById('booking-end-date').value;
  
  try {
    const tenants = await api.getTenants();
    const tenant = tenants.find(t => t.user_id === currentUser.id);
    if (!tenant) {
      throw new Error('Tenant profile not found for this account.');
    }
    
    await api.createBookingRequest({
      property_id: propertyId,
      tenant_id: tenant.id,
      start_date: startDate,
      end_date: endDate
    });
    
    showToast('Booking request submitted to Manager!', 'success');
    closeAllModals();
    await renderPropertiesList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function renderBookingRequestsList() {
  const tableBody = document.getElementById('booking-requests-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary)">Loading booking requests...</td></tr>';
  
  try {
    const list = await api.getBookingRequests();
    const properties = await api.getProperties();
    const tenants = await api.getTenants();
    
    tableBody.innerHTML = '';
    
    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No pending booking requests.</td></tr>';
      return;
    }
    
    list.forEach(r => {
      const prop = properties.find(p => p.id === r.property_id);
      const tenant = tenants.find(t => t.id === r.tenant_id);
      
      const row = document.createElement('tr');
      
      let actionBtnMarkup = '—';
      if (currentUser.role !== 'tenant' && r.status === 'pending') {
        actionBtnMarkup = `
          <div style="display:flex;gap:6px;">
            <button class="topbar-btn primary btn-approve-request" data-id="${r.id}" style="padding:4px 8px;font-size:11px"><i class="ti ti-check"></i> Approve</button>
            <button class="topbar-btn btn-delete-request" data-id="${r.id}" style="padding:4px 8px;font-size:11px;color:var(--danger);border-color:var(--danger-bg)"><i class="ti ti-trash"></i> Reject</button>
          </div>
        `;
      }
      
      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${prop ? prop.title : 'Deleted Property'}</td>
        <td>${tenant ? tenant.name : 'Unknown Tenant'}</td>
        <td>${formatDateMedium(r.start_date)} to ${formatDateMedium(r.end_date)}</td>
        <td>${formatDateMedium(r.created_at || r.start_date)}</td>
        <td><span class="prop-status status-vacant">${r.status}</span></td>
        <td>${actionBtnMarkup}</td>
      `;
      
      if (currentUser.role !== 'tenant' && r.status === 'pending') {
        row.querySelector('.btn-approve-request').addEventListener('click', () => handleApproveBookingRequest(r.id));
        row.querySelector('.btn-delete-request').addEventListener('click', () => handleDeleteBookingRequest(r.id));
      }
      
      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function handleApproveBookingRequest(id) {
  if (confirm('Approve this booking request? This will create an active lease agreement and make the property occupied.')) {
    try {
      await api.approveBookingRequest(id);
      showToast('Booking request approved! Lease agreement created.', 'success');
      await renderBookingRequestsList();
      await updateBookingBadge();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function handleDeleteBookingRequest(id) {
  if (confirm('Are you sure you want to reject and delete this booking request?')) {
    try {
      await api.deleteBookingRequest(id);
      showToast('Booking request deleted.', 'success');
      await renderBookingRequestsList();
      await updateBookingBadge();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

async function updateBookingBadge() {
  try {
    const badge = document.getElementById('booking-requests-badge');
    if (!badge) return;
    const reqs = await api.getBookingRequests();
    const pendingCount = reqs.filter(r => r.status === 'pending').length;
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (e) {
    console.error(e);
  }
}

// -------------------------------------------------------------
// VIEW 8: MAINTENANCE TICKETS CONTROLLER
// -------------------------------------------------------------
async function renderMaintenanceList() {
  const tableBody = document.getElementById('maintenance-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-tertiary)">Loading maintenance tickets...</td></tr>';

  const addBtnDiv = document.getElementById('maint-actions-wrap');
  if (addBtnDiv) {
    // Only tenants submit tickets
    addBtnDiv.innerHTML = currentUser.role === 'tenant' 
      ? '<button class="topbar-btn primary" id="btn-add-maint"><i class="ti ti-plus"></i> Report Issue</button>' 
      : '';
    const addBtn = document.getElementById('btn-add-maint');
    if (addBtn) addBtn.addEventListener('click', () => openMaintenanceModal());
  }

  try {
    const list = await api.getMaintenanceTickets();
    const properties = await api.getProperties();
    tableBody.innerHTML = '';

    if (list.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No maintenance tickets registered yet.</td></tr>';
      return;
    }

    list.forEach(m => {
      const prop = properties.find(p => p.id === m.property_id);
      const row = document.createElement('tr');

      let badgeClass = 'badge-pending';
      if (m.status === 'urgent') badgeClass = 'badge-urgent';
      else if (m.status === 'done') badgeClass = 'badge-done';

      let actionButtons = '';
      if (currentUser.role !== 'tenant') {
        // Staff/Managers can edit status/notes and delete
        actionButtons = `
          <button class="topbar-btn btn-edit-maint" data-id="${m.id}" style="padding:4px 8px;font-size:11px;color:var(--primary);border-color:var(--primary-bg);margin-right:6px;"><i class="ti ti-edit"></i> Edit</button>
          <button class="topbar-btn btn-delete-maint" data-id="${m.id}" style="padding:4px 8px;font-size:11px;color:var(--danger);border-color:var(--danger-bg);"><i class="ti ti-trash"></i> Delete</button>
        `;
      } else {
        // Tenants can cancel/delete their pending ticket
        if (m.status === 'pending') {
          actionButtons = `
            <button class="topbar-btn btn-delete-maint" data-id="${m.id}" style="padding:4px 8px;font-size:11px;color:var(--danger);border-color:var(--danger-bg);"><i class="ti ti-ban"></i> Cancel</button>
          `;
        } else {
          actionButtons = '<span style="font-size:11px;color:var(--text-tertiary)">In Progress</span>';
        }
      }

      row.innerHTML = `
        <td style="font-weight:600;color:var(--text-primary)">${prop ? prop.title : 'Unknown Property'}</td>
        <td>${m.description}</td>
        <td>${formatDateMedium(m.reported_date)}</td>
        <td>${m.notes || '—'}</td>
        <td><span class="maint-badge ${badgeClass}">${m.status}</span></td>
        <td>${actionButtons}</td>
      `;

      if (currentUser.role !== 'tenant') {
        row.querySelector('.btn-edit-maint').addEventListener('click', () => openMaintenanceModal(m));
      }
      const delBtn = row.querySelector('.btn-delete-maint');
      if (delBtn) {
        delBtn.addEventListener('click', () => handleMaintenanceDelete(m.id));
      }

      tableBody.appendChild(row);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger)">Error: ${err.message}</td></tr>`;
  }
}

async function openMaintenanceModal(ticket = null) {
  const form = DOM.forms.maintenance;
  form.reset();

  const titleEl = document.getElementById('maint-modal-title');
  const propGroup = document.getElementById('maint-prop-group');
  const statusGroup = document.getElementById('maint-status-group');
  const notesGroup = document.getElementById('maint-notes-group');
  const descInput = document.getElementById('maint-description');
  const propSelect = document.getElementById('maint-property-id');

  // Clear modal inputs
  document.getElementById('maint-id-input').value = ticket ? ticket.id : '';

  if (ticket) {
    // EDIT TICKET (Manager/Admin Only)
    titleEl.textContent = 'Update Maintenance Ticket';
    descInput.value = ticket.description;
    descInput.disabled = true; // Description should be read-only for updates

    if (currentUser.role !== 'tenant') {
      propGroup.style.display = 'none';
      statusGroup.style.display = 'block';
      notesGroup.style.display = 'block';
      document.getElementById('maint-status').value = ticket.status;
      document.getElementById('maint-notes').value = ticket.notes || '';
    }
  } else {
    // CREATE TICKET
    titleEl.textContent = 'Report Maintenance Issue';
    descInput.disabled = false;
    descInput.value = '';

    statusGroup.style.display = 'none';
    notesGroup.style.display = 'none';

    if (currentUser.role !== 'tenant') {
      // Manager/Admin reporting on behalf of a property
      propGroup.style.display = 'block';
      propSelect.innerHTML = '<option value="">Loading properties...</option>';
      try {
        const props = await api.getProperties();
        propSelect.innerHTML = '<option value="">Select a property...</option>';
        props.forEach(p => {
          propSelect.innerHTML += `<option value="${p.id}">${p.title}</option>`;
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      propGroup.style.display = 'none';
    }
  }

  DOM.modals.maintenance.classList.add('active');
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const ticketId = document.getElementById('maint-id-input').value;
  const description = document.getElementById('maint-description').value;

  try {
    if (ticketId) {
      // Update existing ticket (Manager Only)
      const data = {
        status: document.getElementById('maint-status').value,
        notes: document.getElementById('maint-notes').value
      };
      await api.updateMaintenanceTicket(parseInt(ticketId), data);
      showToast('Maintenance ticket updated successfully!', 'success');
    } else {
      // Create new ticket
      const data = {
        description: description
      };
      if (currentUser.role !== 'tenant') {
        const propId = document.getElementById('maint-property-id').value;
        if (!propId) {
          showToast('Please select a property', 'error');
          return;
        }
        data.property_id = parseInt(propId);
      }
      await api.createMaintenanceTicket(data);
      showToast('Maintenance ticket submitted successfully!', 'success');
    }
    closeAllModals();
    await renderMaintenanceList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleMaintenanceDelete(ticketId) {
  const confirmMsg = currentUser.role === 'tenant' 
    ? 'Are you sure you want to cancel this maintenance ticket?' 
    : 'Are you sure you want to delete this maintenance ticket permanently?';
  
  if (confirm(confirmMsg)) {
    try {
      await api.deleteMaintenanceTicket(ticketId);
      showToast('Maintenance ticket removed successfully.', 'success');
      await renderMaintenanceList();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}
