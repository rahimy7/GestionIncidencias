import React, { useState, useEffect } from 'react';
import { Download, Send } from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi
import CountItemTable from '../../components/inventory/CountItemTable';

export default function MyWorkPool() {
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'assigned', // assigned, counted, rejected
    division: '',
    group: ''
  });
  
  useEffect(() => {
    loadItems();
  }, [filters]);
  
  const loadItems = async () => {
    try {
      const data = await inventoryApi.getMyWorkPool(filters);
      setItems(data);
    } catch (error) {
      console.error('Error loading work pool:', error);
    }
  };
  
  const handleExportExcel = () => {
    // TODO: Generar hoja de Excel con los items seleccionados
    const selectedItems = items.filter(item => selectedIds.includes(item.id));
    // Usar librería como xlsx o exceljs
  };
  
  const handleSubmitBatch = async () => {
    if (!selectedIds.length) {
      alert('Seleccione al menos un item contado');
      return;
    }
    
    const countedItems = items.filter(item => 
      selectedIds.includes(item.id) && item.status === 'counted'
    );
    
    if (countedItems.length !== selectedIds.length) {
      alert('Solo puede enviar items que ya han sido contados');
      return;
    }
    
    try {
      await inventoryApi.submitBatch({ itemIds: selectedIds });
      alert('Conteos enviados para revisión exitosamente');
      loadItems();
      setSelectedIds([]);
    } catch (error) {
      console.error('Error submitting batch:', error);
      alert('Error al enviar conteos');
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mi Pool de Trabajo</h1>
        
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            disabled={!selectedIds.length}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            <Download size={20} />
            Exportar Hoja de Conteo
          </button>
          
          <button
            onClick={handleSubmitBatch}
            disabled={!selectedIds.length}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Send size={20} />
            Enviar Conteos
          </button>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="assigned">Asignados</option>
              <option value="counted">Contados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>
          
          {/* Más filtros... */}
        </div>
      </div>
      
      {/* Tabla de items */}
      <CountItemTable
        items={items}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onCountUpdate={loadItems}
      />
    </div>
  );
}