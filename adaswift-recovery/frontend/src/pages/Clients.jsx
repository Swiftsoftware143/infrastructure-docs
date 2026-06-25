import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Power,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  Tag,
  MapPin,
  Filter,
  X,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate, sortByKey } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
import ClientFormModal from "@/components/ClientFormModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Client Name" },
  { key: "domain", label: "Domain" },
  { key: "tags", label: "Tags" },
  { key: "location", label: "Location" },
  { key: "plan_tier", label: "Plan Tier" },
  { key: "active", label: "Status" },
  { key: "created_at", label: "Date Added" },
];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availableTags, setAvailableTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [addOpen, setAddOpen] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const navigate = useNavigate();

  const loadFilters = useCallback(async () => {
    // Load tags from settings (Tag Manager) first
    console.log("Loading tags from settings...");
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "tags")
      .maybeSingle();
    
    console.log("Settings data:", settingsData, "Error:", settingsError);
    
    const allTags = new Set();
    
    if (settingsData?.value) {
      const parsed = typeof settingsData.value === 'string'
        ? settingsData.value.split(',').map(t => t.trim()).filter(Boolean)
        : Array.isArray(settingsData.value) ? settingsData.value : [];
      console.log("Parsed tags from settings:", parsed);
      parsed.forEach(t => allTags.add(t));
    } else {
      console.log("No tags found in settings, using defaults");
    }
    
    // Also load from existing clients/websites
    const [{ data: clientsData }, { data: websitesData }] = await Promise.all([
      supabase.from("clients").select("tags,location"),
      supabase.from("personal_websites").select("tags,location"),
    ]);
    
    const allLocs = new Set();
    [...(clientsData || []), ...(websitesData || [])].forEach(item => {
      // Parse tags (comma-separated or array)
      if (item.tags) {
        if (typeof item.tags === 'string') {
          item.tags.split(',').forEach(t => allTags.add(t.trim()));
        } else if (Array.isArray(item.tags)) {
          item.tags.forEach(t => allTags.add(t));
        }
      }
      if (item.location) allLocs.add(item.location);
    });
    
    const finalTags = Array.from(allTags).sort();
    console.log("Final available tags:", finalTags);
    
    // Fallback to default tags if none found
    if (finalTags.length === 0) {
      const defaults = ["Medical", "Local Business", "E-commerce", "Professional Services", "Non-Profit", "Enterprise", "Basic Plan", "Pro Plan"];
      console.log("Using default tags:", defaults);
      setAvailableTags(defaults);
    } else {
      setAvailableTags(finalTags);
    }
    setLocations(Array.from(allLocs).sort());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    console.log("Loading clients...");
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading clients:", error);
      toast.error(error.message);
    } else {
      console.log("Loaded clients:", data?.length || 0, data);
      setClients(data || []);
    }
    setLoading(false);
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (client, e) => {
    e.stopPropagation();
    const newVal = !client.active;
    const { error } = await supabase
      .from("clients")
      .update({ active: newVal })
      .eq("id", client.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`${client.name} ${newVal ? "activated" : "deactivated"}`);
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, active: newVal } : c))
    );
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("clients").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Failed to delete client");
      return;
    }
    toast.success(`${toDelete.name} deleted`);
    setClients((prev) => prev.filter((c) => c.id !== toDelete.id));
    setToDelete(null);
    loadFilters();
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.domain?.toLowerCase().includes(search.toLowerCase()) ||
        c.plan_tier?.toLowerCase().includes(search.toLowerCase()) ||
        c.tags?.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase());
      
      // Check if client has the selected tag
      const clientTags = c.tags ? (typeof c.tags === 'string' ? c.tags.split(',').map(t => t.trim()) : c.tags) : [];
      const matchesTag = tagFilter === "all" || clientTags.includes(tagFilter);
      const matchesLocation = locationFilter === "all" || c.location === locationFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && c.active) || 
        (statusFilter === "inactive" && !c.active);
      
      return matchesSearch && matchesTag && matchesLocation && matchesStatus;
    });
  }, [clients, search, tagFilter, locationFilter, statusFilter]);

  const filteredSorted = useMemo(
    () => sortByKey(filteredClients, sortKey, sortDir),
    [filteredClients, sortKey, sortDir]
  );

  const clearFilters = () => {
    setTagFilter("all");
    setLocationFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const hasFilters = tagFilter !== "all" || locationFilter !== "all" || statusFilter !== "all" || search !== "";

  const renderTable = () => {
    if (loading) {
      return <div className="p-10 text-center text-[#64748b] text-sm">Loading...</div>;
    }
    if (clients.length === 0) {
      return <ClientsEmptyState onAdd={() => setAddOpen(true)} />;
    }
    if (filteredSorted.length === 0) {
      return (
        <div className="p-10 text-center text-[#64748b] text-sm" data-testid="clients-no-results">
          No clients match your filters
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-2 text-[#007bff] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="clients-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-[#64748b]">
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-6 py-3 font-bold">
                  <button
                    onClick={() => handleSort(col.key)}
                    data-testid={`sort-${col.key}`}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors uppercase tracking-[0.15em] font-bold"
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-6 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                data-testid={`client-row-${c.id}`}
                className="border-t border-[#2e3245] hover:bg-[#1a1d27]/60 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-white font-medium">{c.name}</td>
                <td className="px-6 py-4 text-[#94a3b8] font-mono text-xs">{c.domain}</td>
                <td className="px-6 py-4">
                  {c.tags ? (
                    <div className="flex flex-wrap gap-1">
                      {(typeof c.tags === 'string' ? c.tags.split(',').map(t => t.trim()) : c.tags).slice(0, 3).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#007bff]/10 text-[#007bff] text-xs">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {(typeof c.tags === 'string' ? c.tags.split(',').map(t => t.trim()) : c.tags).length > 3 && (
                        <span className="text-[#64748b] text-xs">+{(typeof c.tags === 'string' ? c.tags.split(',').map(t => t.trim()) : c.tags).length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#64748b] text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {c.location ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </span>
                  ) : (
                    <span className="text-[#64748b] text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#94a3b8]">
                    {c.plan_tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge active={c.active} testId={`status-${c.id}`} />
                </td>
                <td className="px-6 py-4 text-[#94a3b8] text-xs">{formatDate(c.created_at)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn
                      title="Edit"
                      testId={`edit-btn-${c.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/clients/${c.id}`);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title={c.active ? "Deactivate" : "Activate"}
                      testId={`toggle-btn-${c.id}`}
                      onClick={(e) => toggleActive(c, e)}
                      colorClass={
                        c.active
                          ? "hover:text-[#ef4444] hover:border-[#ef4444]/40"
                          : "hover:text-[#10b981] hover:border-[#10b981]/40"
                      }
                    >
                      <Power className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Delete"
                      testId={`delete-btn-${c.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(c);
                      }}
                      colorClass="hover:text-[#ef4444] hover:border-[#ef4444]/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div data-testid="clients-page">
      <PageHeader
        eyebrow="Accounts"
        title="Clients"
        subtitle="Manage every client deploying the SwiftImpact ADA widget."
        actions={
          <div className="flex gap-2">

            <Button
              data-testid="add-new-client-btn"
              onClick={() => setAddOpen(true)}
              className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-[0_0_15px_rgba(0,123,255,0.25)] hover:shadow-[0_0_22px_rgba(0,123,255,0.45)] transition-shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add new client
            </Button>
          </div>
        }
      />

      <div className="bg-[#1e2130] border border-[#2e3245] rounded-xl">
        <div className="px-6 py-4 border-b border-[#2e3245] space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b] pointer-events-none" />
              <Input
                data-testid="clients-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients, domains, plans..."
                className="pl-9 bg-[#0f1117] border-[#2e3245] text-white placeholder:text-[#64748b] focus-visible:ring-[#007bff] focus-visible:border-transparent"
              />
            </div>
            
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[160px] bg-[#0f1117] border-[#2e3245] text-white">
                <Tag className="h-4 w-4 mr-2 text-[#64748b]" />
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e2130] border-[#2e3245]">
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[160px] bg-[#0f1117] border-[#2e3245] text-white">
                <MapPin className="h-4 w-4 mr-2 text-[#64748b]" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e2130] border-[#2e3245]">
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-[#0f1117] border-[#2e3245] text-white">
                <Activity className="h-4 w-4 mr-2 text-[#64748b]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e2130] border-[#2e3245]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-[#64748b] hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="text-xs text-[#64748b]" data-testid="clients-count">
            {filteredSorted.length} {filteredSorted.length === 1 ? "client" : "clients"}
            {hasFilters && ` (filtered from ${clients.length})`}
          </div>
        </div>

        {renderTable()}
      </div>

      <ClientFormModal open={addOpen} onOpenChange={setAddOpen} onCreated={() => { console.log("Client created, refreshing..."); load(); }} />

      <DeleteConfirmModal
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        clientName={toDelete?.name}
      />
    </div>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-60" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

function IconBtn({ children, onClick, title, testId, colorClass = "hover:text-white hover:border-[#3e445e]" }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md border border-[#2e3245] bg-[#0f1117] text-[#94a3b8] transition-colors ${colorClass}`}
    >
      {children}
    </button>
  );
}

function ClientsEmptyState({ onAdd }) {
  return (
    <div className="p-14 text-center" data-testid="clients-empty-state">
      <div className="h-14 w-14 mx-auto rounded-xl bg-[#0f1117] border border-[#2e3245] grid place-items-center mb-4">
        <Inbox className="h-6 w-6 text-[#64748b]" />
      </div>
      <h3
        className="text-white font-semibold tracking-tight text-lg"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        No clients yet
      </h3>
      <p className="text-sm text-[#94a3b8] mt-1.5 mb-5">
        Add your first one to start configuring widgets.
      </p>
      <Button
        onClick={onAdd}
        data-testid="empty-add-first-btn"
        className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-[0_0_15px_rgba(0,123,255,0.25)]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add your first client
      </Button>
    </div>
  );
}
