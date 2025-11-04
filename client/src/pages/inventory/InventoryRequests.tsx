// client/src/pages/inventory/InventoryRequests.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';

export default function InventoryRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadRequests();
  }, []);
  
  const loadRequests = async () => {
    try {
      const data = await inventoryApi.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Cargando...</div>;
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Solicitudes de Inventario</h1>
        <Link
          to="/inventory/requests/new"
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          <Plus size={20} />
          Nueva Solicitud
        </Link>
      </div>
      
      <div className="grid gap-4">
        {requests.map(request => (
          <Link
            key={request.id}
            to={`/inventory/requests/${request.id}`}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{request.requestNumber}</h3>
                <p className="text-sm text-gray-600">{request.comments}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                request.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}