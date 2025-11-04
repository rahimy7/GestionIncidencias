const API_BASE = '/api/inventory';

export const inventoryApi = {
  // Solicitudes
  async createRequest(data: any) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create request');
    return res.json();
  },
  
  async getRequests(filters: any = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/requests?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },
  
  async getRequestDetail(id: string) {
    const res = await fetch(`${API_BASE}/requests/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch request');
    return res.json();
  },
  
  async sendRequest(id: string) {
    const res = await fetch(`${API_BASE}/requests/${id}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to send request');
    return res.json();
  },
  
  // Pool de trabajo
  async getMyWorkPool(filters: any = {}) {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${API_BASE}/my-work-pool?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch work pool');
    return res.json();
  },
  
  // Registrar conteo
  async registerCount(itemId: string, data: {
    physicalCount: number;
    counterComment?: string;
  }) {
    const res = await fetch(`${API_BASE}/items/${itemId}/count-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to register count');
    return res.json();
  },
  
  // Enviar lote
  async submitBatch(data: { itemIds: string[] }) {
    const res = await fetch(`${API_BASE}/items/submit-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit batch');
    return res.json();
  },
  
  // Pool del gerente
  async getManagerReviewPool() {
    const res = await fetch(`${API_BASE}/manager/review-pool`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch review pool');
    return res.json();
  },
  
  // Aprobar/Rechazar
  async approveItem(itemId: string, managerComment?: string) {
    const res = await fetch(`${API_BASE}/items/${itemId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ managerComment })
    });
    if (!res.ok) throw new Error('Failed to approve item');
    return res.json();
  },
  
  async rejectItem(itemId: string, managerComment: string) {
    const res = await fetch(`${API_BASE}/items/${itemId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ managerComment })
    });
    if (!res.ok) throw new Error('Failed to reject item');
    return res.json();
  }
};