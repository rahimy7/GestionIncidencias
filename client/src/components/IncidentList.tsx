import { useEffect, useMemo } from "react";
import { useSearch } from "wouter"; // o react-router-dom: useSearchParams
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval } from "date-fns";

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  status: "reported" | "in_progress" | "resolved" | string;
  priority: "low" | "medium" | "high" | "critical" | string;
  centerId: string;
  typeId: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  center?: { id: string; name: string; code: string };
  type?: { id: string; name: string };
};

type Center = { id: string; name: string; code?: string };
type IncidentType = { id: string; name: string };

type SortBy = "center" | "type" | "createdAt";
type SortDir = "asc" | "desc";

function useQueryString() {
  const search = useSearch(); // ?centerId=...&typeId=...
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const get = (k: string) => params.get(k) || "";
  const setMany = (entries: Record<string, string | undefined | null>) => {
    const p = new URLSearchParams(search);
    Object.entries(entries).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    const qs = p.toString();
    // Cambia esto si usas react-router-dom: navigate({ search: `?${qs}` }, { replace: true })
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  return { get, setMany, all: params };
}

export default function IncidentList() {
  const { get, setMany } = useQueryString();

  // Lee filtros iniciales desde la URL
  const centerId = get("centerId");
  const typeId = get("typeId");
  const startDate = get("startDate"); // yyyy-MM-dd
  const endDate = get("endDate");     // yyyy-MM-dd
  const sortBy = (get("sortBy") as SortBy) || "createdAt";
  const sortDir = (get("sortDir") as SortDir) || "desc";

  // Carga datos base
  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["incidents", { centerId, typeId, startDate, endDate, sortBy, sortDir }],
    // 1) Intenta server-side filtering/sorting si tu API ya lo soporta
    // 2) Si no, quita los query params en la URL y filtra/ordena en cliente (ver "clientFiltered" abajo)
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (centerId) qs.set("centerId", centerId);
      if (typeId) qs.set("typeId", typeId);
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (sortBy) qs.set("sortBy", sortBy);
      if (sortDir) qs.set("sortDir", sortDir);
      const url = `/api/incidents${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudo cargar incidencias");
      return await res.json();
    },
    // Si tu endpoint todavía NO filtra/ordena, cambia la key a ["incidents"] y haz todo en cliente
  });

  // Opcional: cargar catálogos (mejor UX que deducir desde incidents)
  const { data: centers = [] } = useQuery<Center[]>({
    queryKey: ["centers"],
    queryFn: async () => {
      const res = await fetch("/api/centers");
      if (!res.ok) return []; // fallback
      return res.json();
    },
  });

  const { data: types = [] } = useQuery<IncidentType[]>({
    queryKey: ["incident-types"],
    queryFn: async () => {
      const res = await fetch("/api/incident-types");
      if (!res.ok) return []; // fallback
      return res.json();
    },
  });

  // Fallback: si el server NO filtra/ordena, hazlo en cliente.
  const clientFiltered = useMemo(() => {
    let data = [...incidents];

    // Filtro por tienda / tipo
    if (centerId) data = data.filter(i => i.centerId === centerId);
    if (typeId) data = data.filter(i => i.typeId === typeId);

    // Filtro por fecha (en base a createdAt)
    if (startDate || endDate) {
      const start = startDate ? parseISO(`${startDate}T00:00:00.000Z`) : undefined;
      const end = endDate ? parseISO(`${endDate}T23:59:59.999Z`) : undefined;
      data = data.filter(i => {
        const d = parseISO(i.createdAt);
        if (start && end) return isWithinInterval(d, { start, end });
        if (start) return d >= start;
        if (end) return d <= end;
        return true;
      });
    }

    // Orden
    data.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      if (sortBy === "center") {
        av = a.center?.name || "";
        bv = b.center?.name || "";
      } else if (sortBy === "type") {
        av = a.type?.name || "";
        bv = b.type?.name || "";
      } else {
        // createdAt
        av = +new Date(a.createdAt);
        bv = +new Date(b.createdAt);
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [incidents, centerId, typeId, startDate, endDate, sortBy, sortDir]);

  // Opciones de selects (si no tienes endpoints, se deducen del dataset actual)
  const centerOptions: Center[] = useMemo(() => {
    if (centers.length) return centers;
    const map = new Map<string, Center>();
    incidents.forEach(i => {
      if (i.center) map.set(i.center.id, { id: i.center.id, name: i.center.name, code: i.center.code });
      else if (i.centerId) map.set(i.centerId, { id: i.centerId, name: i.centerId });
    });
   const arr: Center[] = [];
map.forEach((v) => arr.push(v));
return arr;

  }, [centers, incidents]);

  const typeOptions: IncidentType[] = useMemo(() => {
    if (types.length) return types;
    const map = new Map<string, IncidentType>();
    incidents.forEach(i => {
      if (i.type) map.set(i.type.id, { id: i.type.id, name: i.type.name });
      else if (i.typeId) map.set(i.typeId, { id: i.typeId, name: i.typeId });
    });
    const arr: Center[] = [];
map.forEach((v) => arr.push(v));
return arr;

  }, [types, incidents]);

  const onFilterChange = (patch: Partial<{ centerId: string; typeId: string; startDate: string; endDate: string; sortBy: SortBy; sortDir: SortDir }>) => {
    setMany(patch);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Incidencias</h1>

      {/* Controles */}
      <div className="grid gap-3 md:grid-cols-6">
        <div className="col-span-2">
          <label className="block text-sm mb-1">Tienda</label>
          <select
            className="w-full rounded border p-2"
            value={centerId}
            onChange={(e) => onFilterChange({ centerId: e.target.value })}
          >
            <option value="">Todas</option>
            {centerOptions.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1">Tipo de incidencia</label>
          <select
            className="w-full rounded border p-2"
            value={typeId}
            onChange={(e) => onFilterChange({ typeId: e.target.value })}
          >
            <option value="">Todos</option>
            {typeOptions.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Desde</label>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Hasta</label>
          <input
            type="date"
            className="w-full rounded border p-2"
            value={endDate}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Ordenamiento */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-sm mb-1">Ordenar por</label>
          <select
            className="w-full rounded border p-2"
            value={sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as SortBy })}
          >
            <option value="createdAt">Fecha de creación</option>
            <option value="center">Tienda</option>
            <option value="type">Tipo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Dirección</label>
          <select
            className="w-full rounded border p-2"
            value={sortDir}
            onChange={(e) => onFilterChange({ sortDir: e.target.value as SortDir })}
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Título</th>
              <th className="p-2 border">Tienda</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Prioridad</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Creada</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-3 border" colSpan={7}>Cargando…</td></tr>
            ) : clientFiltered.length === 0 ? (
              <tr><td className="p-3 border" colSpan={7}>Sin resultados</td></tr>
            ) : (
              clientFiltered.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{i.incidentNumber}</td>
                  <td className="p-2 border">{i.title}</td>
                  <td className="p-2 border">{i.center?.name ?? i.centerId}</td>
                  <td className="p-2 border">{i.type?.name ?? i.typeId}</td>
                  <td className="p-2 border">{i.priority}</td>
                  <td className="p-2 border">{i.status}</td>
                  <td className="p-2 border">{format(parseISO(i.createdAt), "yyyy-MM-dd HH:mm")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export { default as IncidentsList } from "./IncidentList";
