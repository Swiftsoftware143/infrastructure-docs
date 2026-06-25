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
import CategoryManager from "@/components/CategoryManager";
import { toast } from "sonner";

const COLUMNS = [
  { key: "name", label: "Website Name" },
  { key: "domain", label: "Domain" },
  { key: "tags", label: "Tags" },
  { key: "location", label: "Location" },
  { key: "plan_tier", label: "Plan Tier" },
  { key: "active", label: "Status" },
  { key: "created_at", label: "Date Added" },
];

export default function PersonalWebsites() {
  const [websites, setWebsites] = useState([]);
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
    const { data: settingsData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "tags")
      .maybeSingle();
    
    const allTags = new Set();
    
    if (settingsData?.value) {
      const parsed = typeof settingsData.value === 'string'
        ? settingsData.value.split(',').map(t => t.trim()).filter(Boolean)
        : Array.isArray(settingsData.value) ? settingsData.value : [];
      parsed.forEach(t => allTags.add(t));
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
    
    // Fallback to default tags if none found
    if (finalTags.length === 0) {
      const defaults = ["Medical", "Local Business", "E-commerce", "Professional Services", "Non-Profit", "Enterprise", "Basic Plan", "Pro Plan"];
      setAvailableTags(defaults);
    } else {
      setAvailableTags(finalTags);
    }
    setLocations(Array.from(allLocs).sort());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    console.log("Loading personal websites...");
    const { data, error } = await supabase
      .from("personal_websites")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading personal websites:", error);
      toast.error(error.message);
    } else {
      console.log("Loaded personal websites:", data?.length || 0, data);
      setWebsites(data || []);
    }
    setLoading(false);
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (website, e) => {
    e.stopPropagation();
    const newVal = !website.active;
    const { error } = await supabase
      .from("personal_websites")
      .update({ active: newVal })
      .eq("id", website.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`${website.name} ${newVal ? "activated" : "deactivated"}`);
    setWebsites((prev) =>
      prev.map((w) => (w.id === website.id ? { ...w, active: newVal } : w))
    );
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("personal_websites").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Failed to delete website");
      return;
    }
    toast.success(`${toDelete.name} deleted`);
    setWebsites((prev) => prev.filter((w) => w.id !== toDelete.id));
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

  const filteredWebsites = useMemo(() => {
    return websites.filter((w) => {
      const matchesSearch =
        search === "" ||
        w.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.domain?.toLowerCase().includes(search.toLowerCase()) ||
        w.plan_tier?.toLowerCase().includes(search.toLowerCase()) ||
        w.tags?.toLowerCase().includes(search.toLowerCase()) ||
        w.location?.toLowerCase().includes(search.toLowerCase());
      
      // Check if website has the selected tag
      const websiteTags = w.tags ? (typeof w.tags === 'string' ? w.tags.split(',').map(t => t.trim()) : w.tags) : [];
      const matchesTag = tagFilter === "all" || websiteTags.includes(tagFilter);
      const matchesLocation = locationFilter === "all" || w.location === locationFilter;
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && w.active) || 
        (statusFilter === "inactive" && !w.active);
      
      return matchesSearch && matchesTag && matchesLocation && matchesStatus;
    });
  }, [websites, search, tagFilter, locationFilter, statusFilter]);

  const filteredSorted = useMemo(
    () => sortByKey(filteredWebsites, sortKey, sortDir),
    [filteredWebsites, sortKey, sortDir]
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
    if (websites.length === 0) {
      return <WebsitesEmptyState onAdd={() => setAddOpen(true)} />;
    }
    if (filteredSorted.length === 0) {
      return (
        <div className="p-10 text-center text-[#64748b] text-sm" data-testid="websites-no-results">
          No websites match your filters
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
        <table className="w-full text-sm" data-testid="websites-table">
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
            {filteredSorted.map((w) => (
              <tr
                key={w.id}
                onClick={() => navigate(`/personal-websites/${w.id}`)}
                data-testid={`website-row-${w.id}`}
                className="border-t border-[#2e3245] hover:bg-[#1a1d27]/60 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-white font-medium">{w.name}</td>
                <td className="px-6 py-4 text-[#94a3b8] font-mono text-xs">{w.domain}</td>
                <td className="px-6 py-4">
                  {w.tags ? (
                    <div className="flex flex-wrap gap-1">
                      {(typeof w.tags === 'string' ? w.tags.split(',').map(t => t.trim()) : w.tags).slice(0, 3).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#007bff]/10 text-[#007bff] text-xs">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {(typeof w.tags === 'string' ? w.tags.split(',').map(t => t.trim()) : w.tags).length > 3 && (
                        <span className="text-[#64748b] text-xs">+{(typeof w.tags === 'string' ? w.tags.split(',').map(t => t.trim()) : w.tags).length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#64748b] text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {w.location ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs">
                      <MapPin className="h-3 w-3" />
                      {w.location}
                    </span>
                  ) : (
                    <span className="text-[#64748b] text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#94a3b8]">
                    {w.plan_tier}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge active={w.active} testId={`status-${w.id}`} />
                </td>
                <td className="px-6 py-4 text-[#94a3b8] text-xs">{formatDate(w.created_at)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn
                      title="Edit"
                      testId={`edit-btn-${w.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/personal-websites/${w.id}`);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title={w.active ? "Deactivate" : "Activate"}
                      testId={`toggle-btn-${w.id}`}
                      onClick={(e) => toggleActive(w, e)}
                      colorClass={
                        w.active
                          ? "hover:text-[#ef4444] hover:border-[#ef4444]/40"
                          : "hover:text-[#10b981] hover:border-[#10b981]/40"
                      }
                    >
                      <Power className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title="Delete"
                      testId={`delete-btn-${w.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setToDelete(w);
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
    <div data-testid="websites-page">
      <PageHeader
        eyebrow="Accounts"
        title="Personal Websites"
        subtitle="Manage your personal websites with the SwiftImpact ADA widget."
        actions={
          <div className="flex gap-2">
            <Button
              data-testid="add-new-website-btn"
              onClick={() => setAddOpen(true)}
              className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-[0_0_15px_rgba(0,123,255,0.25)] hover:shadow-[0_0_22px_rgba(0,123,255,0.45)] transition-shadow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add new website
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
                data-testid="websites-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search websites, domains, plans..."
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
          
          <div className="text-xs text-[#64748b]" data-testid="websites-count">
            {filteredSorted.length} {filteredSorted.length === 1 ? "website" : "websites"}
            {hasFilters && ` (filtered from ${websites.length})`}
          </div>
        </div>

        {renderTable()}
      </div>

      <ClientFormModal 
        open={addOpen} 
        onOpenChange={setAddOpen} 
        onCreated={() => { console.log("Website created, refreshing..."); load(); }}
        isPersonal={true}
      />

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

function WebsitesEmptyState({ onAdd }) {
  return (
    <div className="p-14 text-center" data-testid="websites-empty-state">
      <div className="h-14 w-14 mx-auto rounded-xl bg-[#0f1117] border border-[#2e3245] grid place-items-center mb-4">
        <Inbox className="h-6 w-6 text-[#64748b]" />
      </div>
      <h3
        className="text-white font-semibold tracking-tight text-lg"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        No websites yet
      </h3>
      <p className="text-sm text-[#94a3b8] mt-1.5 mb-5">
        Add your first personal website.
      </p>
      <Button
        onClick={onAdd}
        data-testid="empty-add-first-btn"
        className="bg-[#007bff] hover:bg-[#0056b3] text-white shadow-[0_0_15px_rgba(0,123,255,0.25)]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add your first website
      </Button>
    </div>
  );
}
